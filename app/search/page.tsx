"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchForm } from "@/components/search-form"
import { MangaSearchForm } from "@/components/manga-search-form"
import { AnimeCard } from "@/components/anime-card"
import { MangaCard } from "@/components/manga-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GENRES } from "@/lib/genre-map"
import Link from "next/link"
import { Film, BookOpen, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Source = {
  name: string
  url: string
  id: string
}

type AnimeItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
  dubLanguage?: "it" | "en" | "ko" | "it/en" | "it/ko" | "en/ko" | "it/en/ko"
  sources?: Source[]
  has_multi_servers?: boolean
  isEnglishServer?: boolean
}

type MangaItem = {
  title: string
  url: string
  image: string
  type: string
  status: string
  author: string
  artist: string
  genres: string[]
  story: string
}

type PaginationInfo = {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  nextUrl?: string
  previousUrl?: string
}

function MangaMaintenanceNotice() {
  useEffect(() => {
    // Prevent scrolling when popup is open
    document.body.style.overflow = 'hidden'
    
    // Create and append overlay directly to body
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(4px) !important;
      z-index: 99999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `
    
    const modal = document.createElement('div')
    modal.style.cssText = `
      max-width: 448px !important;
      width: 100% !important;
      background: white !important;
      border-radius: 8px !important;
      padding: 24px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      z-index: 100000000 !important;
      position: relative !important;
      text-align: center !important;
    `
    
    modal.innerHTML = `
      <div style="color: #eab308; margin-bottom: 16px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style="margin: 0 auto;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a;">Ricerca Manga in Manutenzione</h2>
      <p style="color: #64748b; margin-bottom: 24px; line-height: 1.5;">
        La funzionalità di ricerca manga è attualmente in manutenzione per miglioramenti del sistema. 
        Riprova più tardi. Puoi comunque accedere ai manga direttamente dalle altre sezioni del sito.
      </p>
      <a href="/" style="
        display: inline-block;
        width: 100%;
        padding: 8px 16px;
        background: #0f172a;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: background-color 0.2s;
      " onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
        Torna alla Home
      </a>
    `
    
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    
    return () => {
      document.body.style.overflow = 'unset'
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
    }
  }, [])

  return null // Render nothing in React, we're using DOM manipulation
}

export default function SearchPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const [searchType, setSearchType] = useState<"anime" | "manga">(() => {
    const tabParam = sp.get("tab")
    return tabParam === "manga" ? "manga" : "anime"
  })
  const [animeItems, setAnimeItems] = useState<AnimeItem[]>([])
  const [mangaItems, setMangaItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnified, setIsUnified] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showingDefaults, setShowingDefaults] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [preferredLanguage, setPreferredLanguage] = useState<"it" | "en">(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("anizone:preferredLanguage") : null
      if (saved === "en" || saved === "it") return saved
    } catch {}
    return "it"
  })

  // Listen for language changes from settings panel
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.language === "en" || detail?.language === "it") {
        setPreferredLanguage(detail.language)
      }
    }
    window.addEventListener("anizone:language-changed", handleLangChange)
    return () => window.removeEventListener("anizone:language-changed", handleLangChange)
  }, [])

  const genreId = sp.get("genre")
  const keyword = sp.get("keyword")
  const queryString = useMemo(() => sp.toString(), [sp])

  const genreName = useMemo(() => {
    if (!genreId) return null
    const g = GENRES.find((x) => String(x.id) === genreId)
    return g?.name || `Genere ${genreId}`
  }, [genreId])

  const loadDefaultRecommendations = async () => {
    setLoading(true)
    setError(null)
    setShowingDefaults(true)
    try {
      const r = await fetch("/api/search")
      const ct = r.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        const txt = await r.text()
        throw new Error(txt.slice(0, 200))
      }
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || "Errore caricamento raccomandazioni")
      setAnimeItems(j.items)
      setPagination(j.pagination || null)
    } catch (e: any) {
      setError(e?.message || "Errore nel caricamento delle raccomandazioni")
    } finally {
      setLoading(false)
    }
  }

  const searchAnime = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    setIsUnified(false)
    setHasSearched(true)
    setShowingDefaults(false)

    try {
      let r: Response
      const hasFilters = hasOtherFilters()
      const dubParam = sp.get("dub")

      // If English server is preferred and we have a keyword, use the EN API
      if (preferredLanguage === "en" && keyword) {
        r = await fetch(`/api/en/search?keyword=${encodeURIComponent(keyword)}`, { signal })
        setIsUnified(true)
      } else if (genreId && !keyword) {
        r = await fetch(`/api/search?${queryString}`, { signal })
      } else if (keyword && !hasFilters) {
        let unifiedUrl = `/api/unified-search?keyword=${encodeURIComponent(keyword)}`
        if (dubParam && dubParam !== "any") {
          unifiedUrl += `&dub=${dubParam}`
        }
        r = await fetch(unifiedUrl, { signal })
        setIsUnified(true)
      } else {
        r = await fetch(`/api/search?${queryString}`, { signal })
      }

      if (signal?.aborted) return

      const ct = r.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        const txt = await r.text()
        throw new Error(txt.slice(0, 200))
      }
      const j = await r.json()
      if (signal?.aborted) return
      if (!j.ok) throw new Error(j.error || "Errore ricerca")
      setAnimeItems(j.items)
      if (!isUnified) {
        setIsUnified(j.unified || false)
      }
      setPagination(j.pagination || null)
    } catch (e: any) {
      if (e?.name === "AbortError") return
      const errorMessage = e?.message || "Errore nella ricerca"
      setError(errorMessage)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  const searchManga = async (params: {
    keyword: string
    type: string
    author: string
    year: string
    genre: string
    artist: string
    sort: string
    page?: string
  }) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const hasFilters =
        (params.type && params.type !== "all") ||
        params.author ||
        params.year ||
        params.genre ||
        params.artist ||
        (params.sort && params.sort !== "default")

      if (params.keyword && !hasFilters) {
        // Use unified API for pure keyword search
        console.log("[v0] Using unified manga API for keyword search:", params.keyword)
        const response = await fetch(`/api/manga-unified-search?q=${encodeURIComponent(params.keyword)}`)
        const data = await response.json()
        setMangaItems(data.results || [])
        setPagination(null) // Unified API doesn't support pagination
        return
      }

      // Use regular manga-search API with filters
      const searchParams = new URLSearchParams()
      if (params.keyword) searchParams.set("keyword", params.keyword)
      if (params.type && params.type !== "all") searchParams.set("type", params.type)
      if (params.author) searchParams.set("author", params.author)
      if (params.year) searchParams.set("year", params.year)
      if (params.genre) searchParams.set("genre", params.genre)
      if (params.artist) searchParams.set("artist", params.artist)
      if (params.sort && params.sort !== "default") searchParams.set("sort", params.sort)
      const page = params.page || "1"
      if (page !== "1") searchParams.set("page", page)

      const response = await fetch(`/api/manga-search?${searchParams.toString()}`)
      const data = await response.json()
      setMangaItems(data.results || [])
      setPagination(data.pagination || null)
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca manga")
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  const hasOtherFilters = () => {
    const allParams = Array.from(sp.entries())
    return allParams.some(([key, value]) => {
      if (key === "keyword" || key === "genre" || key === "tab" || key === "page" || key === "servers" || key === "dub")
        return false
      return value && value.trim() !== "" && value !== "any" && value !== "all"
    })
  }

  useEffect(() => {
    const tabParam = sp.get("tab")
    if (tabParam === "manga" || tabParam === "anime") {
      setSearchType(tabParam)
    }
  }, [sp])

  useEffect(() => {
    if (searchType !== "anime") return
    const abort = new AbortController()
    if (queryString) {
      searchAnime(abort.signal)
    } else {
      loadDefaultRecommendations()
    }
    return () => abort.abort()
  }, [queryString, genreId, searchType, preferredLanguage])

  useEffect(() => {
    if (searchType === "manga") {
      const page = sp.get("page") || "1"
      if (keyword) {
        searchManga({
          keyword: keyword,
          type: "all",
          author: "",
          year: "",
          genre: "",
          artist: "",
          sort: "default",
          page: page,
        })
      } else {
        searchManga({
          keyword: "",
          type: "all",
          author: "",
          year: "",
          genre: "",
          artist: "",
          sort: "default",
          page: page,
        })
      }
    }
  }, [searchType, keyword, sp.get("page")])

  const navigateToPage = (pageNum: number) => {
    if (!pagination) return
    let targetPage = pageNum
    if (pageNum > pagination.totalPages) targetPage = 1
    else if (pageNum < 1) targetPage = pagination.totalPages

    const newParams = new URLSearchParams(sp.toString())
    newParams.set("page", targetPage.toString())
    router.push(`/search?${newParams.toString()}`)
  }

  const SkeletonCard = () => (
    <div className="space-y-3">
      <div className="aspect-[2/3] skeleton rounded-2xl" />
      <div className="space-y-2 px-1">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
      </div>
    </div>
  )

  const PaginationBar = () => {
    if (!pagination || isUnified) return null

    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          onClick={() => navigateToPage(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevious}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-muted/50 text-foreground transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:bg-muted active:scale-95",
          )}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30">
          <span className="text-sm text-muted-foreground">Pagina</span>
          <input
            type="number"
            min="1"
            max={pagination.totalPages}
            value={pagination.currentPage}
            onChange={(e) => {
              const page = Number.parseInt(e.target.value)
              if (page >= 1 && page <= pagination.totalPages) {
                navigateToPage(page)
              }
            }}
            className={cn(
              "w-12 px-2 py-1 text-sm text-center rounded-lg",
              "bg-card border border-border text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          />
          <span className="text-sm text-muted-foreground">di {pagination.totalPages}</span>
        </div>

        <button
          onClick={() => navigateToPage(pagination.currentPage + 1)}
          disabled={!pagination.hasNext}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-muted/50 text-foreground transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:bg-muted active:scale-95",
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-6 py-4 flex items-center justify-center">
          <Link href="/" className="text-xl font-bold text-foreground">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-5 space-y-5 max-w-7xl mx-auto">
        <Tabs
          value={searchType}
          onValueChange={(value) => setSearchType(value as "anime" | "manga")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger
              value="anime"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl h-full",
                "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                "transition-all duration-200",
              )}
            >
              <Film size={18} />
              <span className="font-medium">Anime</span>
            </TabsTrigger>
            <TabsTrigger
              value="manga"
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl h-full",
                "data-[state=active]:bg-card data-[state=active]:shadow-sm",
                "transition-all duration-200",
              )}
            >
              <BookOpen size={18} />
              <span className="font-medium">Manga</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anime" className="space-y-5 mt-5">
            <div className="surface-elevated p-5">
              <h1 className="text-xl font-bold text-foreground">
                {showingDefaults ? "Raccomandazioni" : genreId ? `Genere: ${genreName}` : "Cerca Anime"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {showingDefaults ? "Anime popolari e nuove uscite per te" : "Trova episodi sub/dub ITA"}
              </p>
              {isUnified && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Ricerca unificata
                </div>
              )}
            </div>

            <SearchForm />

            {error && (
              <div className="surface-elevated p-4 border-l-4 border-destructive">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : animeItems.length === 0 && hasSearched ? (
              <div className="surface-elevated p-8 text-center">
                <Film size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Nessun risultato</h2>
                <p className="text-muted-foreground text-sm">
                  Prova a cambiare parola chiave o filtri
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {animeItems.map((it: AnimeItem) => (
                    <AnimeCard
                      key={it.href || it.title}
                      title={it.title}
                      href={it.href}
                      image={it.image}
                      isDub={it.isDub}
                      dubLanguage={it.dubLanguage}
                      compactSources
                      sources={it.sources}
                      has_multi_servers={it.has_multi_servers}
                      isEnglishServer={it.isEnglishServer}
                    />
                  ))}
                </div>
                <PaginationBar />
              </>
            )}
          </TabsContent>

          <TabsContent value="manga" className="space-y-5 mt-5">
            {error && error.includes("almeno 2 caratteri") ? (
              // Show error message instead of maintenance popup for validation errors
              <div className="surface-elevated p-5">
                <h1 className="text-xl font-bold text-foreground">Cerca Manga</h1>
                <p className="text-sm text-muted-foreground mt-1">Trova capitoli tradotti in ITA</p>
              </div>
            ) : (
              <MangaMaintenanceNotice />
            )}
            
            {!error && (
              <div className="surface-elevated p-5">
                <h1 className="text-xl font-bold text-foreground">Cerca Manga</h1>
                <p className="text-sm text-muted-foreground mt-1">Trova capitoli tradotti in ITA</p>
              </div>
            )}

            <MangaSearchForm onSearch={searchManga} isLoading={loading} />

            {error && !error.includes("almeno 2 caratteri") && (
              <div className="surface-elevated p-4 border-l-4 border-destructive">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : mangaItems.length === 0 && hasSearched ? (
              <div className="surface-elevated p-8 text-center">
                <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Nessun risultato</h2>
                <p className="text-muted-foreground text-sm">Non sono stati trovati manga. Prova con altri filtri.</p>
              </div>
            ) : mangaItems.length > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Risultati ({mangaItems.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {mangaItems.map((manga, index) => (
                    <MangaCard key={index} manga={manga} />
                  ))}
                </div>
                <PaginationBar />
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
