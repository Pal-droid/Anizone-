"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AuthPanel } from "@/components/auth-panel"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Film, BookOpen, Book } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { obfuscateUrl, obfuscateId } from "@/lib/utils"

type ContentType = "anime" | "manga" | "light-novel" | "series-movies"
type AnimeListName = "da_guardare" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"
type MangaListName = "da_leggere" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"
type ListItem = {
  title: string
  image?: string
  path?: string
  sources?: any[]
}
type ContinueWatchingItem = {
  id: string
  title: string
  image: string
  episodeId: string
}

const ANIME_ORDER: { key: AnimeListName; title: string }[] = [
  { key: "da_guardare", title: "Da guardare" },
  { key: "in_corso", title: "In corso" },
  { key: "completati", title: "Completati" },
  { key: "in_pausa", title: "In pausa" },
  { key: "abbandonati", title: "Abbandonati" },
  { key: "in_revisione", title: "In revisione" },
]

const MANGA_ORDER: { key: MangaListName; title: string }[] = [
  { key: "da_leggere", title: "Da leggere" },
  { key: "in_corso", title: "In corso" },
  { key: "completati", title: "Completati" },
  { key: "in_pausa", title: "In pausa" },
  { key: "abbandonati", title: "Abbandonati" },
  { key: "in_revisione", title: "In revisione" },
]

const CONTENT_TYPES: { key: ContentType; title: string; icon: any }[] = [
  { key: "anime", title: "Anime", icon: Film },
  { key: "manga", title: "Manga", icon: BookOpen },
  { key: "light-novel", title: "Romanzi", icon: Book },
  { key: "series-movies", title: "Serie & Film", icon: Film },
]

const ListItemCard = ({ itemId, contentType, listName, onRemove, fetchMetadata }) => {
  const [metadata, setMetadata] = useState({ title: itemId, image: null, path: null })
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState([])

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true)
      try {
        const meta = await fetchMetadata()
        setMetadata(meta)
        if (meta.sources) {
          setSources(meta.sources)
        }
      } catch (error) {
        console.error("[v0] Error loading metadata for:", itemId, error)
        setMetadata({ title: itemId, image: null, path: null })
      } finally {
        setLoading(false)
      }
    }
    loadMetadata()
  }, [itemId, contentType, fetchMetadata])

  const getNavigationUrl = () => {
    if (contentType === "anime" || contentType === "series-movies") {
      return `/watch?p=${obfuscateUrl(itemId)}`
    } else if (contentType === "manga" || contentType === "light-novel") {
      return `/manga/${obfuscateId(itemId)}`
    }
    return "#"
  }

  const handleClick = () => {
    if ((contentType === "anime" || contentType === "series-movies") && sources && sources.length > 0) {
      try {
        sessionStorage.setItem(`anizone:sources:${itemId}`, JSON.stringify(sources))
        console.log("[v0] Stored sources in sessionStorage for:", itemId, sources)
      } catch (error) {
        console.error("[v0] Failed to store sources in sessionStorage:", error)
      }
    }
  }

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 hover:glow transition-all duration-300">
      <div className="shrink-0">
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
          {loading ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full rounded" />
          ) : metadata.image ? (
            <Image
              src={
                contentType === "manga" || contentType === "light-novel"
                  ? `/api/manga-image-proxy?url=${encodeURIComponent(metadata.image)}`
                  : metadata.image
              }
              alt={metadata.title}
              width={64}
              height={80}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                target.parentElement!.innerHTML =
                  contentType === "anime" || contentType === "series-movies"
                    ? '<svg class="w-6 h-6"><use href="#film-icon"></use></svg>'
                    : contentType === "manga"
                    ? '<svg class="w-6 h-6"><use href="#book-open-icon"></use></svg>'
                    : '<svg class="w-6 h-6"><use href="#book-icon"></use></svg>'
              }}
            />
          ) : (
            <>
              {contentType === "anime" || contentType === "series-movies" ? (
                <Film size={20} />
              ) : contentType === "manga" ? (
                <BookOpen size={20} />
              ) : (
                <Book size={20} />
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{loading ? "Caricamento..." : metadata.title}</h3>
        <p className="text-xs text-muted-foreground">
          {contentType === "anime"
            ? "Anime"
            : contentType === "manga"
            ? "Manga"
            : contentType === "light-novel"
            ? "Romanzo"
            : "Serie/Film"}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" asChild>
          <Link href={getNavigationUrl()} onClick={handleClick}>
            Apri
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove()}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent"
        >
          Rimuovi
        </Button>
      </div>
    </div>
  )
}

export default function ListsPage() {
  const { user } = useAuth()
  const [animeLists, setAnimeLists] = useState<Record<AnimeListName, string[]>>({
    da_guardare: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [mangaLists, setMangaLists] = useState<Record<MangaListName, string[]>>({
    da_leggere: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [lightNovelLists, setLightNovelLists] = useState<Record<MangaListName, string[]>>({
    da_leggere: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [seriesMoviesLists, setSeriesMoviesLists] = useState<Record<AnimeListName, string[]>>({
    da_guardare: [],
    in_corso: [],
    completati: [],
    in_pausa: [],
    abbandonati: [],
    in_revisione: [],
  })
  const [activeContentType, setActiveContentType] = useState<ContentType>("anime")
  const [listsLoading, setListsLoading] = useState(false)
  const [continueWatchingLoading, setContinueWatchingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ongoingList, setOngoingList] = useState<ContinueWatchingItem[]>([])
  const [episodes, setEpisodes] = useState<Record<string, any[]>>({})
  const [sources, setSources] = useState<Record<string, any[]>>({})

  const memoizedAnimeInCorso = useMemo(() => animeLists.in_corso, [animeLists.in_corso])
  const memoizedSeriesInCorso = useMemo(() => seriesMoviesLists.in_corso, [seriesMoviesLists.in_corso])

  async function loadLists() {
    if (!user?.token) return
    setListsLoading(true)
    setError(null)
    try {
      console.log("[v0] Loading lists for user:", user.username)
      const animeResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/anime-lists", {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (animeResponse.ok) setAnimeLists(await animeResponse.json())

      const mangaResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/manga-lists", {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (mangaResponse.ok) setMangaLists(await mangaResponse.json())

      const lightNovelResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/lightnovel-lists",
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      if (lightNovelResponse.ok) setLightNovelLists(await lightNovelResponse.json())

      const seriesMoviesResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/series-movies-lists",
        { headers: { Authorization: `Bearer ${user.token}` } },
      )
      if (seriesMoviesResponse.ok) setSeriesMoviesLists(await seriesMoviesResponse.json())
    } catch (error) {
      console.error("[v0] Error loading lists:", error)
      setError("Errore durante il caricamento delle liste. Riprova più tardi.")
    } finally {
      setListsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.token) {
      loadLists()
    }
  }, [user?.token])

  const renderList = (contentType: ContentType, listName: string) => {
    let items: string[] = []
    switch (contentType) {
      case "anime":
        items = animeLists[listName as AnimeListName] || []
        break
      case "manga":
        items = mangaLists[listName as MangaListName] || []
        break
      case "light-novel":
        items = lightNovelLists[listName as MangaListName] || []
        break
      case "series-movies":
        items = seriesMoviesLists[listName as AnimeListName] || []
        break
    }
    if (items.length === 0) return <div className="text-sm text-muted-foreground">Nessun elemento.</div>

    return (
      <div className="grid grid-cols-1 gap-3">
        {items.map((itemId, index) => (
          <ListItemCard
            key={`${itemId}-${index}`}
            itemId={itemId}
            contentType={contentType}
            listName={listName}
            onRemove={() => console.log("Remove:", itemId)}
            fetchMetadata={() => Promise.resolve({ title: itemId, image: null })}
          />
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen">
        <SlideOutMenu currentPath="/lists" />
        <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="px-4 py-3">
            <h1 className="text-lg font-bold">Le mie liste</h1>
          </div>
        </header>
        <section className="px-4 py-4 space-y-6">
          <AuthPanel onAuthChange={loadLists} />
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Effettua il login per vedere le tue liste.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/lists" />
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">Le mie liste</h1>
        </div>
      </header>
      <section className="px-4 py-4 space-y-6">
        <AuthPanel onAuthChange={loadLists} />

        {/* 🧩 Message Card */}
        <Card className="glass-card border border-primary/20 bg-gradient-to-br from-primary/10 to-background/50 backdrop-blur-md">
          <CardContent className="py-5 px-6 text-center">
            <h2 className="text-lg font-semibold mb-2 text-primary">
              🚧 Liste in sviluppo 🚧
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le liste sono ancora in fase di sviluppo, ma come suggerimento temporaneo
              vi consiglio di usare{" "}
              <Link
                href="https://anilist.co"
                target="_blank"
                className="text-primary hover:underline font-medium"
              >
                Anilist
              </Link>.
              <br />
              <span className="italic text-xs text-muted-foreground/80">
                PS: in futuro aggiungerò una feature per importare la propria lista di Anilist nel sito.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeContentType}
          onValueChange={(value) => setActiveContentType(value as ContentType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="hidden sm:inline">{type.title}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {CONTENT_TYPES.map((type) => (
            <TabsContent key={type.key} value={type.key} className="space-y-6">
              {(type.key === "anime" || type.key === "series-movies" ? ANIME_ORDER : MANGA_ORDER).map((list) => (
                <Card key={list.key} className="glass-card">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{list.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(type.key, list.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  )
}