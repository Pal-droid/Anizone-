import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

const CORS_PROXY = "https://corsproxy.io/?url="

// Unity stream route - fetches MP4 URL from animeunity embed
export const GET = withCors(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const episodeId = searchParams.get("episode_id")

    if (!episodeId) {
      return NextResponse.json({ ok: false, error: "Missing episode_id parameter" }, { status: 400 })
    }

    console.log("[v0] Unity stream - fetching embed URL for episode:", episodeId)

    // Step 1: Get the embed URL from animeunity via CORS proxy
    const embedUrlEndpoint = `https://www.animeunity.so/embed-url/${episodeId}`
    const embedUrlResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(embedUrlEndpoint)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!embedUrlResponse.ok) {
      const errorBody = await embedUrlResponse.text().catch(() => "")
      console.log("[v0] Unity stream - embed URL fetch failed:", embedUrlResponse.status, errorBody.substring(0, 200))
      return NextResponse.json(
        { ok: false, error: `Failed to fetch embed URL: ${embedUrlResponse.status}` },
        { status: 500 },
      )
    }

    // The response should be the embed URL directly (like https://vixcloud.co/embed/...)
    const embedUrl = await embedUrlResponse.text()
    console.log("[v0] Unity stream - got embed URL:", embedUrl.substring(0, 100))

    if (!embedUrl || !embedUrl.includes("vixcloud.co")) {
      return NextResponse.json(
        { ok: false, error: "Invalid embed URL received", received: embedUrl.substring(0, 200) },
        { status: 500 },
      )
    }

    // Step 2: Fetch the embed page to extract the downloadUrl via CORS proxy
    const embedPageResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(embedUrl.trim())}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!embedPageResponse.ok) {
      console.log("[v0] Unity stream - embed page fetch failed:", embedPageResponse.status)
      return NextResponse.json(
        { ok: false, error: `Failed to fetch embed page: ${embedPageResponse.status}` },
        { status: 500 },
      )
    }

    const embedHtml = await embedPageResponse.text()

    // Extract the downloadUrl from: window.downloadUrl = '...'
    const downloadUrlMatch = embedHtml.match(/window\.downloadUrl\s*=\s*['"]([^'"]+)['"]/i)

    if (!downloadUrlMatch || !downloadUrlMatch[1]) {
      console.log("[v0] Unity stream - could not find downloadUrl in embed page")

      // Try alternative patterns
      const altMatch = embedHtml.match(/download[Uu]rl['":\s]+['"]([^'"]+)['"]/i)
      if (altMatch && altMatch[1]) {
        console.log("[v0] Unity stream - found alt downloadUrl:", altMatch[1].substring(0, 80))
        return NextResponse.json({
          ok: true,
          stream_url: altMatch[1],
          embed_url: embedUrl.trim(),
          source: "Unity",
        })
      }

      return NextResponse.json({ ok: false, error: "Could not extract stream URL from embed" }, { status: 500 })
    }

    const streamUrl = downloadUrlMatch[1]
    console.log("[v0] Unity stream - extracted MP4 URL:", streamUrl.substring(0, 80))

    return NextResponse.json({
      ok: true,
      stream_url: streamUrl,
      embed_url: embedUrl.trim(),
      source: "Unity",
    })
  } catch (e: any) {
    console.error("[v0] Unity stream error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Error fetching Unity stream" }, { status: 500 })
  }
})
