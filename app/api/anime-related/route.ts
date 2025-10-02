import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseRelated } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

async function fetchSourcesForAnime(href: string) {
  try {
    console.log("[v0] Fetching sources for related anime:", href)

    // Extract anime ID from href (e.g., /play/horimiya.Mse3- from /play/horimiya.Mse3-/lRRhWd)
    const animeIdMatch = href.match(/\/play\/([^/?#]+)/)
    if (!animeIdMatch) {
      console.log("[v0] Could not extract anime ID from href:", href)
      return []
    }

    const animeId = animeIdMatch[1]
    console.log("[v0] Extracted anime ID:", animeId, "from href:", href)

    // Create sources array with AnimeWorld source
    // The URL should be the base anime path, not a specific episode
    const baseAnimePath = `/play/${animeId}`

    const sources = [
      {
        name: "AnimeWorld",
        url: baseAnimePath,
        id: animeId,
      },
    ]

    console.log("[v0] Generated sources for", href, ":", sources)
    return sources
  } catch (error) {
    console.log("[v0] Error fetching sources for", href, ":", error)
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`
    const { html, finalUrl } = await fetchHtml(url)
    const items = parseRelated(html)

    const itemsWithSources = await Promise.all(
      items.map(async (item) => {
        const sources = await fetchSourcesForAnime(item.href)
        return {
          ...item,
          sources,
          has_multi_servers: sources.length > 1,
        }
      }),
    )

    console.log("[v0] Related anime with sources:", itemsWithSources.length, "items")
    return NextResponse.json({ ok: true, items: itemsWithSources, source: finalUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore related" }, { status: 500 })
  }
}
