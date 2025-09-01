"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { SearchResultsOverlay } from "./search-results-overlay"

interface SearchResult {
  title: string
  href: string
  image?: string
  type?: string
}

export function HeroSearch() {
  const [query, setQuery] = useState("")
  const [contentType, setContentType] = useState("anime")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchRect, setSearchRect] = useState<DOMRect | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query.trim())
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, contentType])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    if (showResults && searchRef.current) {
      setSearchRect(searchRef.current.getBoundingClientRect())
    }
  }, [showResults])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setShowResults(true)
    try {
      const params = new URLSearchParams({
        keyword: searchQuery,
      })

      const endpoint = contentType === "anime" ? "/api/unified-search" : "/api/manga-search"
      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      let previewResults: SearchResult[] = []

      if (contentType === "anime") {
        previewResults = (data.items || []).slice(0, 5).map((item: any) => ({
          title: item.title,
          href: item.href,
          image: item.image,
          type: "Anime",
        }))
      } else {
        previewResults = (data.results || []).slice(0, 5).map((item: any) => ({
          title: item.title,
          href: item.url,
          image: item.image,
          type: "Manga",
        }))
      }

      setResults(previewResults)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      const params = new URLSearchParams({
        keyword: query.trim(),
      })
      const searchPage = contentType === "anime" ? "/search" : "/search-manga"
      router.push(`${searchPage}?${params}`)
      setShowResults(false)
    }
  }

  const handleResultClick = (href: string) => {
    console.log("[v0] Result clicked:", { href, contentType })

    try {
      if (contentType === "anime") {
        // For anime, extract path from href and redirect to watch page
        let path: string
        if (href.startsWith("http")) {
          path = new URL(href).pathname
        } else {
          path = href.startsWith("/") ? href : `/${href}`
        }
        console.log("[v0] Anime redirect path:", path)
        router.push(`/watch?path=${encodeURIComponent(path)}`)
      } else {
        // For manga, redirect to manga info page
        let path: string
        if (href.startsWith("http")) {
          path = new URL(href).pathname
        } else {
          path = href.startsWith("/") ? href : `/${href}`
        }
        console.log("[v0] Manga redirect path:", path)
        router.push(`/manga${path}`)
      }
    } catch (error) {
      console.error("[v0] Error parsing href:", error, { href, contentType })
      // Fallback: try to use href as-is
      if (contentType === "anime") {
        router.push(`/watch?path=${encodeURIComponent(href)}`)
      } else {
        router.push(`/manga/${href}`)
      }
    }

    setShowResults(false)
  }

  return (
    <>
      <div ref={searchRef} className="relative space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
          <div className="flex-1 min-w-0 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length > 2) {
                  setShowResults(true)
                } else if (query.trim().length > 0) {
                  setShowResults(true)
                }
              }}
              placeholder="Es. naruto"
              className="w-full rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm placeholder:text-muted-foreground px-4 py-3 text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              aria-label="Parola chiave"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-primary text-primary-foreground text-sm font-medium px-6 py-3 shrink-0 whitespace-nowrap transition-smooth hover:bg-primary/90 hover:glow flex items-center gap-2"
            aria-label="Cerca"
          >
            <Search size={16} />
            Cerca
          </button>
        </form>

        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm p-1">
            <button
              type="button"
              onClick={() => setContentType("anime")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-smooth ${
                contentType === "anime"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              }`}
            >
              Anime
            </button>
            <button
              type="button"
              onClick={() => setContentType("manga")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-smooth ${
                contentType === "manga"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              }`}
            >
              Manga
            </button>
          </div>
        </div>
      </div>

      <SearchResultsOverlay
        isVisible={showResults}
        isLoading={isLoading}
        results={results}
        query={query}
        onResultClick={handleResultClick}
        onViewAll={handleSubmit}
        onClose={() => setShowResults(false)} // Added onClose handler to close overlay when clicking backdrop
        searchRect={searchRect}
      />
    </>
  )
}

export default HeroSearch
