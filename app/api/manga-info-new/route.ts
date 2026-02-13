import { type NextRequest, NextResponse } from "next/server"
import { withCors } from "@/lib/cors"

export const GET = withCors(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const worldId = searchParams.get("world_id")
    const worldSlug = searchParams.get("world_slug")
    const comixHashId = searchParams.get("comix_hash_id")
    const comixSlug = searchParams.get("comix_slug")

    if (!id) {
      return NextResponse.json({ error: "Missing manga ID" }, { status: 400 })
    }

    // Determine which source to use for info
    let infoUrl: string
    let source: string

    if (comixHashId && comixSlug) {
      // Use Comix for info when available
      infoUrl = `https://aw-au-as-api.vercel.app/api/manga/info?CX_HASH=${comixHashId}&CX_SLUG=${comixSlug}`
      source = "Comix"
    } else if (worldId && worldSlug) {
      // Use World for info
      infoUrl = `https://aw-au-as-api.vercel.app/api/manga/info?MW=${worldId}&MW_SLUG=${worldSlug}`
      source = "World"
    } else {
      // Try to determine from the ID format
      if (id.match(/^\d+$/)) {
        // Numeric ID, likely World
        infoUrl = `https://aw-au-as-api.vercel.app/api/manga/info?MW=${id}`
        source = "World"
      } else {
        // Non-numeric ID, likely Comix hash
        infoUrl = `https://aw-au-as-api.vercel.app/api/manga/info?CX_HASH=${id}`
        source = "Comix"
      }
    }

    console.log("[v0] Fetching manga info from unified API:", infoUrl)
    
    const response = await fetch(infoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch manga info: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Successfully fetched manga info:", data.title)

    // Transform the response to match expected format
    const transformedData = {
      title: data.title,
      image: data.poster || data.image || "",
      type: data.type || "Manga",
      status: data.status || "Unknown",
      author: data.author || "",
      artist: data.artist || "",
      year: data.year || "",
      genres: data.genres || [],
      trama: data.description || data.story || "",
      volumes: [], // Will be populated by chapters API
      url: data.url || "",
      anilistId: data.anilist_id || null,
      sources: data.sources || [],
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("[v0] Error fetching manga info:", error)
    return NextResponse.json({ error: "Failed to fetch manga info", details: String(error) }, { status: 500 })
  }
})
