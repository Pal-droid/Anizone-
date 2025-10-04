import { type NextRequest, NextResponse } from "next/server"
import { load } from "cheerio"

const BASE_URL = "https://filmsenzalimiti.food"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ ok: false, error: "Query parameter missing" }, { status: 400 })
    }

    const searchUrl = `${BASE_URL}/serie-tv/?story=${encodeURIComponent(query)}&do=search&subaction=search`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Failed to fetch search results" }, { status: response.status })
    }

    const html = await response.text()
    const $ = load(html)
    const results: any[] = []

    $("li").each((_, el) => {
      const link = $(el).find("a").first()
      const href = link.attr("href")

      if (!href || !href.includes("/guarda/")) return

      const bgStyle = $(el).find("div[style*='background-image']").attr("style")
      const imageMatch = bgStyle?.match(/url$$([^)]+)$$/)
      const image = imageMatch ? imageMatch[1] : ""

      const title = $(el).find(".title").text().trim()
      const rating = $(el).find(".episode").attr("title")?.replace("Voto IMDb", "").trim()
      const isHD = $(el).find(".hd").length > 0

      if (title && href) {
        results.push({
          title,
          url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
          image: image.startsWith("http") ? image : `${BASE_URL}${image}`,
          rating: rating || "N/A",
          isHD,
        })
      }
    })

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    console.error("[v0] Movies search error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Search failed" }, { status: 500 })
  }
}
