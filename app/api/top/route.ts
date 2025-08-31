import { NextResponse } from "next/server"
import { ANIMEWORLD_BASE, parseTop } from "@/lib/animeworld"

export async function GET() {
  try {
    const res = await fetch(ANIMEWORLD_BASE, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      // Revalidate every 15 minutes
      next: { revalidate: 900 },
    })
    const html = await res.text()
    const data = parseTop(html)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante lo scraping Top" }, { status: 500 })
  }
}
