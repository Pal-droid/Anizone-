import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { anilistRateLimiter } from "@/lib/rate-limiter"
import { anilistCache } from "@/lib/anilist-cache"

const ANILIST_API_URL = "https://graphql.anilist.co"

// Proxy GraphQL requests to AniList with authentication, rate limiting, and caching
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("anilist_token")?.value

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const rateLimitResult = anilistRateLimiter.checkLimit(token)

    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      console.log("[v0] Rate limit exceeded for user, reset in", resetInSeconds, "seconds")

      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          rateLimited: true,
          resetInSeconds,
          message: `Troppe richieste. Riprova tra ${resetInSeconds} secondi.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        },
      )
    }

    const body = await request.json()
    const { query, variables } = body

    const isMutation = query.trim().toLowerCase().startsWith("mutation")

    if (!isMutation && anilistCache) {
      const cachedData = anilistCache.get(query, variables)
      if (cachedData) {
        console.log("[v0] Returning cached AniList response")
        return NextResponse.json(cachedData, {
          headers: {
            "X-Cache": "HIT",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        })
      }
    }

    console.log("[v0] Making AniList API request, remaining:", rateLimitResult.remaining)
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

    if (!isMutation && anilistCache && !data.errors) {
      // Cache user lists for 5 minutes, other queries for 10 minutes
      const ttl = query.includes("MediaListCollection") ? 300000 : 600000
      anilistCache.set(query, data, variables, ttl)
    }

    if (isMutation && anilistCache && variables?.userId) {
      anilistCache.clearForUser(variables.userId)
    }

    return NextResponse.json(data, {
      headers: {
        "X-Cache": "MISS",
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    })
  } catch (error) {
    console.error("[v0] Error proxying to AniList:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
