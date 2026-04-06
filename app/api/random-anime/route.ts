import { type NextRequest, NextResponse } from "next/server"
import { ANIMEWORLD_BASE } from "@/lib/animeworld"
import { fetchHtml } from "@/lib/fetch-html"

export async function GET(_req: NextRequest) {
  try {
    // fetchHtml follows redirects and returns the final URL
    const { finalUrl } = await fetchHtml(`${ANIMEWORLD_BASE}/random`)

    if (!finalUrl) {
      return NextResponse.json({ ok: false, error: "Nessun redirect ricevuto da /random" }, { status: 502 })
    }

    // finalUrl will be something like https://www.animeworld.ac/play/anime-name.XXXXX/epXX
    // Extract the path portion so the watch page can use it
    const url = new URL(finalUrl)
    const path = url.pathname

    if (!path || path === "/random") {
      return NextResponse.json({ ok: false, error: "Redirect non valido da /random" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, path })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero dell'anime casuale" },
      { status: 500 },
    )
  }
}
