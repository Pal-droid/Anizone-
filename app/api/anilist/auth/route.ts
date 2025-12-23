import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const ANILIST_API_URL = "https://graphql.anilist.co"

// Verify token is valid by fetching user data
async function verifyAniListToken(token: string) {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
          medium
        }
      }
    }
  `

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      return { success: false, error: "Failed to verify token" }
    }

    const data = await response.json()

    if (data.errors) {
      return { success: false, error: "Invalid access token" }
    }

    return { success: true, user: data.data.Viewer }
  } catch (error) {
    console.error("[v0] Error verifying AniList token:", error)
    return { success: false, error: "Network error" }
  }
}

// POST: Login with token
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 })
    }

    // Verify the token
    const verification = await verifyAniListToken(token)

    if (!verification.success) {
      return NextResponse.json({ success: false, error: verification.error }, { status: 401 })
    }

    // Store token in HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set("anilist_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    // Return user data (without token)
    return NextResponse.json({
      success: true,
      user: verification.user,
    })
  } catch (error) {
    console.error("[v0] Error in AniList auth:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET: Check auth status
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("anilist_token")?.value

    if (!token) {
      return NextResponse.json({ success: false, authenticated: false })
    }

    // Verify token is still valid
    const verification = await verifyAniListToken(token)

    if (!verification.success) {
      // Token is invalid, clear cookie
      cookieStore.delete("anilist_token")
      return NextResponse.json({ success: false, authenticated: false })
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: verification.user,
    })
  } catch (error) {
    console.error("[v0] Error checking auth:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Logout
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("anilist_token")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error during logout:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
