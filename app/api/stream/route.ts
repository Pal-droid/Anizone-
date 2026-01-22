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

const ANIMESATURN_PROXY = "https://animesaturn-proxy.onrender.com/embed"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    const awId = searchParams.get("AW")
    const asId = searchParams.get("AS")
    const agId = searchParams.get("AG")
    const agAudio = searchParams.get("AG_AUDIO") || "sub" // "sub" or "dub"
    const agRes = searchParams.get("AG_RES") || "1080p" // Resolution preference

    // Check World first (highest priority)
    if (awId) {
      try {
        const params = new URLSearchParams()
        params.set("AW", awId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(25000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()
          const animeWorldData = streamData.AnimeWorld

          if (animeWorldData?.available && animeWorldData.stream_url) {
            return NextResponse.json({
              ok: true,
              streamUrl: animeWorldData.stream_url,
              embed: animeWorldData.embed,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeWorld",
              unified: true,
              isEmbed: false,
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "AnimeWorld non disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`Unified API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("Unified stream API failed, falling back to AnimeWorld:", unifiedError)
      }
    }

    if (asId) {
      try {
        const params = new URLSearchParams()
        params.set("AS", asId.toLowerCase())

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(25000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()
          const animeSaturnData = streamData.AnimeSaturn

          if (animeSaturnData?.available && animeSaturnData.stream_url) {
            // Build the embed URL using the proxy
            const embedUrl = `${ANIMESATURN_PROXY}?url=${encodeURIComponent(animeSaturnData.stream_url)}`

            return NextResponse.json({
              ok: true,
              streamUrl: animeSaturnData.stream_url,
              embedUrl: embedUrl,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeSaturn",
              unified: true,
              isEmbed: true,
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "AnimeSaturn non disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`AnimeSaturn API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("AnimeSaturn stream API failed:", unifiedError)
        return NextResponse.json({ ok: false, error: "Errore nel recupero stream AnimeSaturn" }, { status: 500 })
      }
    }

    // Handle AnimeGG (AGG) server
    if (agId) {
      try {
        const params = new URLSearchParams()
        params.set("AG", agId)

        const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/stream?${params}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(25000),
        })

        if (unifiedRes.ok) {
          const streamData = await unifiedRes.json()
          const animeGGData = streamData.AnimeGG

          if (animeGGData?.available && animeGGData.servers) {
            // Determine which audio track to use (GG-SUB or GG-DUB)
            const audioKey = agAudio === "dub" ? "GG-DUB" : "GG-SUB"
            const streams = animeGGData.servers[audioKey] || animeGGData.servers["GG-SUB"] || []
            
            // Check if the requested audio type is available
            const hasRequestedAudio = !!animeGGData.servers[audioKey]
            const hasSub = !!animeGGData.servers["GG-SUB"]
            const hasDub = !!animeGGData.servers["GG-DUB"]

            if (streams.length === 0) {
              return NextResponse.json(
                { ok: false, error: `AnimeGG ${audioKey} not available for this episode`, streamData },
                { status: 404 },
              )
            }

            // Process streams to handle duplicate resolutions
            const processedStreams: { url: string; quality: string; type: string; label: string }[] = []
            const qualityCounts: Record<string, number> = {}

            for (const stream of streams) {
              const quality = stream.quality || "360p"
              qualityCounts[quality] = (qualityCounts[quality] || 0) + 1
              const version = qualityCounts[quality] > 1 ? ` v${qualityCounts[quality]}` : ""
              processedStreams.push({
                url: stream.url,
                quality: quality,
                type: stream.type || "mp4",
                label: `${quality}${version}`,
              })
            }

            // Find the best matching resolution
            let selectedStream = processedStreams.find((s) => s.quality === agRes)
            if (!selectedStream) {
              // Try to find the highest available resolution
              const resOrder = ["1080p", "720p", "480p", "360p"]
              for (const res of resOrder) {
                selectedStream = processedStreams.find((s) => s.quality === res)
                if (selectedStream) break
              }
            }
            if (!selectedStream) {
              selectedStream = processedStreams[0]
            }

            // Build proxy URL for the stream (requires animegg.org referrer)
            const proxyUrl = `/api/animegg-proxy?url=${encodeURIComponent(selectedStream.url)}`

            return NextResponse.json({
              ok: true,
              streamUrl: selectedStream.url,
              proxyUrl: proxyUrl,
              source: "https://aw-au-as-api.vercel.app/api/stream",
              server: "AnimeGG",
              unified: true,
              isEmbed: false,
              audioType: hasRequestedAudio ? agAudio : "sub",
              hasSub,
              hasDub,
              selectedQuality: selectedStream.label,
              availableQualities: processedStreams.map((s) => s.label),
              allStreams: processedStreams,
            })
          } else {
            return NextResponse.json(
              { ok: false, error: "AnimeGG non disponibile per questo episodio", streamData },
              { status: 404 },
            )
          }
        } else {
          const errorText = await unifiedRes.text()
          console.warn(`AnimeGG API failed with status ${unifiedRes.status}:`, errorText)
        }
      } catch (unifiedError) {
        console.warn("AnimeGG stream API failed:", unifiedError)
        return NextResponse.json({ ok: false, error: "Errore nel recupero stream AnimeGG" }, { status: 500 })
      }
    }

    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro mancante. Usa AW=<id>, AS=<id>, AG=<id> oppure path=<path>" },
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
