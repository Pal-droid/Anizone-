import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseStreamCandidates } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

function pickBest(candidates: string[]): string | null {
  if (!candidates.length) return null
  const mp4 = candidates.find((u) => u.toLowerCase().includes(".mp4"))
  if (mp4) return mp4
  try {
    const sweet = candidates.find((u) => {
      const h = new URL(u).hostname
      return h === "sweetpixel.org" || h.endsWith(".sweetpixel.org")
    })
    if (sweet) return sweet
  } catch {}
  const https = candidates.find((u) => u.startsWith("https://"))
  if (https) return https
  return candidates[0]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")
    if (!path) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'path' mancante. Esempio: /play/naruto-ita.Ze1Qv/NoZjU" },
        { status: 400 },
      )
    }
    const url = path.startsWith("http") ? path : `${ANIMEWORLD_BASE}${path}`

    const { html, finalUrl } = await fetchHtml(url)
    const candidates = parseStreamCandidates(html)
    const streamUrl = pickBest(candidates)

    if (!streamUrl) {
      return NextResponse.json(
        { ok: false, error: "Sorgenti video non trovate nella pagina.", source: finalUrl, candidates },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, streamUrl, source: finalUrl, candidates })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero del link stream" },
      { status: 500 },
    )
  }
}
