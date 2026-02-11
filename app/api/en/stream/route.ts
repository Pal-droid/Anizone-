import { type NextRequest, NextResponse } from "next/server"

const EMBED_BASE = "https://anizonee.zeabur.app/e"

type ServerStream = {
  url: string
  quality: string
  type: string
  subtitles?: Array<{
    id: string
    language: string
    url: string
    isDefault?: boolean
  }>
}

type ServerEntry = {
  sub?: ServerStream[]
  dub?: ServerStream[]
}

function buildEmbedUrl(subUrl?: string, dubUrl?: string, subtitles?: Array<{ language: string; url: string }>) {
  const params = new URLSearchParams()

  if (subUrl) params.set("sHI", subUrl)
  if (dubUrl) params.set("dHI", dubUrl)

  // Add subtitle URLs
  if (subtitles && subtitles.length > 0) {
    for (const sub of subtitles) {
      // Map full language names to 2-letter codes
      const langMap: Record<string, string> = {
        English: "EN",
        Spanish: "ES",
        Japanese: "JA",
        French: "FR",
        German: "DE",
        Italian: "IT",
        Portuguese: "PT",
        Russian: "RU",
        Arabic: "AR",
        Chinese: "ZH",
        Korean: "KO",
      }
      const langCode = langMap[sub.language] || sub.language.slice(0, 2).toUpperCase()
      params.set(`s${langCode}`, sub.url)
    }
  }

  // Always use proxy
  params.set("needP", "1")

  return `${EMBED_BASE}?${params.toString()}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hiId = searchParams.get("HI")

    if (!hiId) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'HI' mancante" },
        { status: 400 },
      )
    }

    const apiUrl = `https://aw-au-as-api.vercel.app/api/en/stream?HI=${encodeURIComponent(hiId)}`
    console.log("[v0] EN stream API calling:", apiUrl)

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(25000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.warn("[v0] EN stream API failed:", res.status, errorText)
      return NextResponse.json({ ok: false, error: `English stream failed: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    console.log("[v0] EN stream API raw response keys:", Object.keys(data))

    // The response has a structure like:
    // { hianime: { available: true, servers: { "Hia-1 SUB": [...], "Hia-1 DUB": [...], "Hia-2 SUB": [...], ... } } }
    const hianimeData = data.hianime || data.HiAnime

    if (!hianimeData?.available || !hianimeData?.servers) {
      return NextResponse.json(
        { ok: false, error: "HNime stream not available for this episode" },
        { status: 404 },
      )
    }

    const servers = hianimeData.servers
    const serverKeys = Object.keys(servers)
    console.log("[v0] EN stream servers:", serverKeys)

    // Separate into sub and dub streams
    const subServers: Array<{ key: string; streams: ServerStream[] }> = []
    const dubServers: Array<{ key: string; streams: ServerStream[] }> = []

    for (const key of serverKeys) {
      const streams = servers[key]
      if (!Array.isArray(streams) || streams.length === 0) continue

      if (key.includes("SUB")) {
        subServers.push({ key, streams })
      } else if (key.includes("DUB")) {
        dubServers.push({ key, streams })
      }
    }

    console.log("[v0] Sub servers:", subServers.length, "Dub servers:", dubServers.length)

    // Pair sub and dub servers into embeds
    // Strategy: pair by index (Hia-1 SUB + Hia-1 DUB, Hia-2 SUB + Hia-2 DUB, etc.)
    const embeds: Array<{ name: string; embedUrl: string; subKey?: string; dubKey?: string }> = []

    if (subServers.length > 0 && dubServers.length > 0) {
      // Pair sub+dub servers
      const maxPairs = Math.max(subServers.length, dubServers.length)

      let embedIndex = 1
      let subIdx = 0
      let dubIdx = 0

      // First, pair matching servers (same number)
      const pairedSubs = new Set<number>()
      const pairedDubs = new Set<number>()

      for (let si = 0; si < subServers.length; si++) {
        // Extract number from key like "Hia-1 SUB"
        const subNum = subServers[si].key.match(/(\d+)/)?.[1]
        if (!subNum) continue

        for (let di = 0; di < dubServers.length; di++) {
          if (pairedDubs.has(di)) continue
          const dubNum = dubServers[di].key.match(/(\d+)/)?.[1]
          if (subNum === dubNum) {
            const subStream = subServers[si].streams[0]
            const dubStream = dubServers[di].streams[0]
            const subtitles = subStream.subtitles || dubStream.subtitles || []

            embeds.push({
              name: `Server HD-${embedIndex}`,
              embedUrl: buildEmbedUrl(subStream.url, dubStream.url, subtitles),
              subKey: subServers[si].key,
              dubKey: dubServers[di].key,
            })
            embedIndex++
            pairedSubs.add(si)
            pairedDubs.add(di)
            break
          }
        }
      }

      // Then handle unpaired subs
      for (let si = 0; si < subServers.length; si++) {
        if (pairedSubs.has(si)) continue
        const subStream = subServers[si].streams[0]
        const subtitles = subStream.subtitles || []

        embeds.push({
          name: `Server HD-${embedIndex}`,
          embedUrl: buildEmbedUrl(subStream.url, undefined, subtitles),
          subKey: subServers[si].key,
        })
        embedIndex++
      }

      // Handle unpaired dubs
      for (let di = 0; di < dubServers.length; di++) {
        if (pairedDubs.has(di)) continue
        const dubStream = dubServers[di].streams[0]
        const subtitles = dubStream.subtitles || []

        embeds.push({
          name: `Server HD-${embedIndex}`,
          embedUrl: buildEmbedUrl(undefined, dubStream.url, subtitles),
          dubKey: dubServers[di].key,
        })
        embedIndex++
      }
    } else if (subServers.length > 0) {
      // Only subs - one embed per sub server
      subServers.forEach((server, idx) => {
        const stream = server.streams[0]
        const subtitles = stream.subtitles || []

        embeds.push({
          name: `Server HD-${idx + 1}`,
          embedUrl: buildEmbedUrl(stream.url, undefined, subtitles),
          subKey: server.key,
        })
      })
    } else if (dubServers.length > 0) {
      // Only dubs - one embed per dub server
      dubServers.forEach((server, idx) => {
        const stream = server.streams[0]
        const subtitles = stream.subtitles || []

        embeds.push({
          name: `Server HD-${idx + 1}`,
          embedUrl: buildEmbedUrl(undefined, stream.url, subtitles),
          dubKey: server.key,
        })
      })
    }

    console.log("[v0] Built", embeds.length, "embed URLs")

    if (embeds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No streams available for this episode" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      embeds,
      defaultEmbed: embeds[0].embedUrl,
      defaultServer: embeds[0].name,
      source: "https://aw-au-as-api.vercel.app/api/en/stream",
      server: "HNime",
      isEnglish: true,
    })
  } catch (e: any) {
    console.error("[v0] EN stream error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero stream inglese" },
      { status: 500 },
    )
  }
}
