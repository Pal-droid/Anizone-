import { load } from "cheerio"

export const ANIMEWORLD_BASE = "https://www.animeworld.ac"

export type TopItem = {
  rank: number
  title: string
  href: string
  image: string
  views?: string
  rating?: string
}

export type TopResponse = {
  day: TopItem[]
  week: TopItem[]
  month: TopItem[]
}

export type SearchItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
  sources?: Array<{ name: string; url: string; id: string }>
  has_multi_servers?: boolean
  description?: string
}

export type EpisodeItem = {
  num: number
  href: string
  id?: string
  title?: string
}

export type RawEpisode = { episode_num?: string; href?: string; data_id?: string }

// UPDATED: support array values and repeated params
export function buildFilterUrl(params: Record<string, string | number | Array<string | number> | undefined>) {
  console.log("[v0] buildFilterUrl called with params:", JSON.stringify(params))
  const url = new URL(`${ANIMEWORLD_BASE}/filter`)
  const allowed = [
    "genre",
    "season",
    "year",
    "type",
    "status",
    "studio",
    "dub",
    "language",
    "sort",
    "keyword",
    "page",
  ] as const

  for (const key of allowed) {
    const v = params[key]
    console.log(`[v0] Processing key: ${key}, value:`, v, `type: ${typeof v}`)
    if (v === undefined || v === null) {
      console.log(`[v0] Skipping ${key} - undefined/null`)
      continue
    }

    const appendAll = (val: string | number) => {
      const s = String(val)
      if (s.length > 0) {
        console.log(`[v0] Appending ${key}=${s} to URL`)
        url.searchParams.append(key, s)
      } else {
        console.log(`[v0] Skipping ${key} - empty string`)
      }
    }

    if (Array.isArray(v)) {
      console.log(`[v0] ${key} is array with ${v.length} items:`, v)
      for (const item of v) {
        console.log(`[v0] Processing array item:`, item)
        appendAll(item)
      }
    } else if (typeof v === "string" && v.includes(",")) {
      console.log(`[v0] ${key} is comma-separated string:`, v)
      // allow comma-separated input
      for (const part of v
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)) {
        console.log(`[v0] Processing comma-separated part:`, part)
        appendAll(part)
      }
    } else {
      console.log(`[v0] ${key} is single value:`, v)
      appendAll(v)
    }
  }

  const finalUrl = url.toString()
  console.log("[v0] Final constructed URL:", finalUrl)
  console.log("[v0] URL search params:", url.searchParams.toString())
  return finalUrl
}

export function absolutize(href: string) {
  try {
    if (!href) return ""
    if (href.startsWith("http")) return href
    if (!href.startsWith("/")) href = `/${href}`
    return `${ANIMEWORLD_BASE}${href}`
  } catch {
    return href
  }
}

export function parseTop(html: string): TopResponse {
  const $ = load(html)
  const baseSel = "div.widget.ranking"
  const out: TopResponse = { day: [], week: [], month: [] }

  const mapContent = (name: "day" | "week" | "month") => {
    const container = $(`${baseSel} .content[data-name="${name}"]`)
    const items: TopItem[] = []

    container.find(".item-top").each((_, el) => {
      const e = $(el)
      const rank = Number.parseInt(e.find(".rank").text().trim() || "1", 10) || 1
      const a = e.find("a.thumb").first()
      const href = a.attr("href") || ""
      const img = a.find("img").attr("src") || ""
      const title = e.find(".info .name").first().text().trim() || a.attr("title") || ""
      const views = e.find('.info [data-tippy-content*="Visualizzazioni"]').text().trim()
      const rating = e.find('.info [data-tippy-content*="Voto"]').text().trim()
      items.push({ rank, title, href: absolutize(href), image: img, views, rating })
    })

    container.find(".item").each((_, el) => {
      const e = $(el)
      const rank = Number.parseInt(e.find(".rank").text().trim() || "0", 10) || 0
      const a = e.find("a.thumb").first()
      const href = a.attr("href") || ""
      const img = a.find("img").attr("src") || ""
      const title = e.find(".info .name").first().text().trim() || a.attr("title") || ""
      const views = e.find('.info [data-tippy-content*="Visualizzazioni"]').text().trim()
      const rating = e.find('.info [data-tippy-content*="Voto"]').text().trim()
      items.push({ rank, title, href: absolutize(href), image: img, views, rating })
    })

    items.sort((a, b) => (a.rank || 9999) - (b.rank || 9999))
    return items
  }

  out.day = mapContent("day")
  out.week = mapContent("week")
  out.month = mapContent("month")
  return out
}

export type SearchResult = {
  items: SearchItem[]
  pagination?: {
    currentPage: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
    nextUrl?: string
    previousUrl?: string
  }
}

export function parseSearch(html: string): SearchResult {
  const $ = load(html)
  const items: SearchItem[] = []

  $(".film-list .item").each((_, item) => {
    const root = $(item).find(".inner").first()
    if (root.length === 0) return

    const posterA = root.find("a.poster").first()
    const nameA = root.find("a.name").first()

    const href = nameA.attr("href") || posterA.attr("href") || ""
    const image = posterA.find("img").attr("src") || ""
    const title = nameA.text().trim() || String(nameA.attr("data-jtitle") || posterA.attr("data-jtitle") || "").trim()
    if (!href || !title) return

    const isDub = root.find(".status .dub").length > 0

    items.push({ title, href: absolutize(href), image, isDub })
  })

  // Parse pagination information
  let pagination: SearchResult["pagination"] = undefined
  const pagingWrapper = $(".paging-wrapper")

  if (pagingWrapper.length > 0) {
    const currentPageInput = pagingWrapper.find("#page-input")
    const totalPagesSpan = pagingWrapper.find(".total")
    const nextLink = pagingWrapper.find("#go-next-page")
    const prevLink = pagingWrapper.find("#go-previous-page")

    const currentPage = Number.parseInt(currentPageInput.attr("placeholder") || "1", 10)
    const totalPages = Number.parseInt(totalPagesSpan.text().trim() || "1", 10)

    const nextUrl = nextLink.attr("href")
    const previousUrl = prevLink.attr("href")

    pagination = {
      currentPage,
      totalPages,
      hasNext: !!nextUrl && !nextLink.hasClass("disabled"),
      hasPrevious: !!previousUrl && !prevLink.hasClass("disabled"),
      nextUrl: nextUrl ? absolutize(nextUrl) : undefined,
      previousUrl: previousUrl ? absolutize(previousUrl) : undefined,
    }
  }

  return { items, pagination }
}

export function parseEpisodes(html: string): RawEpisode[] {
  const $ = load(html)
  const episodes: RawEpisode[] = []
  $("ul.episodes li a").each((_, el) => {
    episodes.push({
      episode_num: $(el).attr("data-episode-num") || $(el).attr("data-num") || $(el).text(),
      href: $(el).attr("href") || undefined,
      data_id: $(el).attr("data-id") || $(el).attr("data-episode-id") || undefined,
    })
  })
  return episodes
}

/**
 * Try multiple strategies to extract playable source URLs
 */
export function parseStreamCandidates(html: string): string[] {
  const $ = load(html)
  const out: string[] = []
  const alt = $("#alternativeDownloadLink").attr("href")
  if (alt) out.push(alt)
  $("video source").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src")
    if (src) out.push(src)
  })
  $("script:not([src])").each((_, el) => {
    const t = $(el).html() || ""
    const sourcesMatch = t.match(/sources\s*:\s*(\[[\s\S]*?\])/)
    if (sourcesMatch) {
      try {
        const safe = sourcesMatch[1].replace(/(\w+)\s*:/g, '"$1":').replace(/'([^']*)'/g, '"$1"')
        const arr = JSON.parse(safe) as Array<{ src?: string; file?: string; url?: string }>
        for (const it of arr) {
          const s = it?.src || (it as any)?.file || (it as any)?.url
          if (s) out.push(s)
        }
      } catch {}
    }
    const fileMatch = t.match(/file\s*:\s*['"]([^'"]+)['"]/)
    if (fileMatch) out.push(fileMatch[1])
    const srcMatch = t.match(/src\s*:\s*['"]([^'"]+)['"]/)
    if (srcMatch) out.push(srcMatch[1])
  })
  const norm = out
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => absolutize(u))
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const u of norm) {
    if (!seen.has(u)) {
      seen.add(u)
      dedup.push(u)
    }
  }
  return dedup
}

export function parseAlternativeDownload(html: string) {
  const candidates = parseStreamCandidates(html)
  return candidates[0] || null
}

export type WatchMeta = {
  title: string
  jtitle?: string
  image?: string
  rating?: string
  votesCount?: string
  audio?: string
  releaseDate?: string
  season?: string
  seasonHref?: string
  studio?: string
  duration?: string
  episodesCount?: string
  status?: string
  views?: string
  genres: { name: string; href?: string }[]
  description?: string
}

export function parseWatchMeta(html: string): WatchMeta | null {
  const $ = load(html)
  const root = $(".widget.info .widget-body").first()
  if (root.length === 0) return null

  const img =
    root.find("#thumbnail-watch img").attr("src") || root.find("#mobile-thumbnail-watch img").attr("src") || ""

  const titleEl = root.find(".head .title").first()
  const title = titleEl.text().trim()
  const jtitle = titleEl.attr("data-jtitle") || undefined

  const genres: { name: string; href?: string }[] = []
  root
    .find("dl.meta dd")
    .filter((_, el) => $(el).prev("dt").text().trim().startsWith("Genere"))
    .find("a")
    .each((_, a) => {
      const name = $(a).text().trim()
      const href = $(a).attr("href")
      if (name) genres.push({ name, href })
    })

  const pick = (label: string) =>
    root
      .find("dl.meta dt")
      .filter((_, dt) => $(dt).text().trim().startsWith(label))
      .first()
      .next("dd")
      .text()
      .trim()

  const audio = pick("Audio")
  const releaseDate = pick("Data di Uscita")
  const duration = pick("Durata")
  const episodesCount = pick("Episodi")
  const status = pick("Stato")
  const views = pick("Visualizzazioni")

  let season = ""
  let seasonHref: string | undefined
  root
    .find("dl.meta dt")
    .filter((_, dt) => $(dt).text().trim().startsWith("Stagione"))
    .first()
    .next("dd")
    .find("a")
    .each((_, a) => {
      season = $(a).text().trim()
      seasonHref = $(a).attr("href") || undefined
    })

  let studio = ""
  root
    .find("dl.meta dt")
    .filter((_, dt) => $(dt).text().trim().startsWith("Studio"))
    .first()
    .next("dd")
    .find("a")
    .each((_, a) => {
      studio = $(a).text().trim()
    })

  const rating = root.find("#average-vote").text().trim() || root.find(".rating[data-value]").attr("data-value")
  const votesCount = root.find(".votes-count").text().trim()

  const description = root.find(".desc").text().trim()

  return {
    title,
    jtitle,
    image: img,
    rating,
    votesCount,
    audio,
    releaseDate,
    season,
    seasonHref,
    studio,
    duration,
    episodesCount,
    status,
    views,
    genres,
    description,
  }
}

export type SimpleEntry = { title: string; href: string; image?: string }

export function parseSimilar(html: string): SimpleEntry[] {
  const $ = load(html)
  const out: SimpleEntry[] = []
  $('.widget .widget-title .title:contains("Serie simili")')
    .closest(".widget")
    .find(".widget-body .film-list .item")
    .each((_, el) => {
      const e = $(el)
      const inner = e.find(".inner").first()
      const a = inner.find("a.poster").first()
      const href = a.attr("href") || ""
      const img = a.find("img").attr("src") || ""
      const nameA = inner.find("a.name").first()
      const title = nameA.text().trim() || a.attr("title") || ""
      if (href && title) out.push({ title, href: absolutize(href), image: img })
    })
  return out
}

export function parseRelated(html: string): SimpleEntry[] {
  const $ = load(html)
  const out: SimpleEntry[] = []
  $('#sidebar .widget.simple-film-list .widget-title .title:contains("Correlati")')
    .closest(".widget.simple-film-list")
    .find(".widget-body.related .item")
    .each((_, el) => {
      const e = $(el)
      const a = e.find(".info a.name").first()
      const title = a.text().trim()
      const href = a.attr("href") || ""
      const img = e.find("img.thumb").attr("src") || ""
      if (href && title) out.push({ title, href: absolutize(href), image: img })
    })
  return out
}

export function parseLatestEpisodes(html: string): { [key: string]: SearchItem[] } {
  const $ = load(html)
  const results: { [key: string]: SearchItem[] } = {
    all: [],
    sub: [],
    dub: [],
    trending: [],
  }

  // Helper function to extract anime ID and create sources
  const extractAnimeId = (href: string): string => {
    const match = href.match(/\/play\/([^/]+)/)
    return match ? match[1] : ""
  }

  const createSources = (href: string) => [
    {
      name: "AnimeWorld",
      url: href,
      id: extractAnimeId(href),
    },
  ]

  // Parse each tab content
  $(".widget.hotnew .content").each((_, contentEl) => {
    const $content = $(contentEl)
    const tabName = $content.attr("data-name") || "all"
    const items: SearchItem[] = []

    $content.find(".film-list .item").each((_, itemEl) => {
      const $item = $(itemEl)
      const $inner = $item.find(".inner")

      if ($inner.length === 0) return

      const $poster = $inner.find("a.poster")
      const $name = $inner.find("a.name")

      const href = $poster.attr("href") || $name.attr("href") || ""
      const image = $poster.find("img").attr("src") || ""
      const title = $name.text().trim() || $poster.attr("title") || ""

      if (!href || !title) return

      const isDub = $inner.find(".status .dub").length > 0
      const fullHref = absolutize(href)

      items.push({
        title,
        href: fullHref,
        image,
        isDub,
        sources: createSources(fullHref),
        has_multi_servers: false,
      })
    })

    if (tabName in results) {
      results[tabName] = items
    }
  })

  return results
}

export type ScheduleItem = {
  id: string
  time: string
  title: string
  episode: string
  href: string
  image?: string
}

export type DaySchedule = {
  date: string
  dayName: string
  items: ScheduleItem[]
}

export function parseSchedule(html: string): DaySchedule[] {
  const $ = load(html)
  const schedule: DaySchedule[] = []

  // Extract the date range from the page
  const dateRangeText = $(".widget-schedule-page .widget-body p").first().text().trim()

  // Parse each day section
  $(".costr").each((_, dayHeader) => {
    const $dayHeader = $(dayHeader)
    const dayName = $dayHeader.find(".day-header").text().trim()

    if (!dayName || dayName === "USCITE INDETERMINATE") return

    const items: ScheduleItem[] = []

    // Find the next calendario-aw section after this day header
    const $scheduleSection = $dayHeader.next(".calendario-aw")

    $scheduleSection.find(".widget.boxcalendario").each((_, el) => {
      const $item = $(el)

      const $link = $item.find("a").first()
      const href = $link.attr("href") || ""
      const title = $link.attr("title") || ""

      const episode = $item.find(".episodio-calendario").text().trim()
      const time = $item.find(".hour").text().replace("Trasmesso alle ", "").trim()

      // Extract image from background style
      const $imgDiv = $item.find(".img-anime")
      const bgStyle = $imgDiv.attr("style") || ""
      const imageMatch = bgStyle.match(/url$$[^)]+$$/)
      const image = imageMatch ? imageMatch[0].replace(/url$$['"]?([^'"]+)['"]?$$/, "$1") : ""

      if (title && href && episode && time) {
        items.push({
          id: `${dayName}-${time}-${title}`,
          time,
          title,
          episode,
          href: `/watch?path=${href.replace("/play/", "").replace(/\.[^.]+$/, "")}`,
          image,
        })
      }
    })

    // Sort items by time
    items.sort((a, b) => {
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map((n) => Number.parseInt(n))
        return hours * 60 + minutes
      }
      return parseTime(a.time) - parseTime(b.time)
    })

    if (items.length > 0) {
      schedule.push({
        date: "", // We'll set this in the API
        dayName,
        items,
      })
    }
  })

  return schedule
}

export async function fetchScheduleForDate(date?: string): Promise<DaySchedule[]> {
  try {
    const scheduleUrl = `${ANIMEWORLD_BASE}/schedule`
    const res = await fetch(scheduleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
    })

    const html = await res.text()
    return parseSchedule(html)
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return []
  }
}
