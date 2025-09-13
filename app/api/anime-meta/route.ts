import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseWatchMeta, parseAnimeSaturnMeta } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    console.log("[v0] anime-meta API called with path:", path)

    if (!path) return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })

    let url: string
    if (path.startsWith("http")) {
      url = path
      console.log("[v0] Using full URL:", url)
    } else if (path.includes("animesaturn") || path.startsWith("/anime/")) {
      // Handle AnimeSaturn paths
      url = path.startsWith("http") ? path : `https://www.animesaturn.cx${path}`
      console.log("[v0] Detected AnimeSaturn path, using URL:", url)
    } else {
      let animePath = path
      animePath = animePath.replace(/\/+/g, "/")

      // Handle calendar anime paths that come from watch URLs
      if (animePath.includes("/play/")) {
        // Extract the anime ID from the path
        const playMatch = animePath.match(/\/play\/([^/?]+)/)
        if (playMatch) {
          animePath = `/play/${playMatch[1]}`
        }
      } else if (!animePath.startsWith("/")) {
        // If it's just an anime ID, add the play prefix
        animePath = `/play/${animePath}`
      } else if (!animePath.startsWith("/play/") && !animePath.includes(".")) {
        // If it's a path but not a play path and has no extension, add play prefix
        const cleanPath = animePath.replace(/^\/+/, "")
        animePath = `/play/${cleanPath}`
      }

      url = `${ANIMEWORLD_BASE}${animePath}`.replace(/([^:]\/)\/+/g, "$1")
      console.log("[v0] Using AnimeWorld URL:", url)
    }

    console.log("[v0] Fetching HTML from:", url)
    const { html, finalUrl } = await fetchHtml(url)
    console.log("[v0] Final URL after fetch:", finalUrl)

    let meta
    if (finalUrl.includes("animesaturn.cx") || url.includes("animesaturn.cx")) {
      console.log("[v0] Using AnimeSaturn parser")
      meta = parseAnimeSaturnMeta(html)
    } else {
      console.log("[v0] Using AnimeWorld parser")
      meta = parseWatchMeta(html)
    }

    console.log("[v0] Parsed meta:", meta ? "success" : "failed")
    if (!meta) {
      console.log("[v0] Metadata fetch result:", { ok: false, error: "Meta non trovati", source: finalUrl })
      return NextResponse.json({ ok: false, error: "Meta non trovati", source: finalUrl }, { status: 404 })
    }

    console.log("[v0] Metadata fetch result:", { ok: true, meta: "success", source: finalUrl })
    return NextResponse.json({ ok: true, meta, source: finalUrl })
  } catch (e: any) {
    console.log("[v0] anime-meta API error:", e?.message)
    return NextResponse.json({ ok: false, error: e?.message || "Errore meta" }, { status: 500 })
  }
}
