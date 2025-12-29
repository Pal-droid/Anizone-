interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 20, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.limits.get(identifier)

    // Clean up old entry if window has passed
    if (entry && now >= entry.resetTime) {
      this.limits.delete(identifier)
    }

    const current = this.limits.get(identifier)

    if (!current) {
      // First request in this window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      }
    }

    if (current.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      }
    }

    // Increment count
    current.count++
    this.limits.set(identifier, current)

    return {
      allowed: true,
      remaining: this.maxRequests - current.count,
      resetTime: current.resetTime,
    }
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key)
      }
    }
  }
}

// Create a global rate limiter instance
export const anilistRateLimiter = new RateLimiter(20, 60000)

// Clean up every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    anilistRateLimiter.cleanup()
  }, 300000)
}
