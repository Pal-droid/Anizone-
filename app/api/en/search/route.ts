import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get("keyword") || searchParams.get("q")

    if (!keyword) {
      return NextResponse.json({ ok: false, error: "Parametro 'keyword' mancante" }, { status: 400 })
    }

    if (keyword.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "La ricerca deve contenere almeno 2 caratteri." },
        { status: 400 },
      )
    }

    const apiUrl = `https://aw-au-as-api.vercel.app/api/en/search?q=${encodeURIComponent(keyword.trim())}`
    console.log("[v0] EN search API calling:", apiUrl)

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.warn("[v0] EN search API failed:", res.status, errorText)
      return NextResponse.json({ ok: false, error: `English search failed: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    console.log("[v0] EN search API returned", data.length, "results")

    // Transform EN API response to our internal format
    const items = data.map((result: any) => {
      const hiAnimeSource = result.sources?.find((s: any) => s.name === "HiAnime")

      return {
        title: result.title,
        href: hiAnimeSource?.url || "",
        image: result.images?.poster || "",
        isDub: false,
        sources: result.sources
          ? result.sources.map((s: any) => ({
              name: "HNime",
              url: s.url || "",
              id: s.id || "",
            }))
          : [],
        has_multi_servers: result.has_multi_servers || false,
        isEnglishServer: true,
      }
    })

    return NextResponse.json({
      ok: true,
      items,
      source: "https://aw-au-as-api.vercel.app/api/en/search",
      unified: true,
      isEnglish: true,
    })
  } catch (e: any) {
    console.error("[v0] EN search error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante la ricerca inglese" },
      { status: 500 },
    )
  }
}
