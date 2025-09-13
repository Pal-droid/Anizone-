import { type NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = url

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual", // Handle redirects manually
    })

    // If successful, return the response
    if (response.ok) {
      return response
    }

    // Handle redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header`)
      }

      // Make location absolute if it's relative
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString()
      console.log(`[v0] Following redirect to: ${currentUrl}`)
      continue
    }

    // If not a redirect and not successful, throw error
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  throw new Error("Too many redirects")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing manga ID" }, { status: 400 })
    }

    const decodedId = decodeURIComponent(id)
      .replace(/[^\w\s-]/g, "")
      .trim()

    if (!decodedId) {
      return NextResponse.json({ error: "Invalid manga ID after decoding" }, { status: 400 })
    }

    let mangaUrl: string
    if (decodedId.includes("/")) {
      // ID already contains both manga_id and slug (e.g., "1220/nisekoi")
      mangaUrl = `https://www.mangaworld.cx/manga/${decodedId}`
    } else {
      console.log("[v0] Slug-only ID detected, attempting to find correct manga_id...")

      const searchStrategies = [
        // Strategy 1: Exact keyword search with proper encoding
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId)}`,
        // Strategy 2: Search with cleaned title (remove special characters)
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId.replace(/[-_]/g, " "))}`,
        // Strategy 3: Search with partial title
        `https://www.mangaworld.cx/archive?keyword=${encodeURIComponent(decodedId.split("-")[0])}`,
        // Strategy 4: Try numeric ID if it looks like one
        ...(decodedId.match(/^\d+$/) ? [`https://www.mangaworld.cx/manga/${decodedId}`] : []),
      ]

      let foundUrl = null

      for (const searchUrl of searchStrategies) {
        try {
          console.log("[v0] Trying search strategy:", searchUrl)

          if (!searchUrl || searchUrl.includes("undefined") || searchUrl.includes("null")) {
            console.log("[v0] Skipping invalid search URL")
            continue
          }

          const searchResponse = await fetchWithRedirects(searchUrl)
          const searchHtml = await searchResponse.text()
          const $search = cheerio.load(searchHtml)

          $search(".comics-grid .entry").each((_, element) => {
            const $entry = $search(element)
            const thumbLink = $entry.find("a.thumb")
            const resultUrl = thumbLink.attr("href")
            const resultTitle = thumbLink.attr("title") || $entry.find(".entry-title").text().trim()

            if (resultUrl && resultUrl.includes("/manga/")) {
              // Extract ID and slug from URL like: https://www.mangaworld.cx/manga/3118/kaoru-hana-wa-rin-to-saku
              const urlParts = resultUrl.split("/")
              const mangaIndex = urlParts.findIndex((part) => part === "manga")

              if (mangaIndex !== -1 && urlParts[mangaIndex + 1] && urlParts[mangaIndex + 2]) {
                const extractedId = urlParts[mangaIndex + 1]
                const extractedSlug = urlParts[mangaIndex + 2]

                // Check if this result matches our search term
                const searchTerm = decodedId.toLowerCase().replace(/[-_]/g, " ")
                const titleLower = resultTitle.toLowerCase()
                const slugLower = extractedSlug.toLowerCase().replace(/[-_]/g, " ")

                // Match by slug or title similarity
                if (extractedSlug === decodedId || slugLower.includes(searchTerm) || titleLower.includes(searchTerm)) {
                  foundUrl = `https://www.mangaworld.cx/manga/${extractedId}/${extractedSlug}`
                  console.log("[v0] Found matching manga URL with ID:", foundUrl)
                  return false // Break out of each loop
                }
              }
            }
          })

          if (foundUrl) break // Break out of strategy loop if found
        } catch (searchError) {
          console.log("[v0] Search strategy failed:", searchError)
          continue
        }
      }

      mangaUrl = foundUrl || `https://www.mangaworld.cx/manga/${decodedId}`
    }

    if (!mangaUrl || mangaUrl.endsWith("/manga/") || mangaUrl.includes("undefined")) {
      return NextResponse.json({ error: "Could not construct valid manga URL" }, { status: 400 })
    }

    console.log("[v0] Fetching manga from:", mangaUrl)

    let response: Response
    try {
      response = await fetchWithRedirects(mangaUrl)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Check if it's a 404 error specifically
      if (errorMessage.includes("404")) {
        console.log("[v0] Manga not found (404):", mangaUrl)
        return NextResponse.json(
          {
            error: "Manga not found",
            details: `The manga with ID "${decodedId}" does not exist on MangaWorld.`,
          },
          { status: 404 },
        )
      }

      // For other HTTP errors, re-throw to be handled by the outer catch
      throw error
    }

    const html = await response.text()

    const $ = cheerio.load(html)
    const title = $("h1.entry-title").text().trim() || $("title").text().split(" - ")[0]

    if (!title || title.toLowerCase().includes("not found") || title.toLowerCase().includes("404")) {
      console.log("[v0] Manga page exists but contains no valid content:", mangaUrl)
      return NextResponse.json(
        {
          error: "Manga not found",
          details: `The manga with ID "${decodedId}" does not exist or has been removed.`,
        },
        { status: 404 },
      )
    }

    // Extract basic info
    const image =
      $(".thumb img").attr("src") ||
      $(".entry-thumb img").attr("src") ||
      $(".manga-thumb img").attr("src") ||
      $("div.thumb img.rounded").attr("src")

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
            .replace(/(\d+)\s+\1(?:\s+\1)*/g, "$1")
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

      $(".chapters-wrapper .chapter, .chapter-list .chapter, .chapters-list .chapter").each((_, chapterEl) => {
        const $chapter = $(chapterEl)
        // Look for .chap link first (used in chapters-wrapper), then fallback to any link
        const chapterLink = $chapter.find("a.chap").first() || $chapter.find("a").first()
        let chapterTitle = chapterLink.text().trim()
        const chapterUrl = chapterLink.attr("href")
        // Look for .chap-date first, then fallback to other date selectors
        const chapterDate = $chapter.find(".chap-date, .date, .chapter-date").text().trim()

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
            .replace(/(\d+)\s+\1(?:\s+\1)*/g, "$1")
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

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (errorMessage.includes("404")) {
      return NextResponse.json(
        {
          error: "Manga not found",
          details: "The requested manga does not exist.",
        },
        { status: 404 },
      )
    }

    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "Unable to access the manga due to restrictions.",
        },
        { status: 403 },
      )
    }

    // For all other errors, return 500
    return NextResponse.json(
      {
        error: "Failed to fetch manga metadata",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
