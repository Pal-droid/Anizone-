import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hiId = searchParams.get("HI")

    if (!hiId) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'HI' mancante" },
        { status: 400 },
      )
    }

    const apiUrl = `https://aw-au-as-api.vercel.app/api/en/episodes?HI=${encodeURIComponent(hiId)}`
    console.log("[v0] EN episodes API calling:", apiUrl)

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.warn("[v0] EN episodes API failed:", res.status, errorText)
      return NextResponse.json({ ok: false, error: `English episodes failed: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    console.log("[v0] EN episodes API returned", data.length, "episodes")

    // Transform to our internal episodes format
    const episodes = data.map((ep: any) => {
      const hiSource = ep.sources?.HiAnime

      return {
        num: ep.episode_number,
        href: hiSource?.url || "",
        id: hiSource?.id || "",
        sources: {
          HNime: hiSource
            ? {
                available: hiSource.available || false,
                url: hiSource.url || "",
                id: hiSource.id || "",
              }
            : { available: false },
        },
      }
    })

    return NextResponse.json({
      ok: true,
      episodes,
      source: "https://aw-au-as-api.vercel.app/api/en/episodes",
      unified: true,
      isEnglish: true,
    })
  } catch (e: any) {
    console.error("[v0] EN episodes error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore durante il recupero episodi inglesi" },
      { status: 500 },
    )
  }
}
