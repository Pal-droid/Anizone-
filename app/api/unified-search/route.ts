import { type NextRequest, NextResponse } from "next/server"
import { buildFilterUrl, parseSearch } from "@/lib/animeworld"

type UnifiedSource = {
  name: string
  url: string
  id: string
}

type UnifiedResult = {
  title: string
  description?: string
  images: {
    poster?: string
    cover?: string
  }
  sources: UnifiedSource[]
  has_multi_servers: boolean
}

async function enrichWithAnimePaheMetadata(results: UnifiedResult[]) {
  const enrichedResults = await Promise.all(
    results.map(async (result) => {
      // Find AnimePahe source if available
      const animePaheSource = result.sources.find((s) => s.name === "AnimePahe")

      if (animePaheSource && animePaheSource.id) {
        try {
          console.log("[v0] Fetching AnimePahe metadata for:", result.title, "ID:", animePaheSource.id)

          const response = await fetch(
            `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/animepahe-metadata?id=${animePaheSource.id}`,
            {
              next: { revalidate: 3600 },
            },
          )

          if (response.ok) {
            const metaData = await response.json()
            if (metaData.ok && metaData.data) {
              console.log("[v0] Successfully enriched", result.title, "with AniList ID:", metaData.data.ids.anilist)
              return {
                ...result,
                anilistId: metaData.data.ids.anilist ? Number(metaData.data.ids.anilist) : undefined,
                animepaheId: metaData.data.ids.animepahe_id,
                metadata: {
                  episodes: metaData.data.episodes,
                  status: metaData.data.status,
                  season: metaData.data.season,
                  studio: metaData.data.studio,
                  synopsis: metaData.data.synopsis,
                },
              }
            }
          }
        } catch (error) {
          console.warn("[v0] Failed to fetch AnimePahe metadata for:", result.title, error)
        }
      }

      return result
    }),
  )

  return enrichedResults
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get("keyword")
    const dubParam = searchParams.get("dub")

    if (!keyword) {
      return NextResponse.json({ ok: false, error: "Parametro 'keyword' mancante" }, { status: 400 })
    }

    const allParams = Array.from(searchParams.entries())
    const hasFilters = allParams.some(([key, value]) => {
      if (key === "keyword" || key === "dub") return false
      return value && value.trim() !== "" && value !== "any"
    })

    console.log("Search params:", Object.fromEntries(searchParams.entries()))
    console.log("Has filters (excluding dub):", hasFilters)
    console.log("Dub param:", dubParam)

    if (hasFilters) {
      console.log("Using regular search due to filters")
      // Fall back to regular search if filters are applied
      const params: Record<string, string | string[]> = {}
      for (const [k, v] of searchParams.entries()) {
        const existing = params[k]
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(v)
          } else {
            params[k] = [existing, v]
          }
        } else {
          params[k] = v
        }
      }

      const target = buildFilterUrl(params)
      const res = await fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        next: { revalidate: 300 },
      })
      const html = await res.text()
      const items = parseSearch(html)
      return NextResponse.json({ ok: true, items, source: target, unified: false })
    }

    // Try unified search for pure keyword searches (with optional dub filter)
    console.log("Trying unified search for keyword:", keyword, "with dub filter:", dubParam)
    try {
      const unifiedRes = await fetch(`https://aw-au-as-api.vercel.app/api/search?q=${encodeURIComponent(keyword)}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (unifiedRes.ok) {
        const unifiedData: UnifiedResult[] = await unifiedRes.json()
        console.log("Unified API response:", unifiedData.length, "results")

        const enrichedData = await enrichWithAnimePaheMetadata(unifiedData)

        // Transform unified results to our format
        let items = enrichedData.map((result) => {
          const animeWorldSource = result.sources.find((s) => s.name === "AnimeWorld")
          const primaryUrl = animeWorldSource?.url || result.sources[0]?.url || ""

          console.log(
            "Result:",
            result.title,
            "has_multi_servers:",
            result.has_multi_servers,
            "sources:",
            result.sources.map((s) => s.name),
          )

          return {
            title: result.title,
            href: primaryUrl,
            image: result.images.poster || result.images.cover || "",
            isDub: result.title.includes("(ITA)"),
            sources: result.sources,
            has_multi_servers: result.has_multi_servers,
            description: result.description,
            anilistId: result.anilistId,
            animepaheId: result.animepaheId,
            metadata: result.metadata,
          }
        })

        if (dubParam === "0") {
          // Sub only - exclude titles with "(ITA)"
          console.log("Filtering for SUB only (excluding ITA)")
          items = items.filter((item) => !item.title.includes("(ITA)"))
        } else if (dubParam === "1") {
          // Dub only - only titles with "(ITA)"
          console.log("Filtering for DUB only (ITA only)")
          items = items.filter((item) => item.title.includes("(ITA)"))
        }
        // For "any"/tutti or no dub param, show all results

        console.log("Transformed items after dub filter:", items.length)
        return NextResponse.json({
          ok: true,
          items,
          source: "https://aw-au-as-api.vercel.app/api/search",
          unified: true,
        })
      } else {
        console.log("Unified API failed with status:", unifiedRes.status)
      }
    } catch (unifiedError) {
      console.warn("Unified search failed, falling back to AnimeWorld:", unifiedError)
    }

    // Fallback to regular AnimeWorld search
    console.log("Using fallback AnimeWorld search")
    const target = `https://www.animeworld.ac/search?keyword=${encodeURIComponent(keyword)}`
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      next: { revalidate: 300 },
    })
    const html = await res.text()
    const items = parseSearch(html)
    return NextResponse.json({ ok: true, items, source: target, unified: false })
  } catch (e: any) {
    console.error("Search error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Errore durante la ricerca unificata" }, { status: 500 })
  }
}
