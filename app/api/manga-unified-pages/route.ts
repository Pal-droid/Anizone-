import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"
import * as cheerio from "cheerio"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: new URL(currentUrl).origin,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      redirect: "manual",
    })

    if (response.ok) return response

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) throw new Error(`Redirect (${response.status}) without Location header`)
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString()
      console.log(`[v0] Following redirect to: ${currentUrl}`)
      continue
    }

    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

function parseMangaPages(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const pages: string[] = []

  try {
    console.log("[v0] Starting manga page extraction...")

    // Method 1: Look for div with id="page" (based on user's HTML structure)
    const pageDiv = $("#page")
    if (pageDiv.length > 0) {
      console.log("[v0] Found #page div, extracting images...")
      pageDiv.find("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (src && isValidMangaImage(src)) {
          pages.push(makeAbsolute(src, baseUrl))
        }
      })
    }

    // Method 2: Direct selectors for common manga reader patterns
    if (pages.length === 0) {
      console.log("[v0] Trying direct selectors...")
      const selectors = [
        'img[id^="page-"]', // Images with IDs starting with "page-"
        "img.page-image", // Images with page-image class
        ".reader-area img", // Images in reader area
        ".reader img", // Images in reader container
        ".chapter-content img", // Images in chapter content
      ]

      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
          if (src && isValidMangaImage(src)) {
            pages.push(makeAbsolute(src, baseUrl))
          }
        })

        if (pages.length > 0) {
          console.log(`[v0] Found ${pages.length} images with selector: ${selector}`)
          break
        }
      }
    }

    // Method 3: Generic image search with smart filtering
    if (pages.length === 0) {
      console.log("[v0] Trying generic image search with filtering...")
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src")
        if (src && isValidMangaImage(src) && isMangaPageImage(src)) {
          pages.push(makeAbsolute(src, baseUrl))
        }
      })
    }

    console.log(`[v0] Successfully extracted ${pages.length} page images`)
    return pages
  } catch (error) {
    console.error("[v0] Error parsing manga pages:", error)
    return pages
  }
}

function isValidMangaImage(src: string): boolean {
  if (!src) return false
  const hasValidExtension = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(src)
  if (!hasValidExtension) return false
  const excludePatterns = ["placeholder", "logo", "avatar", "banner", "icon", "button", "bg", "background"]
  return !excludePatterns.some((pattern) => src.toLowerCase().includes(pattern))
}

function isMangaPageImage(src: string): boolean {
  const mangaPatterns = ["mangaworld", "cdn", "chapter", "page", "/\\d+\\.(jpg|jpeg|png|webp)"]
  return mangaPatterns.some((pattern) => {
    if (pattern.includes("\\d")) {
      return new RegExp(pattern, "i").test(src)
    }
    return src.toLowerCase().includes(pattern.toLowerCase())
  })
}

function makeAbsolute(url: string, base: string): string {
  if (url.startsWith("http")) return url
  const baseOrigin = new URL(base).origin
  return baseOrigin + (url.startsWith("/") ? url : "/" + url)
}

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") // "Comix" or "World"

    // Comix parameters
    const hashId = searchParams.get("hash_id")
    const slug = searchParams.get("slug")
    const chapterId = searchParams.get("chapter_id")
    const chapterNum = searchParams.get("chapter_num")

    // World parameters
    const chapterUrl = searchParams.get("chapter_url")

    if (!source) {
      return NextResponse.json({ error: "Missing source parameter" }, { status: 400 })
    }

    let pages: string[] = []

    if (source === "Comix") {
      if (!hashId || !slug || !chapterId || !chapterNum) {
        return NextResponse.json({ error: "Missing Comix parameters" }, { status: 400 })
      }
      
      // Case 1b: Use unified API for Comix
      const apiUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?CX_HASH=${hashId}&CX_SLUG=${slug}&CX_CHAPTER=${chapterId}&CX_NUM=${chapterNum}`
      
      console.log("[v0] Fetching Comix pages from unified API:", apiUrl)
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch Comix pages: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Received Comix pages:", data.pages?.length)
      
      // Transform to match expected format
      pages = data.pages?.map((page: any) => page.url) || []
      
    } else if (source === "World") {
      if (!chapterUrl) {
        return NextResponse.json({ error: "Missing chapter_url for World source" }, { status: 400 })
      }

      // Case 1a: Try unified API first (for queried manga with both servers)
      try {
        const unifiedApiUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?MW=${encodeURIComponent(chapterUrl)}`
        console.log("[v0] Trying unified API for World pages:", unifiedApiUrl)
        
        const unifiedResponse = await fetch(unifiedApiUrl)
        
        if (unifiedResponse.ok) {
          const unifiedData = await unifiedResponse.json()
          console.log("[v0] Unified API succeeded, pages:", unifiedData.pages?.length)
          pages = unifiedData.pages?.map((page: any) => page.url) || []
        } else {
          throw new Error(`Unified API failed: ${unifiedResponse.status}`)
        }
      } catch (unifiedError) {
        console.log("[v0] Unified API failed, falling back to direct scraping:", unifiedError)
        
        // Case 1a fallback: Direct scraping for World-only manga
        let listUrl: string
        if (chapterUrl.includes("?")) {
          const [baseUrl, queryString] = chapterUrl.split("?")
          listUrl = `${baseUrl}/1?${queryString}&style=list`
        } else {
          listUrl = `${chapterUrl}/1?style=list`
        }

        console.log("[v0] Fetching World pages via direct scraping:", listUrl)
        const response = await fetchWithRedirects(listUrl)
        const html = await response.text()
        console.log("[v0] HTML response length:", html.length)

        pages = parseMangaPages(html, listUrl)
        console.log("[v0] Parsed World pages count:", pages.length)
      }
      
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }

    return NextResponse.json({ pages })
  } catch (error) {
    console.error("[v0] Error fetching unified pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages", details: String(error) }, { status: 500 })
  }
})
