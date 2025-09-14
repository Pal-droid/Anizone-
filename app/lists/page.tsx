"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AuthPanel } from "@/components/auth-panel"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Film, BookOpen, Book } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

type ContentType = "anime" | "manga" | "light-novel" | "series-movies"

type AnimeListName = "da_guardare" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"
type MangaListName = "da_leggere" | "in_corso" | "completati" | "in_pausa" | "abbandonati" | "in_revisione"

type ListItem = {
  title: string
  image?: string
  path?: string
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

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true)
      try {
        const meta = await fetchMetadata()
        setMetadata(meta)
      } catch (error) {
        console.error("[v0] Error loading metadata for:", itemId, error)
        setMetadata({ title: itemId, image: null, path: null })
      } finally {
        setLoading(false)
      }
    }
    loadMetadata()
  }, [itemId, contentType, fetchMetadata])

  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4 hover:glow transition-all duration-300">
      <div className="shrink-0">
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground">
          {loading ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full rounded" />
          ) : metadata.image ? (
            <img
              src={
                contentType === "manga" || contentType === "light-novel"
                  ? `/api/manga-image-proxy?url=${encodeURIComponent(metadata.image)}`
                  : metadata.image
              }
              alt={metadata.title}
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
        {metadata.path && (
          <Button size="sm" variant="outline" asChild>
            <Link
              href={
                contentType === "anime" || contentType === "series-movies"
                  ? `/anime/${itemId}`
                  : contentType === "manga"
                    ? `/manga/${itemId}`
                    : `/manga/${itemId}`
              }
            >
              Apri
            </Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
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
  const [loading, setLoading] = useState(false)

  async function loadLists() {
    if (!user?.token) return

    setLoading(true)
    try {
      console.log("[v0] Loading lists for user:", user.username)

      // Load anime lists
      const animeResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/anime-lists", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
      if (animeResponse.ok) {
        const animeData = await animeResponse.json()
        console.log("[v0] Anime lists loaded:", animeData)
        setAnimeLists(animeData)
      }

      // Load manga lists
      const mangaResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/manga-lists", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
      if (mangaResponse.ok) {
        const mangaData = await mangaResponse.json()
        console.log("[v0] Manga lists loaded:", mangaData)
        setMangaLists(mangaData)
      }

      // Load light novel lists
      const lightNovelResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/lightnovel-lists",
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )
      if (lightNovelResponse.ok) {
        const lightNovelData = await lightNovelResponse.json()
        console.log("[v0] Light novel lists loaded:", lightNovelData)
        setLightNovelLists(lightNovelData)
      }

      // Load series & movies lists
      const seriesMoviesResponse = await fetch(
        "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/series-movies-lists",
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      )
      if (seriesMoviesResponse.ok) {
        const seriesMoviesData = await seriesMoviesResponse.json()
        console.log("[v0] Series & movies lists loaded:", seriesMoviesData)
        setSeriesMoviesLists(seriesMoviesData)
      }
    } catch (error) {
      console.error("[v0] Error loading lists:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.token) {
      loadLists()
    }
  }, [user?.token])

  async function removeFromList(contentType: ContentType, listName: string, title: string) {
    if (!user?.token) return

    try {
      let endpoint = ""
      let currentLists: any = {}

      switch (contentType) {
        case "anime":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/anime-lists"
          currentLists = { ...animeLists }
          break
        case "manga":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/manga-lists"
          currentLists = { ...mangaLists }
          break
        case "light-novel":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/lightnovel-lists"
          currentLists = { ...lightNovelLists }
          break
        case "series-movies":
          endpoint = "https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/series-movies-lists"
          currentLists = { ...seriesMoviesLists }
          break
      }

      // Remove item from the specific list
      if (currentLists[listName]) {
        currentLists[listName] = currentLists[listName].filter((item: string) => item !== title)
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentLists),
      })

      if (response.ok) {
        // Update local state
        switch (contentType) {
          case "anime":
            setAnimeLists(currentLists)
            break
          case "manga":
            setMangaLists(currentLists)
            break
          case "light-novel":
            setLightNovelLists(currentLists)
            break
          case "series-movies":
            setSeriesMoviesLists(currentLists)
            break
        }
      }
    } catch (error) {
      console.error("[v0] Error removing from list:", error)
    }
  }

  const fetchItemMetadata = async (contentType: ContentType, itemId: string) => {
    try {
      if (contentType === "anime" || contentType === "series-movies") {
        const response = await fetch(`/api/anime-meta?path=${encodeURIComponent(itemId)}`)
        if (response.ok) {
          const data = await response.json()
          return {
            title: data.meta?.title || itemId,
            image: data.meta?.image,
            path: data.meta?.path || `/anime/${itemId}`,
          }
        }
      } else if (contentType === "manga" || contentType === "light-novel") {
        const response = await fetch(`/api/manga-info?id=${encodeURIComponent(itemId)}`)
        if (response.ok) {
          const data = await response.json()
          return {
            title: data.title || itemId,
            image: data.image,
            path: `/manga/${itemId}`,
          }
        } else {
          console.log("[v0] Manga info API failed, using fallback data")
          return {
            title: itemId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            image: null,
            path: `/manga/${itemId}`,
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching metadata for:", itemId, error)
    }

    return {
      title: itemId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      image: null,
      path: contentType === "anime" || contentType === "series-movies" ? `/anime/${itemId}` : `/manga/${itemId}`,
    }
  }

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

    if (items.length === 0) {
      return <div className="text-sm text-muted-foreground">Nessun elemento.</div>
    }

    return (
      <div className="grid grid-cols-1 gap-3">
        {items.map((itemId, index) => (
          <ListItemCard
            key={`${listName}-${itemId}-${index}`}
            itemId={itemId}
            contentType={contentType}
            listName={listName}
            onRemove={() => removeFromList(contentType, listName, itemId)}
            fetchMetadata={() => fetchItemMetadata(contentType, itemId)}
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

        {loading ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Caricamento liste...</p>
            </CardContent>
          </Card>
        ) : (
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

            <TabsContent value="anime" className="space-y-6">
              {ANIME_ORDER.map((sec) => (
                <Card key={sec.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList("anime", sec.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="manga" className="space-y-6">
              {MANGA_ORDER.map((sec) => (
                <Card key={sec.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList("manga", sec.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="light-novel" className="space-y-6">
              {MANGA_ORDER.map((sec) => (
                <Card key={sec.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList("light-novel", sec.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="series-movies" className="space-y-6">
              {ANIME_ORDER.map((sec) => (
                <Card key={sec.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList("series-movies", sec.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  )
}
