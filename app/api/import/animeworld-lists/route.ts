import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://yummy-aggie-hachi-api-2-81154aaf.koyeb.app/scrape/${encodeURIComponent(userId)}`,
    )

    if (!response.ok) {
      throw new Error("Failed to fetch user lists")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching AnimeWorld lists:", error)
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 })
  }
}
