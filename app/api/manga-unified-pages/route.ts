import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

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

    let apiUrl: string

    if (source === "Comix") {
      if (!hashId || !slug || !chapterId || !chapterNum) {
        return NextResponse.json({ error: "Missing Comix parameters" }, { status: 400 })
      }
      apiUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?CX_HASH=${hashId}&CX_SLUG=${slug}&CX_CHAPTER=${chapterId}&CX_NUM=${chapterNum}`
    } else if (source === "World") {
      if (!chapterUrl) {
        return NextResponse.json({ error: "Missing chapter_url for World source" }, { status: 400 })
      }
      apiUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?MW=${encodeURIComponent(chapterUrl)}`
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }

    console.log("[v0] Fetching unified pages from:", apiUrl)
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Received pages:", data.pages?.length)

    // Transform to match expected format
    const pages = data.pages?.map((page: any) => page.url) || []

    return NextResponse.json({ pages })
  } catch (error) {
    console.error("[v0] Error fetching unified pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages", details: String(error) }, { status: 500 })
  }
})
