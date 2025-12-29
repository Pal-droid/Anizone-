interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

class AniListCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly defaultTTL: number = 5 * 60 * 1000 // 5 minutes default

  private generateKey(query: string, variables?: any): string {
    return `${query}:${JSON.stringify(variables || {})}`
  }

  get(query: string, variables?: any): any | null {
    const key = this.generateKey(query, variables)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    console.log("[v0] Cache hit for AniList query")
    return entry.data
  }

  set(query: string, data: any, variables?: any, ttl?: number): void {
    const key = this.generateKey(query, variables)
    const now = Date.now()

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
    })

    console.log("[v0] Cached AniList response")
  }

  clear(): void {
    this.cache.clear()
    console.log("[v0] Cleared AniList cache")
  }

  clearForUser(userId: number): void {
    // Clear all cache entries that contain this user ID
    for (const [key, _] of this.cache.entries()) {
      if (key.includes(`"userId":${userId}`)) {
        this.cache.delete(key)
      }
    }
    console.log("[v0] Cleared AniList cache for user:", userId)
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log("[v0] Cleaned up", cleaned, "expired cache entries")
    }
  }
}

// Create global cache instance (only on server)
export const anilistCache = typeof window === "undefined" ? new AniListCache() : null

// Clean up every 10 minutes on server
if (typeof window === "undefined" && anilistCache) {
  setInterval(() => {
    anilistCache.cleanup()
  }, 600000)
}
