import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://yummy-aggie-hachi-api-2-81154aaf.koyeb.app/search/${encodeURIComponent(username)}`,
    )

    if (!response.ok) {
      throw new Error("Failed to search users")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error searching AnimeWorld users:", error)
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 })
  }
}
