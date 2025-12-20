import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    console.error("[v0] AniList OAuth error:", error)
    return NextResponse.redirect(new URL("/?auth=error", req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing", req.url))
  }

  // Redirect to client-side with code
  return NextResponse.redirect(new URL(`/?code=${code}`, req.url))
}
