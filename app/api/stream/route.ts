import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseStreamCandidates } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

function pickBest(candidates: string[]): string | null {
  if (!candidates.length) return null
  const mp4 = candidates.find((u) => u.toLowerCase().includes(".mp4"))
  if (mp4) return mp4
  try {
    const sweet = candidates.find((u) => {
      const h = new URL(u).hostname
      return h === "sweetpixel.org" || h.endsWith(".sweetpixel.org")
    })
    if (sweet) return sweet
  } catch {}
  const https = candidates.find((u) => u.startsWith("https://"))
  if (https) return https
  return candidates[0]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW") // Added support for unified API parameters
    const asId = searchParams.get("AS") // Added support for unified API parameters

    if (awId || asId) {
      try {
        const params = new URLSearchParams()
        if (awId) params.set("AW", awId)
        if (asId) params.set("AS", asId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(15000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()

          const animeWorldData = streamData.AnimeWorld
          const animeSaturnData = streamData.AnimeSaturn

          // Prefer AnimeWorld if available, fallback to AnimeSaturn
          if (animeWorldData?.available && animeWorldData.stream_url) {
            return NextResponse.json({
              ok: true,
              streamUrl: animeWorldData.stream_url,
              embed: animeWorldData.embed,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeWorld",
              unified: true,
            })
          } else if (animeSaturnData?.available) {
            let streamUrl = animeSaturnData.stream_url
            const embed = animeSaturnData.embed

            // If embed contains base64 encoded HTML with m3u8, extract the m3u8 URL
            if (embed && embed.includes("data:text/html;base64")) {
              try {
                const base64Match = embed.match(/data:text\/html;base64,([^"]+)/)
                if (base64Match) {
                  const decodedHtml = atob(base64Match[1])
                  const m3u8Match = decodedHtml.match(/videoSrc\s*=\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i)
                  if (m3u8Match) {
                    streamUrl = m3u8Match[1]
                  }
                }
              } catch (e) {
                console.warn("Failed to parse AnimeSaturn m3u8 embed:", e)
              }
            }

            return NextResponse.json({
              ok: true,
              streamUrl,
              embed,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeSaturn",
              unified: true,
              isM3u8: streamUrl?.includes(".m3u8") || false, // Flag for HLS streams
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "Nessun server disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        }
      } catch (unifiedError) {
        console.warn("Unified stream API failed, falling back to AnimeWorld:", unifiedError)
      }
    }

    // Fallback to original AnimeWorld scraping
    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'path' mancante. Esempio: /play/naruto-ita.Ze1Qv/NoZjU" },
        { status: 400 },
      )
    }
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`

    const { html, finalUrl } = await fetchHtml(url)
    const candidates = parseStreamCandidates(html)
    const streamUrl = pickBest(candidates)

    if (!streamUrl) {
      return NextResponse.json(
        { ok: false, error: "Sorgenti video non trovate nella pagina.", source: finalUrl, candidates },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, streamUrl, source: finalUrl, candidates })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero del link stream" },
      { status: 500 },
    )
  }
}
