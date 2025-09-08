import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseEpisodes } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

function absolutize(href?: string) {
  if (!href) return ""
  if (href.startsWith("http")) return href
  if (!href.startsWith("/")) href = `/${href}`
  return `${ANIMEWORLD_BASE}${href}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW") // Added support for unified API parameters
    const asId = searchParams.get("AS") // Added support for unified API parameters

    if (awId && asId) {
      try {
        const unifiedRes = await fetch(
          `https://aw-au-as-api.vercel.app/api/episodes?AW=${encodeURIComponent(awId)}&AS=${encodeURIComponent(asId)}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(15000),
          },
        )

        if (unifiedRes.ok) {
          const unifiedData = await unifiedRes.json()

          // Transform unified response to our format
          const episodes = unifiedData
            .map((ep: any) => ({
              num: ep.episode_number,
              href: ep.sources.AnimeWorld?.url || "",
              id: ep.sources.AnimeWorld?.id || "",
              sources: ep.sources, // Include all sources for multi-server support
            }))
            .filter((ep: any) => ep.href || ep.id)

          return NextResponse.json({
            ok: true,
            episodes,
            source: "https://aw-au-as-api.vercel.app/api/episodes",
            unified: true,
          })
        }
      } catch (unifiedError) {
        console.warn("Unified episodes API failed, falling back to AnimeWorld:", unifiedError)
      }
    }

    if (asId && !awId) {
      try {
        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/episodes?AS=${encodeURIComponent(asId)}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(15000),
        })

        if (unifiedRes.ok) {
          const unifiedData = await unifiedRes.json()

          const episodes = unifiedData
            .map((ep: any) => ({
              num: ep.episode_number,
              href: ep.sources.AnimeSaturn?.url || "",
              id: ep.sources.AnimeSaturn?.id || "",
              sources: ep.sources,
            }))
            .filter((ep: any) => ep.href || ep.id)

          return NextResponse.json({
            ok: true,
            episodes,
            source: "https://aw-au-as-api.vercel.app/api/episodes",
            unified: true,
          })
        }
      } catch (unifiedError) {
        console.warn("Unified AnimeSaturn episodes API failed:", unifiedError)
      }
    }

    // Fallback to original AnimeWorld scraping
    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'path' mancante. Esempio: /play/horimiya.Mse3-/lRRhWd" },
        { status: 400 },
      )
    }
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`

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

    // Dedupe by episode number (keep first occurrence in DOM order)
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
}
