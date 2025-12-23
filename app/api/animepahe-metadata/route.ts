import { type NextRequest, NextResponse } from "next/server"

export interface AnimePaheMetadata {
  ids: {
    animepahe_id: string
    anidb?: string
    anilist?: string
    animePlanet?: string
    ann?: string
    kitsu?: string
    mal?: string
  }
  title: string
  image: string
  preview?: string
  synopsis: string
  synonym?: string
  japanese?: string
  type: string
  episodes: string
  status: string
  duration?: string
  aired?: string
  season?: string
  studio?: string
  themes?: string[]
  demographic?: string[]
  external_links?: Array<{ name: string; url: string }>
  genre?: string[]
  relations?: Record<string, any[]>
  recommendations?: any[]
}

function extractAniListId(data: AnimePaheMetadata): number | undefined {
  // First try to get from ids.anilist
  if (data.ids?.anilist) {
    const id = Number(data.ids.anilist)
    if (!isNaN(id)) return id
  }

  // Fallback: parse from external_links
  if (data.external_links) {
    const anilistLink = data.external_links.find((link) => link.name === "AniList")
    if (anilistLink?.url) {
      // Extract ID from URL like "https://anilist.co/anime/16498"
      const match = anilistLink.url.match(/anilist\.co\/anime\/(\d+)/)
      if (match) {
        const id = Number(match[1])
        if (!isNaN(id)) return id
      }
    }
  }

  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing 'id' parameter" }, { status: 400 })
    }

    console.log("[v0] Fetching AnimePahe metadata for ID:", id)

    const response = await fetch(`https://animepahe-two.vercel.app/api/${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.error("[v0] AnimePahe API error:", response.status)
      return NextResponse.json(
        { ok: false, error: `AnimePahe API returned status ${response.status}` },
        { status: response.status },
      )
    }

    const data: AnimePaheMetadata = await response.json()
    const anilistId = extractAniListId(data)
    console.log("[v0] AnimePahe metadata fetched successfully:", data.title, "AniList ID:", anilistId)

    return NextResponse.json({ ok: true, data, anilistId })
  } catch (e: any) {
    console.error("[v0] Error fetching AnimePahe metadata:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Error fetching AnimePahe metadata" }, { status: 500 })
  }
}
