import { type NextRequest, NextResponse } from "next/server"
import { buildFilterUrl, parseSearch } from "@/lib/animeworld"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    // Preserve multiple values per key
    const multiParams = new Map<string, string[]>()
    for (const [k, v] of searchParams.entries()) {
      const arr = multiParams.get(k) || []
      arr.push(v)
      multiParams.set(k, arr)
    }

    // Build params allowing arrays
    const params: Record<string, string | string[]> = {}
    for (const [k, arr] of multiParams.entries()) {
      // Split comma-separated values but keep true duplicates as repeats
      const split = arr.flatMap((v) =>
        v
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      )
      params[k] = split
    }

    const target = buildFilterUrl(params)
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.animeworld.ac/",
      },
      next: { revalidate: 300 },
    })
    const html = await res.text()
    const items = parseSearch(html)
    return NextResponse.json({ ok: true, items, source: target })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante la ricerca" }, { status: 500 })
  }
}
