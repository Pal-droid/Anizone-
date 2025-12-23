import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const ANILIST_API_URL = "https://graphql.anilist.co"

// Proxy GraphQL requests to AniList with authentication
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("anilist_token")?.value

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ success: false, error: "AniList API error", data }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error proxying to AniList:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
