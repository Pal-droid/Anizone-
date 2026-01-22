import { type NextRequest, NextResponse } from "next/server"

const ANIMESATURN_REFERER = "https://www.animesaturn.cx/watch?file=472pIqEwG2v6c&s=alt"
const ANIMESATURN_ORIGIN = "https://www.animesaturn.cx"

// Allowed hosts for AnimeSaturn streams
const ALLOWED_HOSTS = [
  "streampeaker.org",
  "gohan.streampeaker.org",
]

function isAllowedHost(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return ALLOWED_HOSTS.some(host => 
      url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")
    const type = searchParams.get("type") || "mp4" // "mp4" or "m3u8"

    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing 'url' parameter" }, { status: 400 })
    }

    if (!isAllowedHost(url)) {
      return NextResponse.json({ ok: false, error: "Invalid URL domain" }, { status: 400 })
    }

    const rangeHeader = req.headers.get("range")

    // Build headers with required Referer
    const headers: HeadersInit = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": ANIMESATURN_REFERER,
      "Origin": ANIMESATURN_ORIGIN,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    }

    // For MP4, include Range header if provided
    if (type === "mp4" && rangeHeader) {
      headers["Range"] = rangeHeader
    }

    const response = await fetch(url, { headers })

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      )
    }

    // Handle M3U8 playlist - rewrite segment URLs
    if (type === "m3u8" || url.endsWith(".m3u8")) {
      const m3u8Content = await response.text()
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1)
      
      // Rewrite segment URLs to go through proxy
      const rewrittenContent = rewriteM3U8(m3u8Content, baseUrl, req.url)
      
      const responseHeaders = new Headers()
      responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl")
      responseHeaders.set("Access-Control-Allow-Origin", "*")
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
      responseHeaders.set("Access-Control-Allow-Headers", "Range")
      responseHeaders.set("Cache-Control", "no-cache")
      
      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: responseHeaders,
      })
    }

    // Handle MP4/segment streaming
    const contentType = response.headers.get("content-type") || "video/mp4"
    const contentLength = response.headers.get("content-length")
    const contentRange = response.headers.get("content-range")
    const acceptRanges = response.headers.get("accept-ranges")

    const responseHeaders = new Headers()
    responseHeaders.set("Content-Type", contentType)
    responseHeaders.set("Access-Control-Allow-Origin", "*")
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
    responseHeaders.set("Access-Control-Allow-Headers", "Range")
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength)
    }
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange)
    }
    if (acceptRanges) {
      responseHeaders.set("Accept-Ranges", acceptRanges)
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (e: any) {
    console.error("AnimeSaturn proxy error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Proxy error" }, { status: 500 })
  }
}

function rewriteM3U8(content: string, baseUrl: string, proxyUrl: string): string {
  const proxyBase = proxyUrl.split("?")[0]
  const lines = content.split("\n")
  
  return lines.map(line => {
    const trimmed = line.trim()
    
    // Skip comments and empty lines
    if (trimmed.startsWith("#") || trimmed === "") {
      // Handle URI attributes in tags like #EXT-X-KEY
      if (trimmed.includes("URI=")) {
        return rewriteURIAttribute(trimmed, baseUrl, proxyBase)
      }
      return line
    }
    
    // This is a segment URL
    let segmentUrl = trimmed
    if (!segmentUrl.startsWith("http")) {
      // Relative URL - make it absolute
      segmentUrl = new URL(segmentUrl, baseUrl).toString()
    }
    
    // Rewrite to go through proxy
    return `${proxyBase}?url=${encodeURIComponent(segmentUrl)}&type=segment`
  }).join("\n")
}

function rewriteURIAttribute(line: string, baseUrl: string, proxyBase: string): string {
  // Match URI="..." pattern
  const uriMatch = line.match(/URI="([^"]+)"/)
  if (!uriMatch) return line
  
  let uri = uriMatch[1]
  if (!uri.startsWith("http")) {
    uri = new URL(uri, baseUrl).toString()
  }
  
  const proxiedUri = `${proxyBase}?url=${encodeURIComponent(uri)}&type=key`
  return line.replace(/URI="[^"]+"/, `URI="${proxiedUri}"`)
}

export async function HEAD(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing 'url' parameter" }, { status: 400 })
    }

    if (!isAllowedHost(url)) {
      return NextResponse.json({ ok: false, error: "Invalid URL domain" }, { status: 400 })
    }

    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": ANIMESATURN_REFERER,
        "Origin": ANIMESATURN_ORIGIN,
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
    console.error("AnimeSaturn proxy HEAD error:", e)
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
