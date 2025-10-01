import * as cheerio from "cheerio"

export async function GET() {
  try {
    const res = await fetch("https://www.mangaworld.cx/")
    const html = await res.text()
    const $ = cheerio.load(html)

    const mangas: {
      rank: number
      id: string
      title: string
      image: string
      type: string
      status: string
      views: string
      url: string
    }[] = []

    $(".top-wrapper .entry").each((i, el) => {
      const rank = parseInt($(el).find(".indi").first().text().trim()) || i + 1
      const title = $(el).find(".long .name").first().text().trim()
      const url = $(el).find(".long a").first().attr("href") || ""
      const idMatch = url.match(/\/manga\/(\d+)\//)
      const id = idMatch ? idMatch[1] : `${i}`

      const image = $(el).find(".thumb img").attr("src") || ""
      const type = $(el).find(".content").text().match(/Tipo:\s*(\w+)/)?.[1] || "N/A"
      const status = $(el).find(".content").text().match(/Stato:\s*(\w+)/)?.[1] || "N/A"
      const views = $(el).find(".content").text().match(/Letto:\s*([\d.]+ volte)/)?.[1] || "0 volte"

      mangas.push({
        rank,
        id,
        title,
        image,
        type,
        status,
        views,
        url,
      })
    })

    return new Response(JSON.stringify({ ok: true, mangas }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Scraping error:", error)
    return new Response(JSON.stringify({ ok: false, error: "Scraping failed" }), { status: 500 })
  }
}