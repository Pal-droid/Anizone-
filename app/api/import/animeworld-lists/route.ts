import { type NextRequest, NextResponse } from "next/server"
import { load } from "cheerio"

const ANIMEWORLD_BASE = "https://www.animeworld.ac"

// Map AnimeWorld folder numbers to status names
const FOLDER_STATUS_MAP: Record<string, string> = {
  "1": "In corso",
  "2": "Completati",
  "3": "In pausa",
  "4": "Droppati",
  "5": "Da guardare",
}

interface WatchlistItem {
  title: string
  jtitle?: string
  href: string
  image: string
  status: string
  score: number
  episodes: number
  maxEpisodes: number
  anilist_link?: string
  mal_link?: string
  genres: string[]
  notes?: string
  isDub: boolean
  isLiked: boolean
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    // Fetch the user's watchlist page from AnimeWorld
    const watchlistUrl = `${ANIMEWORLD_BASE}/watchlist/${encodeURIComponent(userId)}`
    console.log("[v0] Fetching AnimeWorld watchlist:", watchlistUrl)
    
    const response = await fetch(watchlistUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch watchlist page: ${response.status}`)
    }

    const html = await response.text()
    const $ = load(html)

    // Result object with status categories
    const result: Record<string, WatchlistItem[]> = {
      "In corso": [],
      "Completati": [],
      "In pausa": [],
      "Droppati": [],
      "Da guardare": [],
    }

    // Parse each watchlist folder
    $(".watchlist-folder").each((_, folderEl) => {
      const $folder = $(folderEl)
      const folderNum = $folder.attr("data-folder") || ""
      const statusName = FOLDER_STATUS_MAP[folderNum] || "Da guardare"

      // Parse each item in the folder
      $folder.find(".watchlist-list .watchlist-list-row.item").each((_, itemEl) => {
        const $item = $(itemEl)
        
        // Extract data attributes
        const dataScore = parseInt($item.attr("data-score") || "0", 10)
        const dataEpisodes = parseInt($item.attr("data-episodes") || "0", 10)
        const dataMaxEpisodes = parseInt($item.attr("data-max-episodes") || "0", 10)
        const dataLiked = $item.attr("data-liked") === "true"
        
        // Get title and href
        const $titleLink = $item.find(".title .link a").first()
        const title = $titleLink.text().trim()
        const jtitle = $titleLink.attr("data-jtitle") || undefined
        const href = $titleLink.attr("href") || ""
        
        // Get image
        const $img = $item.find(".image img")
        const image = $img.attr("src") || ""
        
        // Check if it's dubbed
        const isDub = $item.find(".watchlist-tag.dub").length > 0
        
        // Get genres from hidden data
        const genres: string[] = []
        $item.find(".hidden-data .categories a").each((_, genreEl) => {
          const genreName = $(genreEl).text().trim()
          if (genreName) genres.push(genreName)
        })
        
        // Get external links
        const malLink = $item.find(".hidden-data .hyperlinks .mal").text().trim() || undefined
        const anilistLink = $item.find(".hidden-data .hyperlinks .anilist").text().trim() || undefined
        
        // Get notes
        const notes = $item.find(".hidden-data .notes").text().trim() || undefined

        if (title && href) {
          result[statusName].push({
            title,
            jtitle,
            href: href.startsWith("http") ? href : `${ANIMEWORLD_BASE}${href}`,
            image: image.startsWith("http") ? image : (image ? `https://img.animeworld.ac${image}` : ""),
            status: statusName,
            score: dataScore,
            episodes: dataEpisodes,
            maxEpisodes: dataMaxEpisodes,
            anilist_link: anilistLink,
            mal_link: malLink,
            genres,
            notes,
            isDub,
            isLiked: dataLiked,
          })
        }
      })
    })

    // Log summary
    const totalItems = Object.values(result).reduce((sum, arr) => sum + arr.length, 0)
    console.log("[v0] Parsed watchlist - Total items:", totalItems)
    Object.entries(result).forEach(([status, items]) => {
      if (items.length > 0) {
        console.log(`[v0]   ${status}: ${items.length} items`)
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching AnimeWorld lists:", error)
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 })
  }
}
