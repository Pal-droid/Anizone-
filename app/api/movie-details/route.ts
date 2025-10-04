import { type NextRequest, NextResponse } from "next/server"
import { load } from "cheerio"

const BASE_URL = "https://filmsenzalimiti.food"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ ok: false, error: "URL parameter missing" }, { status: 400 })
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Failed to fetch movie details" }, { status: response.status })
    }

    const html = await response.text()
    const $ = load(html)

    // Check if it's a movie or series
    const isSeries = $(".tt_series").length > 0

    if (isSeries) {
      // Parse series with seasons and episodes
      const seasons: any[] = []

      $(".tab-pane").each((_, seasonEl) => {
        const seasonId = $(seasonEl).attr("id")
        const seasonNumber = seasonId?.match(/season-(\d+)/)?.[1]

        if (!seasonNumber) return

        const episodes: any[] = []

        $(seasonEl)
          .find("li")
          .each((_, epEl) => {
            const epLink = $(epEl).find("a").first()
            const epNum = epLink.attr("data-num")
            const epTitle = epLink.attr("data-title")

            const servers: any[] = []
            $(epEl)
              .find(".mirrors2 a.mr")
              .each((_, serverEl) => {
                const serverName = $(serverEl).text().trim()
                const serverLink = $(serverEl).attr("data-link")

                if (serverLink && serverName) {
                  servers.push({
                    name: serverName,
                    url: serverLink.startsWith("//") ? `https:${serverLink}` : serverLink,
                  })
                }
              })

            if (epNum && servers.length > 0) {
              episodes.push({
                number: epNum,
                title: epTitle || `Episode ${epNum}`,
                servers,
              })
            }
          })

        if (episodes.length > 0) {
          seasons.push({
            season: Number.parseInt(seasonNumber),
            episodes,
          })
        }
      })

      return NextResponse.json({
        ok: true,
        type: "series",
        seasons,
      })
    } else {
      // Parse movie - get the iframe src first
      const iframeSrc = $("iframe[src*='mostraguarda']").attr("src")

      if (!iframeSrc) {
        return NextResponse.json({ ok: false, error: "No video source found" }, { status: 404 })
      }

      // Fetch the mostraguarda page to get server links
      const movieUrl = iframeSrc.startsWith("//") ? `https:${iframeSrc}` : iframeSrc
      const movieResponse = await fetch(movieUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      const movieHtml = await movieResponse.text()
      const $movie = load(movieHtml)

      const servers: any[] = []
      $movie("._player-mirrors li").each((_, serverEl) => {
        const serverName = $movie(serverEl).text().trim()
        const serverLink = $movie(serverEl).attr("data-link")

        if (serverLink && serverName) {
          servers.push({
            name: serverName,
            url: serverLink.startsWith("//") ? `https:${serverLink}` : serverLink,
          })
        }
      })

      return NextResponse.json({
        ok: true,
        type: "movie",
        servers,
      })
    }
  } catch (e: any) {
    console.error("[v0] Movie details error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch details" }, { status: 500 })
  }
}
