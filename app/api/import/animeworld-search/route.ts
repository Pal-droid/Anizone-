import { type NextRequest, NextResponse } from "next/server"
import { load } from "cheerio"

const ANIMEWORLD_BASE = "https://www.animeworld.ac"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 })
  }

  try {
    // Fetch the user search page from AnimeWorld
    const searchUrl = `${ANIMEWORLD_BASE}/users?keyword=${encodeURIComponent(username)}`
    console.log("[v0] Searching AnimeWorld users:", searchUrl)
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch search page: ${response.status}`)
    }

    const html = await response.text()
    const $ = load(html)

    const results: Array<{
      id: number
      username: string
      pfp: string
    }> = []

    // Parse user results from the search page
    // Structure: .widget-body .film-list .item .inner
    $(".widget-body .film-list .item").each((_, el) => {
      const $item = $(el)
      const $inner = $item.find(".inner")
      
      // Get user profile link - extract user ID from href
      const $profileLink = $inner.find("a.user-image, a[href*='/profile/']").first()
      const profileHref = $profileLink.attr("href") || ""
      
      // Extract user ID from /profile/184425
      const idMatch = profileHref.match(/\/profile\/(\d+)/)
      if (!idMatch) return
      
      const userId = parseInt(idMatch[1], 10)
      
      // Get username
      const $nameLink = $inner.find("a.name")
      const userName = $nameLink.text().trim()
      
      if (!userName) return
      
      // Get profile picture
      const $img = $inner.find("img")
      const pfp = $img.attr("src") || ""

      results.push({
        id: userId,
        username: userName,
        pfp: pfp.startsWith("http") ? pfp : `${ANIMEWORLD_BASE}${pfp}`,
      })
    })

    console.log("[v0] Found", results.length, "users")

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error searching AnimeWorld users:", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}
