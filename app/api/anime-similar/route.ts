import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseSimilar } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`
    const { html, finalUrl } = await fetchHtml(url)
    const items = parseSimilar(html)
    return NextResponse.json({ ok: true, items, source: finalUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore similar" }, { status: 500 })
  }
}
