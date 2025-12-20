"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AniListAuthPanel } from "@/components/anilist-auth-panel"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Film, BookOpen, Trash2 } from "lucide-react"
import { useAniList } from "@/contexts/anilist-context"
import { aniListManager } from "@/lib/anilist"

type MediaType = "anime" | "manga"

const ANIME_STATUS_MAP: Record<string, string> = {
  CURRENT: "In corso",
  PLANNING: "Da guardare",
  COMPLETED: "Completati",
  PAUSED: "In pausa",
  DROPPED: "Abbandonati",
  REPEATING: "In revisione",
}

const MANGA_STATUS_MAP: Record<string, string> = {
  CURRENT: "In corso",
  PLANNING: "Da leggere",
  COMPLETED: "Completati",
  PAUSED: "In pausa",
  DROPPED: "Abbandonati",
  REPEATING: "In revisione",
}

export default function ListsPage() {
  const { user, isLoading } = useAniList()
  const [activeMediaType, setActiveMediaType] = useState<MediaType>("anime")
  const [animeCollection, setAnimeCollection] = useState<any>(null)
  const [mangaCollection, setMangaCollection] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadLists()
    } else {
      setAnimeCollection(null)
      setMangaCollection(null)
    }
  }, [user])

  const loadLists = async () => {
    setLoading(true)
    try {
      const [animeData, mangaData] = await Promise.all([
        aniListManager.getUserAnimeList(),
        aniListManager.getUserMangaList(),
      ])
      setAnimeCollection(animeData)
      setMangaCollection(mangaData)
    } catch (error) {
      console.error("[v0] Error loading lists:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Sei sicuro di voler rimuovere questo elemento dalla tua lista?")) return

    const success = await aniListManager.deleteAnimeEntry(entryId)
    if (success) {
      loadLists()
    } else {
      alert("Errore durante la rimozione dell'elemento")
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SlideOutMenu />
        <div className="text-center">Caricamento...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SlideOutMenu />
        <h1 className="text-3xl font-bold mb-6">Le Mie Liste</h1>
        <AniListAuthPanel />
        <div className="mt-6 text-center text-muted-foreground">
          <p>Accedi con AniList per visualizzare e gestire le tue liste</p>
        </div>
      </div>
    )
  }

  const currentCollection = activeMediaType === "anime" ? animeCollection : mangaCollection
  const statusMap = activeMediaType === "anime" ? ANIME_STATUS_MAP : MANGA_STATUS_MAP

  return (
    <div className="container mx-auto px-4 py-8">
      <SlideOutMenu />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Le Mie Liste</h1>
        <Button onClick={loadLists} variant="outline" disabled={loading}>
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </Button>
      </div>

      <AniListAuthPanel />

      <Tabs value={activeMediaType} onValueChange={(v) => setActiveMediaType(v as MediaType)} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="anime" className="gap-2">
            <Film className="h-4 w-4" />
            Anime
          </TabsTrigger>
          <TabsTrigger value="manga" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Manga
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeMediaType} className="mt-6">
          {loading ? (
            <div className="text-center py-12">Caricamento liste...</div>
          ) : !currentCollection ? (
            <div className="text-center py-12 text-muted-foreground">Nessuna lista disponibile</div>
          ) : (
            <div className="space-y-8">
              {currentCollection.lists?.map((list: any) => (
                <Card key={list.name}>
                  <CardHeader>
                    <CardTitle>{statusMap[list.status] || list.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {list.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessun elemento in questa lista</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {list.entries.map((entry: any) => (
                          <div key={entry.id} className="group relative">
                            <Link href={`https://anilist.co/${activeMediaType}/${entry.media.id}`} target="_blank">
                              <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                                <Image
                                  src={entry.media.coverImage.large || entry.media.coverImage.medium}
                                  alt={entry.media.title.romaji}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                              </div>
                              <div className="mt-2">
                                <p className="text-sm font-medium line-clamp-2">{entry.media.title.romaji}</p>
                                {entry.progress > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Progresso: {entry.progress}
                                    {activeMediaType === "anime" && entry.media.episodes
                                      ? `/${entry.media.episodes}`
                                      : activeMediaType === "manga" && entry.media.chapters
                                        ? `/${entry.media.chapters}`
                                        : ""}
                                  </p>
                                )}
                              </div>
                            </Link>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteEntry(entry.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
