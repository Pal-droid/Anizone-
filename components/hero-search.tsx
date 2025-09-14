"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { SearchResultsOverlay } from "./search-results-overlay"
import { obfuscateId } from "@/lib/utils"

interface SearchResult {
  title: string
  href: string
  image?: string
  type?: string
}

export function HeroSearch() {
  const [query, setQuery] = useState("")
  const [contentType, setContentType] = useState<"anime" | "manga">("anime")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchRect, setSearchRect] = useState<DOMRect | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Perform search when query changes
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

  // Close overlay on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowResults(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  // Update search rect for overlay positioning
  useEffect(() => {
    if (showResults && searchRef.current) {
      setSearchRect(searchRef.current.getBoundingClientRect())
    }
  }, [showResults])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setShowResults(true)

    try {
      const params = new URLSearchParams({ keyword: searchQuery })
      const endpoint = contentType === "anime" ? "/api/unified-search" : "/api/manga-search"
      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()

      const previewResults: SearchResult[] =
        contentType === "anime"
          ? (data.items || []).slice(0, 5).map((item: any) => ({
              title: item.title,
              href: item.href,
              image: item.image,
              type: "Anime",
            }))
          : (data.results || []).slice(0, 5).map((item: any) => ({
              title: item.title,
              href: item.url,
              image: item.image,
              type: "Manga",
            }))

      setResults(previewResults)
      console.log("[DEBUG] Search results updated:", previewResults)
    } catch (err) {
      console.error("Search error:", err)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    const params = new URLSearchParams({ keyword: query.trim() })
    const searchPage = contentType === "anime" ? "/search" : "/search-manga"
    const finalUrl = `${searchPage}?${params}`

    console.log("[DEBUG] View All / Submit clicked, navigating to:", finalUrl)

    setShowResults(false)
    router.push(finalUrl)
  }

  const handleResultClick = (href: string) => {
    console.log("[DEBUG] Search result clicked:", { href, contentType })

    if (!href) {
      console.warn("[DEBUG] href is empty, aborting navigation")
      return
    }

    try {
      // Normalize href
      let path = href.replace(/^https?:\/\/[^/]+/, "") // remove domain if present
      path = path.replace(/^\/+/, "") // remove leading slash

      console.log("[DEBUG] Normalized path:", path)

      const segments = path.split("/")
      const idSegment = segments.pop() || path

      console.log("[DEBUG] ID segment extracted:", idSegment)

      const finalUrl =
        contentType === "anime"
          ? `/anime/${obfuscateId(idSegment)}`
          : `/manga/${obfuscateId(idSegment)}`

      console.log("[DEBUG] Final URL to navigate:", finalUrl)

      setShowResults(false)

      setTimeout(() => {
        console.log("[DEBUG] Executing router.push")
        router.push(finalUrl)
      }, 0)
    } catch (error) {
      console.error("[DEBUG] Error processing search result click:", error, { href, contentType })
    }
  }

  return (
    <div ref={searchRef} className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
        <div className="flex-1 min-w-0 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length > 0) setShowResults(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder="Es. naruto"
            className="w-full rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm placeholder:text-muted-foreground px-4 py-3 text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            aria-label="Parola chiave"
          />
        </div>
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

      <SearchResultsOverlay
        isVisible={showResults}
        isLoading={isLoading}
        results={results}
        query={query}
        onResultClick={handleResultClick}
        onViewAll={handleSubmit}
        onClose={() => setShowResults(false)}
        searchRect={searchRect}
      />
    </div>
  )
}

export default HeroSearch