import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") // "Comix" or "World"
    const hashId = searchParams.get("hash_id") // For Comix
    const slug = searchParams.get("slug")
    const mangaId = searchParams.get("manga_id") // For World

    if (!source || !slug) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    let apiUrl: string

    if (source === "Comix") {
      if (!hashId) {
        return NextResponse.json({ error: "Missing hash_id for Comix source" }, { status: 400 })
      }
      apiUrl = `https://aw-au-as-api.vercel.app/api/manga/chapters?CX=${hashId}&CX_SLUG=${slug}`
    } else if (source === "World") {
      if (!mangaId) {
        return NextResponse.json({ error: "Missing manga_id for World source" }, { status: 400 })
      }
      apiUrl = `https://aw-au-as-api.vercel.app/api/manga/chapters?MW=${mangaId}&MW_SLUG=${slug}`
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }

    console.log("[v0] Fetching unified chapters from:", apiUrl)
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.status}`)
    }

    const chapters = await response.json()
    console.log("[v0] Received chapters:", chapters.length)

    return NextResponse.json(chapters)
  } catch (error) {
    console.error("[v0] Error fetching unified chapters:", error)
    return NextResponse.json({ error: "Failed to fetch chapters", details: String(error) }, { status: 500 })
  }
})
