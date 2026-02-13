import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") // "Comix" or "World"
    
    // World parameters
    const worldId = searchParams.get("world_id")
    const worldSlug = searchParams.get("world_slug")
    
    // Comix parameters
    const comixHashId = searchParams.get("comix_hash_id")
    const comixSlug = searchParams.get("comix_slug")

    if (!source) {
      return NextResponse.json({ error: "Missing source parameter" }, { status: 400 })
    }

    let chaptersUrl: string

    if (source === "Comix") {
      if (!comixHashId || !comixSlug) {
        return NextResponse.json({ error: "Missing Comix parameters" }, { status: 400 })
      }
      chaptersUrl = `https://aw-au-as-api.vercel.app/api/manga/chapters?CX_HASH=${comixHashId}&CX_SLUG=${comixSlug}`
    } else if (source === "World") {
      if (!worldId || !worldSlug) {
        return NextResponse.json({ error: "Missing World parameters" }, { status: 400 })
      }
      chaptersUrl = `https://aw-au-as-api.vercel.app/api/manga/chapters?MW=${worldId}&MW_SLUG=${worldSlug}`
    } else {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 })
    }

    console.log("[v0] Fetching chapters from unified API:", chaptersUrl)
    
    const response = await fetch(chaptersUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully fetched chapters:", data.length)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching chapters:", error)
    return NextResponse.json({ error: "Failed to fetch chapters", details: String(error) }, { status: 500 })
  }
})
