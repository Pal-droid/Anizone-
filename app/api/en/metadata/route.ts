import { type NextRequest, NextResponse } from "next/server"

/**
 * Scrape the AniList ID from a HiAnime series page by parsing the
 * <script id="syncData"> JSON block, then fetch full metadata from AniList.
 *
 * Query params:
 *   url – the full HiAnime series URL, e.g.
 *         https://hianime.to/tonikawa-over-the-moon-for-you-949
 */

// ---------------------------------------------------------------------------
// 1. Scrape syncData from HiAnime
// ---------------------------------------------------------------------------

interface SyncData {
  page?: string
  name?: string
  anime_id?: string
  mal_id?: string
  anilist_id?: string
  series_url?: string
}

async function scrapeSyncData(url: string): Promise<SyncData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.warn("[en/metadata] HiAnime fetch failed:", res.status)
      return null
    }

    const html = await res.text()

    // Extract the JSON inside <script id="syncData" type="application/json">...</script>
    const regex = /<script\s+id=["']syncData["'][^>]*>([\s\S]*?)<\/script>/i
    const match = html.match(regex)
    if (!match?.[1]) {
      console.warn("[en/metadata] syncData script tag not found")
      return null
    }

    const data: SyncData = JSON.parse(match[1].trim())
    return data
  } catch (err: any) {
    console.error("[en/metadata] Error scraping syncData:", err?.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// 2. Resolve AniList ID via MAL fallback (animeapi.my.id)
// ---------------------------------------------------------------------------

async function resolveAniListIdFromMal(malId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://animeapi.my.id/myanimelist/${malId}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.anilist) return Number(data.anilist)
    return null
  } catch (err: any) {
    console.error("[en/metadata] MAL->AniList resolve failed:", err?.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// 3. Fetch metadata from AniList GraphQL
// ---------------------------------------------------------------------------

interface AniListMedia {
  id: number
  title: { romaji?: string; english?: string; native?: string }
  description?: string
  coverImage?: { large?: string; medium?: string }
  bannerImage?: string
  genres?: string[]
  episodes?: number
  duration?: number
  status?: string
  season?: string
  seasonYear?: number
  studios?: { nodes?: { name: string }[] }
  averageScore?: number
  nextAiringEpisode?: { airingAt?: number; episode?: number }
  relations?: {
    edges?: Array<{
      relationType: string
      node: {
        id: number
        title: { romaji?: string; english?: string }
        coverImage?: { large?: string; medium?: string }
        type?: string
        format?: string
      }
    }>
  }
  recommendations?: {
    nodes?: Array<{
      mediaRecommendation?: {
        id: number
        title: { romaji?: string; english?: string }
        coverImage?: { large?: string; medium?: string }
        type?: string
        format?: string
      }
    }>
  }
}

async function fetchAniListMedia(anilistId: number): Promise<AniListMedia | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        description(asHtml: false)
        coverImage { large medium }
        bannerImage
        genres
        episodes
        duration
        status
        season
        seasonYear
        studios(isMain: true) { nodes { name } }
        averageScore
        nextAiringEpisode { airingAt episode }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              coverImage { large medium }
              type
              format
            }
          }
        }
        recommendations(perPage: 10, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large medium }
              type
              format
            }
          }
        }
      }
    }
  `

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: anilistId } }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn("[en/metadata] AniList GraphQL error:", res.status)
      return null
    }

    const json = await res.json()
    return json?.data?.Media ?? null
  } catch (err: any) {
    console.error("[en/metadata] AniList fetch error:", err?.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html?: string): string {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}

function mapStatus(status?: string): string {
  switch (status) {
    case "FINISHED":
      return "Completato"
    case "RELEASING":
      return "In corso"
    case "NOT_YET_RELEASED":
      return "Non ancora uscito"
    case "CANCELLED":
      return "Cancellato"
    case "HIATUS":
      return "In pausa"
    default:
      return status || ""
  }
}

function mapSeason(season?: string, year?: number): string {
  const seasonMap: Record<string, string> = {
    WINTER: "Inverno",
    SPRING: "Primavera",
    SUMMER: "Estate",
    FALL: "Autunno",
  }
  const s = season ? seasonMap[season] || season : ""
  return year ? `${s} ${year}`.trim() : s
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Missing 'url' query parameter" },
        { status: 400 },
      )
    }

    // 1. Scrape syncData
    const syncData = await scrapeSyncData(url)

    if (!syncData) {
      return NextResponse.json(
        { ok: false, error: "Could not scrape syncData from HiAnime page" },
        { status: 502 },
      )
    }

    // 2. Resolve AniList ID
    let anilistId: number | null = null

    if (syncData.anilist_id) {
      anilistId = Number(syncData.anilist_id)
      if (isNaN(anilistId)) anilistId = null
    }

    // Fallback: MAL ID -> AniList ID
    if (!anilistId && syncData.mal_id) {
      console.log("[en/metadata] anilist_id missing, falling back to MAL ID:", syncData.mal_id)
      anilistId = await resolveAniListIdFromMal(syncData.mal_id)
    }

    if (!anilistId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not resolve AniList ID from syncData",
          syncData,
        },
        { status: 404 },
      )
    }

    // 3. Fetch full metadata from AniList
    const media = await fetchAniListMedia(anilistId)

    if (!media) {
      return NextResponse.json(
        { ok: false, error: "AniList returned no data for this ID", anilistId },
        { status: 502 },
      )
    }

    // 4. Build related anime list from AniList relations
    const related = (media.relations?.edges || [])
      .filter((edge) => edge.node?.type === "ANIME")
      .map((edge) => ({
        title: edge.node.title?.english || edge.node.title?.romaji || "",
        image: edge.node.coverImage?.large || edge.node.coverImage?.medium || "",
        anilistId: edge.node.id,
        relationType: edge.relationType,
      }))

    // 5. Build similar anime list from AniList recommendations
    const similar = (media.recommendations?.nodes || [])
      .filter((n) => n.mediaRecommendation?.type === "ANIME")
      .map((n) => ({
        title:
          n.mediaRecommendation!.title?.english ||
          n.mediaRecommendation!.title?.romaji ||
          "",
        image:
          n.mediaRecommendation!.coverImage?.large ||
          n.mediaRecommendation!.coverImage?.medium ||
          "",
        anilistId: n.mediaRecommendation!.id,
      }))

    // 6. Shape the response to match existing Meta type
    const meta = {
      title:
        media.title?.english || media.title?.romaji || syncData.name || "",
      jtitle: media.title?.native || "",
      image: media.coverImage?.large || media.coverImage?.medium || "",
      description: stripHtml(media.description),
      genres: (media.genres || []).map((g) => ({ name: g })),
      episodesCount: media.episodes ? String(media.episodes) : "",
      status: mapStatus(media.status),
      studio: media.studios?.nodes?.[0]?.name || "",
      duration: media.duration ? `${media.duration} min` : "",
      rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : "",
      season: mapSeason(media.season, media.seasonYear),
      releaseDate: media.seasonYear ? String(media.seasonYear) : "",
      anilistId: media.id,
      related,
      similar,
    }

    return NextResponse.json({
      ok: true,
      meta,
      provider: "hianime-anilist",
    })
  } catch (e: any) {
    console.error("[en/metadata] Unhandled error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 },
    )
  }
}
