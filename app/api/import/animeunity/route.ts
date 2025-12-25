import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://corsproxy.io?url=https://www.animeunity.so/user/${encodeURIComponent(username)}/animelist`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user animelist")
    }

    const html = await response.text()

    // Extract the records attribute from the anime-list element
    const recordsMatch = html.match(/records="([^"]*)"/)

    if (!recordsMatch) {
      return NextResponse.json({ error: "No anime list found" }, { status: 404 })
    }

    // Decode HTML entities
    const decoded = recordsMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")

    try {
      const records = JSON.parse(decoded)
      return NextResponse.json({ records })
    } catch (parseError) {
      console.error("Error parsing AnimeUnity records:", parseError)
      return NextResponse.json({ error: "Failed to parse anime list" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error fetching AnimeUnity list:", error)
    return NextResponse.json({ error: "Failed to fetch anime list" }, { status: 500 })
  }
}
