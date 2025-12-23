import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseWatchMeta, parseAnimeSaturnMeta } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"
import { load } from "cheerio"

// Parse next episode countdown (same as before)
function parseNextEpisodeCountdown(html: string): { nextEpisodeDate?: string; nextEpisodeTime?: string } {
  const $ = load(html)
  const countdownElement = $("#next-episode")
  if (countdownElement.length > 0) {
    const date = countdownElement.attr("data-calendar-date")
    const time = countdownElement.attr("data-calendar-time")
    if (date && time) return { nextEpisodeDate: date, nextEpisodeTime: time }
  }
  return {}
}

// Parse related anime from AnimeSaturn page
function parseAnimeSaturnRelated(html: string) {
  const $ = load(html)
  const related: { title: string; url: string; image: string }[] = []

  $(".owl-item.anime-card-newanime.main-anime-card").each((_, el) => {
    const card = $(el).find(".card > a").first()
    const url = card.attr("href")
    const image = card.find("img").attr("src")
    const title = card.attr("title") || $(el).find(".anime-card-newanime-overlay span").text().trim()

    if (url && title && image) related.push({ title, url, image })
  })

  return related
}

// Wrap the existing AnimeSaturn parser to include related anime
function parseAnimeSaturnMetaWithRelated(html: string) {
  const meta = parseAnimeSaturnMeta(html) || {}
  meta.related = parseAnimeSaturnRelated(html)
  return meta
}

function parseAnimeUnityMeta(html: string) {
  const $ = load(html)

  // Parse thumbnail
  const image = $(".cover-wrap img.cover").attr("src") || ""

  // Parse title
  const title = $(".general h1.title").text().trim()

  // Parse description
  const description = $(".general .description").text().trim()

  // Parse genres
  const genres: { name: string; href?: string }[] = []
  $(".info-wrapper .genre-link").each((_, el) => {
    const name = $(el).text().trim().replace(/,\s*$/, "")
    const href = $(el).attr("href")
    if (name) genres.push({ name, href })
  })

  // Parse related anime from the related section
  const related: { title: string; url: string; image: string; unityId?: string }[] = []
  $(".related-item").each((_, el) => {
    const $el = $(el)
    const linkEl = $el.find("a[href*='/anime/']").first()
    const url = linkEl.attr("href") || ""
    const imgEl = $el.find("img").first()
    const image = imgEl.attr("src") || ""
    const titleEl = $el.find(".related-anime-title").first()
    const relTitle = titleEl.text().trim()

    // Extract unity ID from URL like /anime/873-nisekoi-ova
    let unityId: string | undefined
    const idMatch = url.match(/\/anime\/(\d+)-/)
    if (idMatch) {
      unityId = idMatch[1]
    }

    if (relTitle && url) {
      related.push({
        title: relTitle,
        url: url.startsWith("http") ? url : `https://www.animeunity.so${url}`,
        image,
        unityId,
      })
    }
  })

  // Parse similar anime from recommended section (items-json attribute)
  const similar: { title: string; url: string; image: string; unityId?: string }[] = []
  const recommendedEl = $(".recommended.d-sm-none layout-items")
  const itemsJson = recommendedEl.attr("items-json")

  if (itemsJson) {
    try {
      // Decode HTML entities in the JSON string
      const decodedJson = itemsJson
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")

      const items = JSON.parse(decodedJson)

      for (const item of items) {
        if (item.id && item.title_eng) {
          similar.push({
            title: item.title_eng || item.title || "",
            url: `https://www.animeunity.so/anime/${item.id}-${item.slug || ""}`,
            image: item.imageurl || "",
            unityId: String(item.id),
          })
        }
      }
    } catch (e) {
      console.warn("[v0] Failed to parse AnimeUnity similar items JSON:", e)
    }
  }

  // Try to extract additional info from the page
  let status = ""
  let studio = ""
  let releaseDate = ""
  let episodesCount = ""

  $(".info-wrapper").each((_, wrapper) => {
    const text = $(wrapper).text()
    if (text.includes("Stato")) {
      const statusMatch = text.match(/Stato[:\s]+([^\n]+)/)
      if (statusMatch) status = statusMatch[1].trim()
    }
    if (text.includes("Studio")) {
      const studioMatch = text.match(/Studio[:\s]+([^\n]+)/)
      if (studioMatch) studio = studioMatch[1].trim()
    }
    if (text.includes("Data")) {
      const dateMatch = text.match(/Data[:\s]+([^\n]+)/)
      if (dateMatch) releaseDate = dateMatch[1].trim()
    }
    if (text.includes("Episodi")) {
      const epMatch = text.match(/Episodi[:\s]+(\d+)/)
      if (epMatch) episodesCount = epMatch[1].trim()
    }
  })

  return {
    title,
    description,
    image,
    genres,
    related,
    similar,
    status,
    studio,
    releaseDate,
    episodesCount,
  }
}

async function fetchAnimeUnityMeta(unityId: string) {
  const unityUrl = `https://www.animeunity.so/anime/${unityId}-q`
  const proxyUrl = `https://corsproxy.io?url=${encodeURIComponent(unityUrl)}`

  console.log("[v0] Fetching AnimeUnity metadata from:", unityUrl, "via proxy")

  const response = await fetch(proxyUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  })

  console.log("[v0] AnimeUnity response status:", response.status)

  if (!response.ok) {
    throw new Error(`AnimeUnity fetch failed with status ${response.status}`)
  }

  const html = await response.text()
  console.log("[v0] AnimeUnity HTML length:", html.length)

  // Return original URL (not proxied) for display purposes
  return { html, finalUrl: unityUrl }
}

function extractAniListIdFromAnimePahe(data: any): number | undefined {
  // First try to get from ids.anilist
  if (data.ids?.anilist) {
    const id = Number(data.ids.anilist)
    if (!isNaN(id)) return id
  }

  // Fallback: parse from external_links
  if (data.external_links) {
    const anilistLink = data.external_links.find((link: any) => link.name === "AniList")
    if (anilistLink?.url) {
      // Extract ID from URL like "https://anilist.co/anime/16498"
      const match = anilistLink.url.match(/anilist\.co\/anime\/(\d+)/)
      if (match) {
        const id = Number(match[1])
        if (!isNaN(id)) return id
      }
    }
  }

  return undefined
}

async function fetchAnimePaheMetadata(animepaheId: string) {
  try {
    console.log("[v0] Fetching AnimePahe metadata for ID:", animepaheId)

    const response = await fetch(`https://animepahe-two.vercel.app/api/${animepaheId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      console.error("[v0] AnimePahe API error:", response.status)
      return null
    }

    const data = await response.json()
    const anilistId = extractAniListIdFromAnimePahe(data)
    console.log("[v0] AnimePahe metadata fetched:", data.title, "AniList ID:", anilistId)

    // Transform AnimePahe data to our WatchMeta format
    return {
      title: data.title,
      image: data.image,
      description: data.synopsis,
      jtitle: data.japanese,
      rating: undefined,
      votesCount: undefined,
      episodesCount: data.episodes,
      status: data.status,
      audio: undefined,
      releaseDate: data.aired,
      season: data.season,
      seasonHref: undefined,
      studio: data.studio,
      duration: data.duration,
      views: undefined,
      genres: data.genre?.map((g: string) => ({ name: g })) || [],
      anilistId,
      animepaheId: data.ids?.animepahe_id,
      externalIds: data.ids,
    }
  } catch (error) {
    console.error("[v0] Error fetching AnimePahe metadata:", error)
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const unityId = searchParams.get("unityId")
    const animepaheId = searchParams.get("animepaheId")

    if (!path && !unityId && !animepaheId) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'path', 'unityId' o 'animepaheId' mancante" },
        { status: 400 },
      )
    }

    if (animepaheId) {
      console.log("[v0] Prioritizing AnimePahe metadata for ID:", animepaheId)
      const animePaheMeta = await fetchAnimePaheMetadata(animepaheId)
      if (animePaheMeta) {
        console.log("[v0] Using AnimePahe metadata with AniList ID:", animePaheMeta.anilistId)
        return NextResponse.json({
          ok: true,
          meta: animePaheMeta,
          source: `https://animepahe-two.vercel.app/api/${animepaheId}`,
          provider: "animepahe",
        })
      }
    }

    if (!path && unityId) {
      try {
        const { html, finalUrl } = await fetchAnimeUnityMeta(unityId)
        const meta = parseAnimeUnityMeta(html)

        if (!meta || !meta.title) {
          return NextResponse.json(
            { ok: false, error: "Meta non trovati su AnimeUnity", source: finalUrl },
            { status: 404 },
          )
        }

        return NextResponse.json({
          ok: true,
          meta,
          source: finalUrl,
          provider: "animeunity",
        })
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Errore AnimeUnity meta" }, { status: 500 })
      }
    }

    let url: string
    if (path!.startsWith("http")) {
      url = path!
    } else if (path!.includes("animesaturn") || path!.startsWith("/anime/")) {
      url = path!.startsWith("http") ? path! : `https://www.animesaturn.cx${path}`
    } else {
      let animePath = path!.replace(/\/+/g, "/")
      if (animePath.includes("/play/")) {
        const playMatch = animePath.match(/\/play\/([^/?]+)/)
        if (playMatch) {
          const worldId = playMatch[1].endsWith("-") ? playMatch[1].slice(0, -1) : playMatch[1]
          animePath = `/play/${worldId}`
        }
      } else if (!animePath.startsWith("/")) {
        animePath = `/play/${animePath}`
      } else if (!animePath.startsWith("/play/") && !animePath.includes(".")) {
        animePath = `/play/${animePath.replace(/^\/+/, "")}`
      }
      url = `${ANIMEWORLD_BASE}${animePath}`.replace(/([^:]\/)\/+/g, "$1")
    }

    console.log("[v0] anime-meta fetching URL:", url)

    let html: string
    let finalUrl: string

    try {
      const result = await fetchHtml(url)
      html = result.html
      finalUrl = result.finalUrl
    } catch (primaryError: any) {
      console.warn("[v0] Primary metadata fetch failed:", primaryError?.message)

      if (animepaheId) {
        console.log("[v0] Attempting AnimePahe fallback with id:", animepaheId)
        const animePaheMeta = await fetchAnimePaheMetadata(animepaheId)
        if (animePaheMeta) {
          return NextResponse.json({
            ok: true,
            meta: animePaheMeta,
            source: `https://animepahe-two.vercel.app/api/${animepaheId}`,
            provider: "animepahe",
            fallback: true,
          })
        }
      }

      if (unityId) {
        console.log("[v0] Attempting AnimeUnity fallback with id:", unityId)
        try {
          const unityResult = await fetchAnimeUnityMeta(unityId)
          const meta = parseAnimeUnityMeta(unityResult.html)

          if (meta && meta.title) {
            return NextResponse.json({
              ok: true,
              meta,
              source: unityResult.finalUrl,
              provider: "animeunity",
              fallback: true,
            })
          }
        } catch (unityError: any) {
          console.warn("[v0] AnimeUnity fallback also failed:", unityError?.message)
        }
      }

      throw primaryError
    }

    let meta
    if (finalUrl.includes("animesaturn.cx") || url.includes("animesaturn.cx")) {
      meta = parseAnimeSaturnMetaWithRelated(html)
    } else {
      meta = parseWatchMeta(html)
    }

    const countdownData = parseNextEpisodeCountdown(html)
    if (!meta) {
      if (animepaheId) {
        console.log("[v0] Meta parsing failed, attempting AnimePahe fallback with id:", animepaheId)
        const animePaheMeta = await fetchAnimePaheMetadata(animepaheId)
        if (animePaheMeta) {
          return NextResponse.json({
            ok: true,
            meta: animePaheMeta,
            source: `https://animepahe-two.vercel.app/api/${animepaheId}`,
            provider: "animepahe",
            fallback: true,
          })
        }
      }

      if (unityId) {
        console.log("[v0] Meta parsing failed, attempting AnimeUnity fallback with id:", unityId)
        try {
          const unityResult = await fetchAnimeUnityMeta(unityId)
          const unityMeta = parseAnimeUnityMeta(unityResult.html)

          if (unityMeta && unityMeta.title) {
            return NextResponse.json({
              ok: true,
              meta: unityMeta,
              source: unityResult.finalUrl,
              provider: "animeunity",
              fallback: true,
            })
          }
        } catch (unityError: any) {
          console.warn("[v0] AnimeUnity fallback also failed:", unityError?.message)
        }
      }

      return NextResponse.json({ ok: false, error: "Meta non trovati", source: finalUrl }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      meta: { ...meta, ...countdownData },
      source: finalUrl,
      provider: finalUrl.includes("animesaturn") ? "animesaturn" : "animeworld",
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore meta" }, { status: 500 })
  }
}
