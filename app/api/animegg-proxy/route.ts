import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing 'url' parameter" }, { status: 400 })
    }

    // Validate the URL is from animegg.org
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes("animegg.org")) {
      return NextResponse.json({ ok: false, error: "Invalid URL domain" }, { status: 400 })
    }

    // Fetch the video with the required referrer
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.animegg.org/",
        Origin: "https://www.animegg.org",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Range: req.headers.get("range") || "bytes=0-",
      },
    })

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch video: ${response.status}` },
        { status: response.status },
      )
    }

    // Get the content type and length
    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")
    const contentRange = response.headers.get("content-range")
    const acceptRanges = response.headers.get("accept-ranges")

    // Create response headers
    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "Range")
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }
    if (contentRange) {
      headers.set("Content-Range", contentRange)
    }
    if (acceptRanges) {
      headers.set("Accept-Ranges", acceptRanges)
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    })
  } catch (e: any) {
    console.error("AnimeGG proxy error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Proxy error" }, { status: 500 })
  }
}

export async function HEAD(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing 'url' parameter" }, { status: 400 })
    }

    const urlObj = new URL(url)
    if (!urlObj.hostname.includes("animegg.org")) {
      return NextResponse.json({ ok: false, error: "Invalid URL domain" }, { status: 400 })
    }

    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.animegg.org/",
        Origin: "https://www.animegg.org",
      },
    })

    const headers = new Headers()
    headers.set("Content-Type", response.headers.get("content-type") || "video/mp4")
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Accept-Ranges", response.headers.get("accept-ranges") || "bytes")

    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(null, {
      status: response.status,
      headers,
    })
  } catch (e: any) {
    console.error("AnimeGG proxy HEAD error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Proxy error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    },
  })
}
