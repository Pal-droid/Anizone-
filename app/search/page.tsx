"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchForm } from "@/components/search-form"
import { MangaSearchForm } from "@/components/manga-search-form"
import { AnimeCard } from "@/components/anime-card"
import { MangaCard } from "@/components/manga-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GENRES } from "@/lib/genre-map"
import Link from "next/link"
import { ArrowLeft, Film, BookOpen } from "lucide-react"
import { SlideOutMenu } from "@/components/slide-out-menu"

type AnimeItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
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
  const router = useRouter()

  const [searchType, setSearchType] = useState<"anime" | "manga">("anime")
  const [animeItems, setAnimeItems] = useState<AnimeItem[]>([])
  const [mangaItems, setMangaItems] = useState<MangaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const keyword = sp.get("keyword") || ""
  const queryString = useMemo(() => sp.toString(), [sp])

  const genreId = sp.get("genre")
  const genreName = useMemo(() => {
    if (!genreId) return null
    const g = GENRES.find((x) => String(x.id) === genreId)
    return g?.name || `Genere ${genreId}`
  }, [genreId])

  const searchAnime = async () => {
    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(keyword ? `/api/unified-search?${queryString}` : "/api/search")
      const data = await response.json()
      setAnimeItems(data.items || [])
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca anime")
    } finally {
      setLoading(false)
    }
  }

  const searchManga = async () => {
    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/manga-search?${queryString}`)
      const data = await response.json()
      setMangaItems(data.results || [])
    } catch (e: any) {
      setError(e?.message || "Errore nella ricerca manga")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!keyword) return
    if (searchType === "anime") searchAnime()
    else searchManga()
  }, [queryString, searchType])

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/search" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-4">
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "anime" | "manga")} className="w-full">
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
              <h1 className="text-lg font-bold">{genreId ? `Genere: ${genreName}` : "Cerca Anime"}</h1>
              <p className="text-xs text-neutral-300 mt-1">Trova episodi sub/dub ITA e guardali direttamente.</p>
            </div>

            <SearchForm />

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="aspect-[2/3] bg-neutral-200 rounded" />
                    <div className="h-3 w-3/4 bg-neutral-200 rounded" />
                  </div>
                ))}
              </div>
            ) : animeItems.length === 0 && hasSearched ? (
              <div className="text-sm text-muted-foreground">Nessun risultato trovato.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {animeItems.map((it) => (
                  <AnimeCard key={it.href} title={it.title} href={it.href} image={it.image} isDub={it.isDub} />
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
              <div className="text-center py-8 text-muted-foreground">Nessun manga trovato.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mangaItems.map((manga, idx) => (
                  <MangaCard key={idx} manga={manga} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}