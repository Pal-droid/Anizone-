import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseWatchMeta } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) return NextResponse.json({ ok: false, error: "Parametro 'path' mancante" }, { status: 400 })
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`
    const { html, finalUrl } = await fetchHtml(url)
    const meta = parseWatchMeta(html)
    if (!meta) return NextResponse.json({ ok: false, error: "Meta non trovati", source: finalUrl }, { status: 404 })
    return NextResponse.json({ ok: true, meta, source: finalUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore meta" }, { status: 500 })
  }
}
