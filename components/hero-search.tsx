"use client"

import React, { useState, useEffect, useRef } from "react"
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
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Perform search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query.trim())
      } else {
        setResults([])
        setShowDropdown(false)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, contentType])

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowDropdown(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    setShowDropdown(true)
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
      console.error("Search error:", err)
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
    setShowDropdown(false)
  }

  const handleResultClick = (href: string) => {
    if (!href) return
    let idSegment = href.split("/").filter(Boolean).pop() || href
    const finalUrl =
      contentType === "anime"
        ? `/anime/${obfuscateId(idSegment)}`
        : `/manga/${obfuscateId(idSegment)}`
    console.log("[DEBUG] Navigating to:", finalUrl)
    setShowDropdown(false)
    setTimeout(() => router.push(finalUrl), 50)
  }

  return (
    <div ref={searchRef} className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length > 0 && setShowDropdown(true)}
          placeholder="Es. naruto"
          className="w-full rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm placeholder:text-muted-foreground px-4 py-3 text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
        />
      </form>

      {/* Content Type Switch */}
      <div className="flex justify-center mt-2">
        <div className="inline-flex rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm p-1">
          {["anime", "manga"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type as "anime" | "manga")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-smooth ${
                contentType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-background border border-border/30 rounded-md shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {isLoading ? (
            <li className="px-4 py-2 text-sm text-muted-foreground">Caricamento...</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-muted-foreground">Nessun risultato</li>
          ) : (
            results.map((res, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 px-4 py-2 hover:bg-primary/10 cursor-pointer"
                onClick={() => handleResultClick(res.href)}
              >
                {res.image && (
                  <img
                    src={res.image}
                    alt={res.title}
                    className="w-8 h-10 object-cover rounded"
                  />
                )}
                <span className="text-sm">{res.title}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default HeroSearch