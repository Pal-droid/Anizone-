"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function HeroSearch() {
  const [query, setQuery] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  // Check for search error from URL params
  useEffect(() => {
    const searchError = searchParams.get("error")
    if (searchError) {
      setError(decodeURIComponent(searchError))
    }
  }, [searchParams, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      const params = new URLSearchParams({
        keyword: query.trim(),
      })
      router.push(`/search?${params}`)
    } else {
      // Show error for empty query - don't clear existing errors
      setError("La ricerca deve contenere almeno 2 caratteri. Inserisci una parola chiave più lunga.")
    }
  }

  return (
    <div className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
        <div className="flex-1 min-w-0 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder="Es. naruto"
            className="w-full rounded-lg border border-border/30 glass placeholder:text-muted-foreground px-4 py-3 text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            aria-label="Parola chiave"
          />
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-sm mt-2 text-center bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

    </div>
  )
}

export default HeroSearch
