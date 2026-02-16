import { type NextRequest, NextResponse } from "next/server"

/**
 * English metadata API that fetches related and similar content
 * from the unified API for HNime content
 *
 * Query params:
 *   HI – HNime anime ID (e.g., "949/sub")
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hiId = searchParams.get("HI")

    if (!hiId) {
      return NextResponse.json(
        { ok: false, error: "Missing 'HI' query parameter" },
        { status: 400 }
      )
    }

    console.log("[en/meta] Fetching English meta for HI:", hiId)

    // Call the unified API for related and similar content
    const apiUrl = `https://aw-au-as-api.vercel.app/api/en/meta?HI=${encodeURIComponent(hiId)}`
    
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.error("[en/meta] Unified API error:", response.status, response.statusText)
      return NextResponse.json(
        { ok: false, error: `Unified API error: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log("[en/meta] Unified API response received")

    // Transform the response to match expected format
    const transformed = {
      related: data.related?.map((item: any) => ({
        id: item.id,
        title: item.title,
        poster: item.poster,
        url: item.url,
      })) || [],
      
      similar: data.similar?.map((item: any) => ({
        id: item.id,
        title: item.title,
        poster: item.poster,
        url: item.url,
        episodes: item.episodes,
        type: item.type,
        duration: item.duration,
      })) || [],
    }

    console.log("[en/meta] Transformed response - related:", transformed.related.length, "similar:", transformed.similar.length)

    return NextResponse.json({
      ok: true,
      related: transformed.related,
      similar: transformed.similar,
    })

  } catch (e: any) {
    console.error("[en/meta] Unhandled error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 }
    )
  }
}
