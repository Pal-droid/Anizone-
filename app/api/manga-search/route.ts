import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"
import * as cheerio from "cheerio"

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (query) {
      // Search with query - use unified API
      console.log("[v0] Searching manga with query:", query)
      const apiUrl = `https://aw-au-as-api.vercel.app/api/manga/search?q=${encodeURIComponent(query)}`
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error(`Failed to search manga: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Found manga results:", data.length)
      
      return NextResponse.json(data)
    } else {
      // Preloaded search - scrape from MangaWorld archive
      console.log("[v0] Fetching preloaded manga from MangaWorld archive")
      const archiveUrl = "https://www.mangaworld.mx/archive"
      
      const response = await fetch(archiveUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch archive: ${response.status}`)
      }

      const html = await response.text()
      const mangaList = parseMangaArchive(html)
      
      console.log("[v0] Parsed preloaded manga:", mangaList.length)
      return NextResponse.json(mangaList)
    }
  } catch (error) {
    console.error("[v0] Error in manga search:", error)
    return NextResponse.json({ error: "Failed to search manga", details: String(error) }, { status: 500 })
  }
})

function parseMangaArchive(html: string): any[] {
  const $ = cheerio.load(html)
  const mangaList: any[] = []

  $(".comics-grid .entry").each((_, element) => {
    const $entry = $(element)
    
    // Extract basic info
    const title = $entry.find(".manga-title").attr("title") || $entry.find(".name a").text().trim()
    const href = $entry.find(".thumb").attr("href") || $entry.find(".name a").attr("href")
    const image = $entry.find(".thumb img").attr("src")
    
    // Extract metadata
    const type = $entry.find(".genre a").first().text().trim()
    const status = $entry.find(".status a").first().text().trim()
    const author = $entry.find(".author a").first().text().trim()
    const artist = $entry.find(".artist a").first().text().trim()
    
    // Extract genres
    const genres = $entry.find(".genres a").map((_, el) => $(el).text().trim()).get()
    
    // Extract story
    const story = $entry.find(".story").text().replace("Trama: ", "").trim()
    
    // Extract ID and slug from URL
    let id = ""
    let slug = ""
    if (href) {
      const urlParts = href.split("/")
      const mangaIndex = urlParts.findIndex((part) => part === "manga")
      if (mangaIndex !== -1 && urlParts[mangaIndex + 1] && urlParts[mangaIndex + 2]) {
        id = urlParts[mangaIndex + 1]
        slug = urlParts[mangaIndex + 2]
      }
    }

    if (title && href && id && slug) {
      mangaList.push({
        title,
        url: href,
        image,
        type,
        status,
        author,
        artist,
        genres,
        story,
        mangaId: id,
        slug,
      })
    }
  })

  return mangaList
}
