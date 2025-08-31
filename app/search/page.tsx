"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { SearchForm } from "@/components/search-form"
import { MangaSearchForm } from "@/components/manga-search-form"
import { AnimeCard } from "@/components/anime-card"
import { MangaCard } from "@/components/manga-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GENRES } from "@/lib/genre-map"
import Link from "next/link"
import { ArrowLeft, Film, BookOpen, Search, List } from "lucide-react"

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
  sources?: Source[]
  has_multi_servers?: boolean
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

export default function SearchPage() {
  const sp = useSearchParams()
  const [searchType, setSearchType] = useState<"anime" | "manga">("anime")
  const [animeItems, setAnimeItems] = useState<AnimeItem[]>([])
  const [mangaItems, setMangaItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnified, setIsUnified] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const genreSlug = sp.get("genreSlug")
  const queryString = useMemo(() => sp.toString(), [sp])

  const genreName = useMemo(() => {
    if (!genreSlug) return null
    const g = GENRES.find((x) => x.slug === genreSlug)
    return g?.name || genreSlug
  }, [genreSlug])

  const searchAnime = async () => {
    setLoading(true)
    setError(null)
    setIsUnified(false)
    setHasSearched(true)
    try {
      let r: Response
      if (genreSlug) {
        r = await fetch(`/api/genre?slug=${encodeURIComponent(genreSlug)}`)
      } else {
        r = await fetch(`/api/unified-search?${queryString}`)
      }
      const ct = r.headers.get("content-type") || ""
      if (!ct.includes("application/json")) {
        const txt = await r.text()
        throw new Error(txt.slice(0, 200))
      }
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || "Errore ricerca")
      setAnimeItems(j.items)
      setIsUnified(j.unified || false)
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca")
    } finally {
      setLoading(false)
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
  }) => {
    setLoading(true)
    setError(null)
    setHasSearched(true)
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
      setMangaItems(data.results || [])
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca manga")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchType === "anime" && queryString) {
      searchAnime()
    }
  }, [queryString, genreSlug, searchType])

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
          <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-4">
        <Tabs
          value={searchType}
          onValueChange={(value) => setSearchType(value as "anime" | "manga")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="anime" className="flex items-center gap-2">
              <Film size={16} />
              Anime
            </TabsTrigger>
            <TabsTrigger value="manga" className="flex items-center gap-2">
              <BookOpen size={16} />
              Manga
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anime" className="space-y-4">
            <div className="rounded-lg bg-neutral-950 text-white p-4">
              <h1 className="text-lg font-bold">
                {genreSlug ? `Genere: ${genreName}` : "Cerca Anime"}
                {isUnified && <span className="text-sm font-normal text-neutral-300 ml-2">(Ricerca unificata)</span>}
              </h1>
              <p className="text-xs text-neutral-300 mt-1">Trova episodi sub/dub ITA e guardali direttamente.</p>
            </div>
            <SearchForm />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="aspect-[2/3] bg-neutral-200 rounded" />
                    <div className="h-3 w-3/4 bg-neutral-200 rounded" />
                  </div>
                ))}
              </div>
            ) : animeItems.length === 0 && hasSearched ? (
              <div className="text-sm text-muted-foreground">
                Nessun risultato trovato. Prova a cambiare parola chiave o filtri.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {animeItems.map((it) => (
                  <AnimeCard
                    key={it.href}
                    title={it.title}
                    href={it.href}
                    image={it.image}
                    isDub={it.isDub}
                    sources={it.sources}
                    has_multi_servers={it.has_multi_servers}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manga" className="space-y-4">
            <div className="rounded-lg bg-neutral-950 text-white p-4">
              <h1 className="text-lg font-bold">Cerca Manga</h1>
              <p className="text-xs text-neutral-300 mt-1">Trova capitoli tradotti in ITA e leggili direttamente.</p>
            </div>
            <MangaSearchForm onSearch={searchManga} isLoading={loading} />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Cercando manga...</p>
              </div>
            ) : mangaItems.length === 0 && hasSearched ? (
              <div className="text-center py-8">
                <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2">Nessun risultato</h2>
                <p className="text-muted-foreground">Non sono stati trovati manga. Prova con altri filtri.</p>
              </div>
            ) : mangaItems.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Risultati manga ({mangaItems.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {mangaItems.map((manga, index) => (
                    <MangaCard key={index} manga={manga} />
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </section>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-20">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors">
            <Film size={20} />
            <span>Anime</span>
          </Link>
          <Link
            href="/manga"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <BookOpen size={20} />
            <span>Manga</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 p-2 text-xs text-primary">
            <Search size={20} />
            <span>Cerca</span>
          </Link>
          <Link
            href="/lists"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <List size={20} />
            <span>Liste</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
