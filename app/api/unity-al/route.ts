import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const unityId = searchParams.get("AU")

    if (!unityId) {
      return NextResponse.json({ ok: false, error: "Missing AU (Unity ID) parameter" }, { status: 400 })
    }

    // Step 1: fetch via corsproxy, following redirects
    const targetUrl = `https://corsproxy.io?url=https://www.animeunity.so/anime/${unityId}-o`
    console.log("[unity-al] Fetching Unity page via proxy:", targetUrl)

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.error("[unity-al] Failed to fetch Unity page:", res.status, res.statusText)
      return NextResponse.json({ ok: false, error: "Failed to fetch Unity page" }, { status: 500 })
    }

    const html = await res.text()
    console.log("[unity-al] Fetched page length:", html.length)

    // Step 2: locate <video-player anime="..."> and extract the JSON string
    const videoPlayerMatch = html.match(/<video-player\s+anime="([^"]+)"/)
    if (!videoPlayerMatch) {
      console.error("[unity-al] Could not find <video-player anime=...> on page")
      return NextResponse.json({ ok: false, error: "Could not find video-player data" }, { status: 500 })
    }

    const rawJsonStr = videoPlayerMatch[1]
    console.log("[unity-al] Extracted raw JSON string (first 200 chars):", rawJsonStr.slice(0, 200))

    // Step 3: clean up the JSON string (unescape HTML entities)
    let cleanedJsonStr = rawJsonStr
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "")

    // Step 4: parse the JSON
    let parsed: any
    try {
      parsed = JSON.parse(cleanedJsonStr)
    } catch (e) {
      console.error("[unity-al] JSON parse error:", e)
      return NextResponse.json({ ok: false, error: "Failed to parse video-player JSON" }, { status: 500 })
    }

    // Step 5: extract anilist_id (top-level in Unity JSON)
    const anilistId = parsed?.anilist_id
    if (typeof anilistId !== "number" || anilistId <= 0) {
      console.error("[unity-al] Invalid or missing anilist_id:", anilistId)
      return NextResponse.json({ ok: false, error: "Invalid or missing anilist_id" }, { status: 500 })
    }

    console.log("[unity-al] Extracted AniList ID:", anilistId)

    return NextResponse.json({
      ok: true,
      anilist_id: anilistId,
      source: "Unity",
    })
  } catch (e: any) {
    console.error("[unity-al] Unexpected error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
