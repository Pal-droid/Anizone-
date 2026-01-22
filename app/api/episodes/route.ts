import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseEpisodes } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"
import { withCors } from "@/lib/cors"

function absolutize(href?: string) {
  if (!href) return ""
  if (href.startsWith("http")) return href
  if (!href.startsWith("/")) href = `/${href}`
  return `${ANIMEWORLD_BASE}${href}`
}

// When AnimePahe has episodes starting at a different number (e.g., 25 for season 2),
// normalize them to match the episode numbering of other sources (1, 2, 3...)
function normalizeAnimePaheEpisodes(episodes: any[]): any[] {
  if (!episodes || episodes.length === 0) return episodes

  // Separate AnimePahe-only episodes from episodes that have other sources
  const animePaheOnlyEpisodes: any[] = []
  const otherEpisodes: any[] = []

  for (const ep of episodes) {
    const sources = ep.sources || {}
    const hasAnimeWorld = sources.AnimeWorld?.available
    const hasAnimeSaturn = sources.AnimeSaturn?.available
    const hasUnity = sources.Unity?.available
    const hasAnimePahe = sources.AnimePahe?.available

    // If episode ONLY has AnimePahe as a source
    if (hasAnimePahe && !hasAnimeWorld && !hasAnimeSaturn && !hasUnity) {
      animePaheOnlyEpisodes.push(ep)
    } else {
      otherEpisodes.push(ep)
    }
  }

  // If no AnimePahe-only episodes or no other episodes to compare, return as-is
  if (animePaheOnlyEpisodes.length === 0 || otherEpisodes.length === 0) {
    return episodes
  }

  // Get the episode numbers from other sources to understand the expected range
  const otherEpNums = otherEpisodes.map((ep) => ep.num || ep.episode_number || 0).filter((n) => n > 0)
  const maxOtherEpNum = Math.max(...otherEpNums, 0)

  // Get the AnimePahe episode numbers
  const apEpNums = animePaheOnlyEpisodes.map((ep) => ep.num || ep.episode_number || 0).filter((n) => n > 0)
  const minApEpNum = Math.min(...apEpNums)

  console.log("[v0] AnimePahe normalization - other sources max ep:", maxOtherEpNum, "AnimePahe min ep:", minApEpNum)

  // If AnimePahe episodes start after the max of other sources, they need normalization
  // e.g., if other sources have eps 1-14, and AnimePahe has 25-38, normalize 25->15, 26->16, etc.
  if (minApEpNum > maxOtherEpNum + 1) {
    // Calculate offset: AnimePahe ep 25 should become ep 15 (continuing from maxOtherEpNum)
    // But actually, for season 2, AnimePahe ep 25 = season 2 ep 1, so we normalize to match
    // If we have other sources with ep 1-14, AnimePahe 25 should map to ep 1
    const offset = minApEpNum - 1 // offset = 24, so ep 25 - 24 = 1

    console.log("[v0] Normalizing AnimePahe episodes with offset:", offset)

    const normalizedApEpisodes = animePaheOnlyEpisodes.map((ep) => {
      const originalNum = ep.num || ep.episode_number || 0
      const normalizedNum = originalNum - offset

      return {
        ...ep,
        num: normalizedNum,
        episode_number: normalizedNum,
        original_episode_number: originalNum,
      }
    })

    // Now merge: for each normalized AnimePahe episode, add it to existing episode or create new
    const episodeMap = new Map<number, any>()

    // Add other episodes first
    for (const ep of otherEpisodes) {
      const num = ep.num || ep.episode_number || 0
      if (num > 0) {
        episodeMap.set(num, ep)
      }
    }

    // Merge normalized AnimePahe episodes
    for (const ep of normalizedApEpisodes) {
      const num = ep.num || ep.episode_number || 0
      if (num > 0) {
        const existing = episodeMap.get(num)
        if (existing) {
          // Merge AnimePahe source into existing episode
          existing.sources = existing.sources || {}
          existing.sources.AnimePahe = ep.sources?.AnimePahe || { available: false }
          existing.original_episode_number = ep.original_episode_number
        } else {
          // No existing episode, add the AnimePahe episode
          episodeMap.set(num, ep)
        }
      }
    }

    return Array.from(episodeMap.values()).sort((a, b) => {
      const numA = a.num || a.episode_number || 0
      const numB = b.num || b.episode_number || 0
      return numA - numB
    })
  }

  // No normalization needed
  return episodes
}

export const GET = withCors(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW")
    const asId = searchParams.get("AS")
    const apId = searchParams.get("AP")
    const auId = searchParams.get("AU")
    const agId = searchParams.get("AG")

    if (awId || asId || apId || auId || agId) {
      try {
        const params = new URLSearchParams()
        if (awId) params.set("AW", awId)
        if (asId) params.set("AS", asId.toLowerCase())
        if (apId) params.set("AP", apId)
        if (auId) params.set("AU", auId)
        if (agId) params.set("AG", agId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/episodes?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(20000),
        })

        if (unifiedRes.ok) {
          const unifiedData = await unifiedRes.json()

          if (Array.isArray(unifiedData) && unifiedData.length > 0) {
            let episodes = unifiedData
              .map((ep: any) => {
                const awSource = ep.sources?.AnimeWorld
                const asSource = ep.sources?.AnimeSaturn
                const apSource = ep.sources?.AnimePahe
                const auSource = ep.sources?.Unity
                const agSource = ep.sources?.AnimeGG

                return {
                  num: ep.num || ep.episode_number,
                  href: awSource?.url || asSource?.url || apSource?.url || auSource?.url || agSource?.url || "",
                  id: awSource?.id || asSource?.id || apSource?.id || auSource?.id || agSource?.id || "",
                  sources: {
                    AnimeWorld: awSource
                      ? {
                          available: !!awSource.url || !!awSource.available,
                          url: awSource.url,
                          id: awSource.id,
                        }
                      : { available: false },
                    AnimeSaturn: asSource
                      ? {
                          available: !!asSource.url || !!asSource.available,
                          url: asSource.url,
                          id: asSource.id,
                        }
                      : { available: false },
                    AnimePahe: apSource
                      ? {
                          available: !!apSource.available,
                          url: apSource.url || "",
                          id: apSource.id,
                          animeSession: apSource.animeSession,
                        }
                      : { available: false },
                    Unity: auSource
                      ? {
                          available: !!auSource.available || !!auSource.url,
                          url: auSource.url || "",
                          id: auSource.id,
                        }
                      : { available: false },
                    AnimeGG: agSource
                      ? {
                          available: !!agSource.available || !!agSource.url,
                          url: agSource.url || "",
                          id: agSource.id,
                        }
                      : { available: false },
                  },
                }
              })
              .filter((ep: any) => ep.href || ep.id)

            episodes = normalizeAnimePaheEpisodes(episodes)

            return NextResponse.json({
              ok: true,
              episodes,
              source: "https://aw-au-as-api.vercel.app/api/episodes",
              unified: true,
            })
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`Unified episodes API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("Unified episodes API failed:", unifiedError)
      }
    }

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro mancante. Usa AW=<id>, AS=<id>, AP=<id>, AU=<id> oppure path=<path>" },
        { status: 400 },
      )
    }

    let cleanPath = path
    if (path.startsWith("/play/")) {
      cleanPath = path.replace(/\/+/g, "/")
    }

    const url = cleanPath.startsWith("http") ? cleanPath : `${ANIMEWORLD_BASE}${cleanPath}`
    console.log("[v0] Fetching episodes from URL:", url)

    const { html, finalUrl } = await fetchHtml(url)
    const raw = parseEpisodes(html) as Array<{ episode_num?: string; href?: string; data_id?: string }>
    const mapped = raw
      .map((e) => {
        const num = Number.parseInt(String(e.episode_num || "0"), 10) || 0
        const href = absolutize(e.href)
        const id = e.data_id
        if (!href || num <= 0) return null
        return { num, href, id }
      })
      .filter(Boolean) as Array<{ num: number; href: string; id?: string }>

    const byNum = new Map<number, { num: number; href: string; id?: string }>()
    for (const ep of mapped) {
      if (!byNum.has(ep.num)) byNum.set(ep.num, ep)
    }
    const episodes = Array.from(byNum.values()).sort((a, b) => a.num - b.num)

    if (episodes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nessun episodio trovato nella pagina sorgente.", source: finalUrl },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, episodes, source: finalUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante il recupero episodi" }, { status: 500 })
  }
})
