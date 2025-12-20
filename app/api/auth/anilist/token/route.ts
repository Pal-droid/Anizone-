import { type NextRequest, NextResponse } from "next/server"
import { ANILIST_CONFIG } from "@/lib/anilist"

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 })
    }

    const redirectUri =
      process.env.NODE_ENV === "production"
        ? `${req.nextUrl.origin}/api/auth/anilist/callback`
        : "http://localhost:3000/api/auth/anilist/callback"

    // Exchange code for access token
    const response = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: ANILIST_CONFIG.CLIENT_ID,
        client_secret: ANILIST_CONFIG.CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] AniList token exchange failed:", error)
      return NextResponse.json({ error: "Failed to exchange code for token" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ access_token: data.access_token })
  } catch (error) {
    console.error("[v0] Token exchange error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
