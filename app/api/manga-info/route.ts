import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing manga ID" }, { status: 400 })
    }

    let mangaUrl: string
    if (id.includes("/")) {
      // ID already contains both manga_id and slug (e.g., "1220/nisekoi")
      mangaUrl = `https://www.mangaworld.cx/manga/${id}`
    } else {
      // ID is just a slug, try to find the correct manga_id by searching first
      console.log("[v0] Slug-only ID detected, attempting to find correct manga_id...")
      const searchUrl = `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(id)}`

      try {
        const searchResponse = await fetch(searchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        })

        if (searchResponse.ok) {
          const searchHtml = await searchResponse.text()
          const $search = cheerio.load(searchHtml)

          // Look for the first manga result that matches our slug
          const firstResult = $search(".comics-grid .entry a.thumb").first()
          const resultUrl = firstResult.attr("href")

          if (resultUrl && resultUrl.includes("/manga/")) {
            // Extract the manga_id/slug from the search result URL
            const urlParts = resultUrl.split("/manga/")
            if (urlParts.length > 1) {
              const mangaPath = urlParts[1].replace(/\/$/, "") // Remove trailing slash
              mangaUrl = `https://www.mangaworld.cx/manga/${mangaPath}`
              console.log("[v0] Found manga URL from search:", mangaUrl)
            } else {
              // Fallback to original slug-only format
              mangaUrl = `https://www.mangaworld.cx/manga/${id}`
            }
          } else {
            // Fallback to original slug-only format
            mangaUrl = `https://www.mangaworld.cx/manga/${id}`
          }
        } else {
          // Fallback to original slug-only format
          mangaUrl = `https://www.mangaworld.cx/manga/${id}`
        }
      } catch (searchError) {
        console.log("[v0] Search failed, using slug-only format:", searchError)
        mangaUrl = `https://www.mangaworld.cx/manga/${id}`
      }
    }

    console.log("[v0] Fetching manga from:", mangaUrl)

    const response = await fetch(mangaUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.log("[v0] Failed to fetch manga:", response.status)
      return NextResponse.json({ error: `HTTP error! status: ${response.status}` }, { status: response.status })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract basic info
    const title = $("h1.entry-title").text().trim() || $("title").text().split(" - ")[0]
    const image = $(".entry-thumb img").attr("src") || $(".manga-thumb img").attr("src")
    const type = $(".manga-type a").text().trim()
    const status = $(".manga-status a").text().trim()
    const author = $(".manga-author a").text().trim()
    const artist = $(".manga-artist a").text().trim()
    const year = $(".manga-year").text().trim()
    const genres = $(".manga-genres a")
      .map((_, el) => $(el).text().trim())
      .get()

    // Extract trama (plot) - Using proper Cheerio selectors for trama extraction
    let trama = ""
    const tramaHeading = $('.heading:contains("TRAMA")')
    if (tramaHeading.length > 0) {
      const tramaContent = tramaHeading.next("#noidungm")
      trama = tramaContent.text().trim()
    }

    // Fallback trama extraction methods
    if (!trama) {
      trama = $("#noidungm").text().trim()
    }
    if (!trama) {
      trama = $(".manga-summary").text().trim()
    }
    if (!trama) {
      trama = $(".entry-content p").first().text().trim()
    }

    // Extract chapters - Using proper Cheerio selectors for chapter list extraction
    const volumes = []
    $(".volume-element").each((_, volumeEl) => {
      const $volume = $(volumeEl)
      const volumeName = $volume.find(".volume-name").text().trim()
      const volumeImage = $volume.find("[data-volume-image]").attr("data-volume-image")

      const chapters = []
      $volume.find(".volume-chapters .chapter").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        const chapterLink = $chapter.find(".chap")
        let chapterTitle = chapterLink.text().trim()
        const chapterUrl = chapterLink.attr("href")
        const chapterDate = $chapter.find(".chap-date").text().trim()
        const isNew = $chapter.find('img[alt="Nuovo"]').length > 0

        if (chapterTitle) {
          chapterTitle = chapterTitle
            .replace(
              /\s*-?\s*\d{1,2}\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}.*$/i,
              "",
            )
            // Remove numeric date patterns like "- 12/08/2024" or "(12/08/2024)"
            .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, "")
            .replace(/\s*$$\d{1,2}\/\d{1,2}\/\d{4}$$.*$/, "")
            // Remove any trailing dates or timestamps
            .replace(
              /\s+\d{1,2}\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}.*$/i,
              "",
            )
            // Clean up chapter numbering issues - fix "0109" to "01"
            .replace(/Capitolo\s+(\d)(\d{3})\b/, "Capitolo $1$2")
            .replace(/Capitolo\s+0*(\d+)\d{2}(\d{2})\b/, "Capitolo $1")
            // Clean up any duplicate numbers that might result from poor parsing
            .replace(/(\d+)\s*\1+/g, "$1")
            .trim()
        }

        if (chapterTitle && chapterUrl) {
          chapters.push({
            title: chapterTitle,
            url: chapterUrl,
            date: chapterDate,
            isNew,
          })
        }
      })

      if (volumeName) {
        volumes.push({
          name: volumeName,
          image: volumeImage,
          chapters,
        })
      }
    })

    // If no volumes found, try alternative chapter extraction
    if (volumes.length === 0) {
      const chapters = []
      $(".chapter-list .chapter, .chapters-list .chapter").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        const chapterLink = $chapter.find("a").first()
        let chapterTitle = chapterLink.text().trim()
        const chapterUrl = chapterLink.attr("href")
        const chapterDate = $chapter.find(".date, .chapter-date").text().trim()

        if (chapterTitle) {
          chapterTitle = chapterTitle
            .replace(
              /\s*-?\s*\d{1,2}\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}.*$/i,
              "",
            )
            .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, "")
            .replace(/\s*$$\d{1,2}\/\d{1,2}\/\d{4}$$.*$/, "")
            .replace(
              /\s+\d{1,2}\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}.*$/i,
              "",
            )
            .replace(/Capitolo\s+(\d)(\d{3})\b/, "Capitolo $1$2")
            .replace(/Capitolo\s+0*(\d+)\d{2}(\d{2})\b/, "Capitolo $1")
            .replace(/(\d+)\s*\1+/g, "$1")
            .trim()
        }

        if (chapterTitle && chapterUrl) {
          chapters.push({
            title: chapterTitle,
            url: chapterUrl,
            date: chapterDate,
            isNew: false,
          })
        }
      })

      if (chapters.length > 0) {
        volumes.push({
          name: "Chapters",
          chapters,
        })
      }
    }

    const mangaData = {
      title,
      image,
      type,
      status,
      author,
      artist,
      year,
      genres,
      trama,
      volumes,
      url: mangaUrl,
    }

    console.log("[v0] Successfully scraped manga data:", { title, volumeCount: volumes.length })
    return NextResponse.json(mangaData)
  } catch (error) {
    console.error("[v0] Error fetching manga metadata:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch manga metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
