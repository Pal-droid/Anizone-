"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })
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

  // Update dropdown position
  useEffect(() => {
    if (showDropdown && searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect()
      setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
    }
  }, [showDropdown, query])

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

    setShowDropdown(false)

    setTimeout(() => {
      router.push(finalUrl)
    }, 0)
  }

  // Dropdown JSX rendered via portal
  const dropdown = showDropdown ? createPortal(
    <ul
      className="absolute bg-background border border-border/30 rounded-md shadow-lg overflow-hidden max-h-80 overflow-y-auto z-[1000]"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      {isLoading && <li className="p-2 text-center text-muted-foreground">Loading...</li>}
      {!isLoading && results.length === 0 && <li className="p-2 text-center text-muted-foreground">Nessun risultato</li>}
      {!isLoading &&
        results.map((item, index) => (
          <li
            key={index}
            onClick={() => handleResultClick(item.href)}
            className="p-2 hover:bg-primary/10 cursor-pointer flex items-center gap-2"
          >
            {item.image && <img src={item.image} alt={item.title} className="w-8 h-10 object-cover rounded" />}
            <span>{item.title}</span>
          </li>
        ))}
    </ul>,
    document.body
  ) : null

  return (
    <div ref={searchRef} className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
        <div className="flex-1 min-w-0 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length > 0) setShowDropdown(true)
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

      {dropdown}
    </div>
  )
}

export default HeroSearch