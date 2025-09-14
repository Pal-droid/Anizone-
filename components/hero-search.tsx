"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
        let animeId: string
        if (href.startsWith("http")) {
          const url = new URL(href)
          animeId = url.pathname.split("/").pop() || url.pathname
        } else {
          animeId = href.startsWith("/") ? href.substring(1) : href
          // Remove any leading path segments
          animeId = animeId.split("/").pop() || animeId
        }
        console.log("[v0] Anime ID extracted:", animeId)
        const finalUrl = `/anime/${obfuscateId(animeId)}`
        console.log("[v0] Final anime URL:", finalUrl)
        router.push(finalUrl)
      } else {
        let mangaId: string
        if (href.startsWith("http")) {
          const url = new URL(href)
          mangaId = url.pathname.split("/").pop() || url.pathname
        } else {
          mangaId = href.startsWith("/") ? href.substring(1) : href
          // Remove any leading path segments
          mangaId = mangaId.split("/").pop() || mangaId
        }
        console.log("[v0] Manga ID extracted:", mangaId)
        const finalUrl = `/manga/${obfuscateId(mangaId)}`
        console.log("[v0] Final manga URL:", finalUrl)
        router.push(finalUrl)
      }
    } catch (error) {
      console.error("[v0] Error parsing href:", error, { href, contentType })
      // Fallback: try to use href as-is with obfuscation
      if (contentType === "anime") {
        const fallbackUrl = `/anime/${obfuscateId(href)}`
        console.log("[v0] Fallback anime URL:", fallbackUrl)
        router.push(fallbackUrl)
      } else {
        const fallbackUrl = `/manga/${obfuscateId(href)}`
        console.log("[v0] Fallback manga URL:", fallbackUrl)
        router.push(fallbackUrl)
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
