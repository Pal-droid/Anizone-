"use client"

import Link from "next/link"
import { BookOpen, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MangaCard } from "@/components/manga-card"
import { MangaSearchForm } from "@/components/manga-search-form"
import { SlideOutMenu } from "@/components/slide-out-menu"

interface MangaResult {
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

interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export default function MangaSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<MangaResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  useEffect(() => {
    const genre = searchParams.get("genre")
    const page = searchParams.get("page") || "1"

    if (genre) {
      handleSearch({
        keyword: "",
        type: "all",
        author: "",
        year: "",
        genre: genre,
        artist: "",
        sort: "default",
        page,
      })
    } else {
      loadBaseArchive(page)
    }
  }, [searchParams])

  const loadBaseArchive = async (page = "1") => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery("archivio completo")

    try {
      const response = await fetch(`/api/manga-search?page=${page}`)
      const data = await response.json()
      setSearchResults(data.results || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error("Error loading base archive:", error)
      setSearchResults([])
      setPagination(null)
    } finally {
      setIsLoading(false)
      setInitialLoadComplete(true)
    }
  }

  const handleSearch = async (params: {
    keyword: string
    type: string
    author: string
    year: string
    genre: string
    artist: string
    sort: string
    page?: string
  }) => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery(params.keyword || params.genre || "filtri applicati")

    try {
      const searchParams = new URLSearchParams()
      if (params.keyword) searchParams.set("keyword", params.keyword)
      if (params.type && params.type !== "all") searchParams.set("type", params.type)
      if (params.author) searchParams.set("author", params.author)
      if (params.year) searchParams.set("year", params.year)
      if (params.genre) searchParams.set("genre", params.genre)
      if (params.artist) searchParams.set("artist", params.artist)
      if (params.sort && params.sort !== "default") searchParams.set("sort", params.sort)
      if (params.page && params.page !== "1") searchParams.set("page", params.page)

      const response = await fetch(`/api/manga-search?${searchParams.toString()}`)
      const data = await response.json()
      setSearchResults(data.results || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error("Error searching manga:", error)
      setSearchResults([])
      setPagination(null)
    } finally {
      setIsLoading(false)
      setInitialLoadComplete(true)
    }
  }

  const navigateToPage = (pageNum: number) => {
    if (!pagination) return

    let targetPage = pageNum

    // Wrap around logic
    if (pageNum > pagination.totalPages) {
      targetPage = 1
    } else if (pageNum < 1) {
      targetPage = pagination.totalPages
    }

    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("page", targetPage.toString())
    router.push(`/search-manga?${newParams.toString()}`)
    router.refresh()
  }

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/search-manga" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <div className="rounded-lg bg-neutral-950 text-white p-5">
          <h1 className="text-xl font-bold">Cerca manga</h1>
          <p className="text-xs text-neutral-300 mt-1">Trova capitoli tradotti in ITA e leggili direttamente.</p>
          <div className="mt-3">
            <MangaSearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[2/3] bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-2 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {hasSearched && !isLoading && searchResults.length === 0 && (
          <div className="text-center py-8">
            <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Nessun risultato</h2>
            <p className="text-muted-foreground">
              Non sono stati trovati manga per "{currentQuery}". Prova con altri filtri.
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {currentQuery === "archivio completo" ? "Archivio manga completo" : `Risultati per "${currentQuery}"`} (
              {searchResults.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.map((manga, index) => (
                <MangaCard key={index} manga={manga} />
              ))}
            </div>

            {pagination && (
              <div className="flex items-center justify-between py-3 px-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <button
                  onClick={() => navigateToPage(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-200 dark:disabled:hover:bg-neutral-800 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Precedente
                </button>

                <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <span>pagina</span>
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
                    className="w-12 px-2 py-1 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-center text-neutral-800 dark:text-neutral-200 focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                  />
                  <span>di</span>
                  <span className="font-medium">{pagination.totalPages}</span>
                </div>

                <button
                  onClick={() => navigateToPage(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-200 dark:disabled:hover:bg-neutral-800 transition-colors"
                >
                  Successiva
                  <ArrowLeft size={14} className="rotate-180" />
                </button>
              </div>
            )}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Scopri i tuoi manga preferiti</h2>
            <p className="text-muted-foreground mb-4">
              Usa i filtri sopra per cercare manga per titolo, autore, genere e molto altro.
            </p>
            <Link href="/manga" className="flex items-center gap-1 hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Torna alla Homepage Manga
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
