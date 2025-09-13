import { NextResponse } from "next/server"

export async function GET() {
  try {
    const allTrendingChapters = [
      {
        id: "1637",
        title: "Chainsaw Man",
        image: "/chainsaw-man-manga-cover.png",
        chapter: "Capitolo 213",
        url: "/manga/1637/chainsaw-man",
      },
      {
        id: "3701",
        title: "Solo Leveling: Ragnarok",
        image: "/solo-leveling-ragnarok-manga-cover.jpg",
        chapter: "Capitolo 48",
        url: "/manga/3701/solo-leveling-ragnarok",
      },
      {
        id: "1848",
        title: "Blue Lock",
        image: "/blue-lock-manga-cover.jpg",
        chapter: "Capitolo 314.5",
        url: "/manga/1848/blue-lock",
      },
      {
        id: "3965",
        title: "Star-Embracing Swordmaster",
        image: "/star-embracing-swordmaster-manga-cover.jpg",
        chapter: "Capitolo 35",
        url: "/manga/3965/the-stellar-swordmaster",
      },
      {
        id: "1972",
        title: "Martial Peak",
        image: "/martial-peak-manga-cover.jpg",
        chapter: "Capitolo 1779",
        url: "/manga/1972/martial-peak",
      },
    ]

    const validTrendingChapters = allTrendingChapters.filter((chapter) => {
      // Only allow numeric IDs (no hyphens or special characters)
      const isValidId = /^\d+$/.test(chapter.id)
      // Ensure URL is properly formatted
      const hasValidUrl = chapter.url && chapter.url.startsWith("/manga/")
      // Ensure required fields are present
      const hasRequiredFields = chapter.title && chapter.chapter && chapter.image

      if (!isValidId) {
        console.log(`[v0] Filtering out invalid manga ID: ${chapter.id}`)
      }

      return isValidId && hasValidUrl && hasRequiredFields
    })

    console.log(`[v0] Returning ${validTrendingChapters.length} valid trending chapters`)

    return NextResponse.json({
      ok: true,
      chapters: validTrendingChapters,
    })
  } catch (error) {
    console.error("Trending chapters API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch trending chapters" }, { status: 500 })
  }
}
