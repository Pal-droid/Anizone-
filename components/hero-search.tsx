"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
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

  // Fetch search results
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

  // Close dropdown on outside click or Escape
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

  // Update dropdown position
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

      console.log("[DEBUG] Search results updated:", previewResults)
      setResults(previewResults)
    } catch (err) {
      console.error("[DEBUG] Search error:", err)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams({ keyword: query.trim() })
    const searchPage = contentType === "anime" ? "/search" : "/search-manga"
    router.push(`${searchPage}?${params}`)
    setShowResults(false)
  }

  const handleResultClick = (href: string) => {
    if (!href) return

    let idSegment = href.split("/").filter(Boolean).pop() || href

    if (contentType === "anime") {
      // Direct to watch page
      const watchUrl = `/watch?path=${encodeURIComponent(`/play/${idSegment}/episode-1`)}`
      console.log("[DEBUG] Anime result clicked, redirecting to watch page:", watchUrl)
      setShowResults(false)
      setTimeout(() => router.push(watchUrl), 0)
    } else {
      // Manga goes to meta page
      const mangaUrl = `/manga/${obfuscateId(idSegment)}`
      console.log("[DEBUG] Manga result clicked, redirecting to meta page:", mangaUrl)
      setShowResults(false)
      setTimeout(() => router.push(mangaUrl), 0)
    }
  }

  // Dropdown portal rendering
  const dropdown = showResults && searchRect
    ? createPortal(
        <div
          className="absolute z-[9999] w-[300px] bg-background border border-border rounded-md shadow-lg overflow-hidden"
          style={{ top: searchRect.bottom + window.scrollY + 4, left: searchRect.left + window.scrollX }}
        >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
          ) : results.length > 0 ? (
            results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 hover:bg-accent/20 cursor-pointer"
                onClick={() => handleResultClick(r.href)}
              >
                {r.image && <img src={r.image} alt={r.title} className="w-10 h-14 object-cover rounded" />}
                <div className="flex flex-col">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs text-muted-foreground">{r.type}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">Nessun risultato</div>
          )}
        </div>,
        document.body
      )
    : null

  return (
    <div ref={searchRef} className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
        <div className="flex-1 min-w-0 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length > 0 && setShowResults(true)}
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

      {dropdown}
    </div>
  )
}

export default HeroSearch