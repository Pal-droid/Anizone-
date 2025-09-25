// Force Node runtime so https.Agent works
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import https from "https"
import axios from "axios"

export async function GET() {
  try {
    // Custom HTTPS agent to disable SSL verification
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    })

    // Fetch page using axios
    const { data: html } = await axios.get("https://www.animeworld.ac/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      httpsAgent,
      maxRedirects: 5, // follow redirects
    })

    // Debug log first 500 characters
    console.log("Fetched HTML (first 500 chars):", html.slice(0, 500))

    const $ = cheerio.load(html)
    const upcomingAnime: any[] = []

    // Find the "Uscite Autunno 2025" section
    $(".widget-title").each((_, titleElement) => {
      const titleText = $(titleElement).find(".title").text().trim()
      if (titleText.includes("Uscite Autunno 2025") || titleText.includes("Autunno 2025")) {
        const widgetBody = $(titleElement).next(".widget-body")

        widgetBody.find(".owl-item .item").each((_, element) => {
          const $item = $(element)
          const $inner = $item.find(".inner")
          const $poster = $inner.find(".poster")
          const $nameLink = $inner.find(".name")

          const href = $poster.attr("href")
          const imgSrc = $poster.find("img").attr("src")
          const title = $nameLink.attr("title") || $nameLink.text().trim()
          const japaneseTitle = $nameLink.attr("data-jtitle") || ""

          const $status = $poster.find(".status")
          const isDub = $status.find(".dub").length > 0
          const isOna = $status.find(".ona").length > 0

          if (href && imgSrc && title) {
            upcomingAnime.push({
              id: href.split("/").pop()?.split(".")[0] || "",
              title,
              japaneseTitle,
              image: imgSrc.startsWith("http") ? imgSrc : `https://img.animeworld.ac${imgSrc}`,
              url: href.startsWith("http") ? href : `https://www.animeworld.ac${href}`,
              isDub,
              isOna,
              type: "upcoming",
            })
          }
        })
      }
    })

    // Fallback if no items found in the specific section
    if (upcomingAnime.length === 0) {
      $(".owl-stage .owl-item .item").each((_, element) => {
        const $item = $(element)
        const $inner = $item.find(".inner")
        const $poster = $inner.find(".poster")
        const $nameLink = $inner.find(".name")

        const href = $poster.attr("href")
        const imgSrc = $poster.find("img").attr("src")
        const title = $nameLink.attr("title") || $nameLink.text().trim()
        const japaneseTitle = $nameLink.attr("data-jtitle") || ""

        const $status = $poster.find(".status")
        const isDub = $status.find(".dub").length > 0
        const isOna = $status.find(".ona").length > 0
        const episodeText = $status.find(".ep").text().trim()

        if (href && imgSrc && title && !episodeText) {
          upcomingAnime.push({
            id: href.split("/").pop()?.split(".")[0] || "",
            title,
            japaneseTitle,
            image: imgSrc.startsWith("http") ? imgSrc : `https://img.animeworld.ac${imgSrc}`,
            url: href.startsWith("http") ? href : `https://www.animeworld.ac${href}`,
            isDub,
            isOna,
            type: "upcoming",
          })
        }
      })
    }

    const uniqueAnime = upcomingAnime
      .filter((anime, index, self) => index === self.findIndex((a) => a.id === anime.id))
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      data: uniqueAnime,
      count: uniqueAnime.length,
    })
  } catch (error) {
    console.error("Error fetching upcoming fall 2025 anime:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch upcoming anime",
        data: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}