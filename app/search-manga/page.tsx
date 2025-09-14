"use client"

import Link from "next/link"
import { BookOpen, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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

export default function MangaSearchPage() {
  const searchParams = useSearchParams()
  const [searchResults, setSearchResults] = useState<MangaResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  useEffect(() => {
    const genre = searchParams.get("genre")
    if (genre) {
      handleSearch({
        keyword: "",
        type: "all",
        author: "",
        year: "",
        genre: genre,
        artist: "",
        sort: "default",
      })
    } else {
      loadBaseArchive()
    }
  }, [searchParams])

  const loadBaseArchive = async () => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery("archivio completo")

    try {
      const response = await fetch("/api/manga-search")
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Error loading base archive:", error)
      setSearchResults([])
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

      const response = await fetch(`/api/manga-search?${searchParams.toString()}`)
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Error searching manga:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
      setInitialLoadComplete(true)
    }
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
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cercando manga...</p>
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
