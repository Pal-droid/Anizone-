import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") // "Comix" or "World"
    
    // World parameters
    const chapterUrl = searchParams.get("chapter_url")
    
    // Comix parameters
    const comixHashId = searchParams.get("comix_hash_id")
    const comixSlug = searchParams.get("comix_slug")
    const chapterId = searchParams.get("chapter_id")
    const chapterNum = searchParams.get("chapter_num")

    if (!source) {
      return NextResponse.json({ error: "Missing source parameter" }, { status: 400 })
    }

    let pagesUrl: string

    if (source === "Comix") {
      if (!comixHashId || !comixSlug || !chapterId || !chapterNum) {
        return NextResponse.json({ error: "Missing Comix parameters" }, { status: 400 })
      }
      pagesUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?CX_HASH=${comixHashId}&CX_SLUG=${comixSlug}&CX_CHAPTER=${chapterId}&CX_NUM=${chapterNum}`
    } else if (source === "World") {
      if (!chapterUrl) {
        return NextResponse.json({ error: "Missing chapter_url for World source" }, { status: 400 })
      }
      pagesUrl = `https://aw-au-as-api.vercel.app/api/manga/pages?MW=${encodeURIComponent(chapterUrl)}`
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }

    console.log("[v0] Fetching pages from unified API:", pagesUrl)
    
    const response = await fetch(pagesUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully fetched pages:", data.pages?.length)

    // Transform to match expected format (array of URLs)
    const pages = data.pages?.map((page: any) => page.url) || []

    return NextResponse.json({ pages })
  } catch (error) {
    console.error("[v0] Error fetching pages:", error)
    return NextResponse.json({ error: "Failed to fetch pages", details: String(error) }, { status: 500 })
  }
})
