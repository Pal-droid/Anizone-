import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const keyword = searchParams.get("q") || searchParams.get("keyword") || ""

  if (!keyword) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Calling unified manga API with keyword:", keyword)

    const unifiedUrl = `https://aw-au-as-api.vercel.app/api/manga/search?q=${encodeURIComponent(keyword)}`

    const response = await fetch(unifiedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.error("[v0] Unified manga API failed with status:", response.status)
      const errorText = await response.text()
      console.error("[v0] Error response:", errorText)
      throw new Error(`Unified API failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Unified manga API response:", data.length, "results")

    const transformedResults = data.map((item: any) => {
      // Find the World source for the mangaId
      const worldSource = item.sources?.find((s: any) => s.name === "World")
      const mangaId = worldSource?.id || item.id || ""

      return {
        title: item.title || "",
        url: item.slug ? `/manga/${item.slug}` : "",
        image: item.poster || "", // Use poster field from unified API
        type: item.type || "",
        status: item.status || "",
        author: "",
        artist: "",
        genres: [],
        story: item.description || "",
        mangaId: mangaId, // Use MangaWorld ID from sources
        mangaSlug: item.slug || "",
        sources: item.sources || [], // Store all sources
      }
    })

    return NextResponse.json({
      results: transformedResults,
      unified: true,
      pagination: null,
    })
  } catch (error) {
    console.error("[v0] Error fetching unified manga search:", error)
    return NextResponse.json({ error: "Failed to fetch manga results from unified API" }, { status: 500 })
  }
}
