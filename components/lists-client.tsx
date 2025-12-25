"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AniListAuthPanel } from "@/components/anilist-auth-panel"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { EditListEntryDialog } from "@/components/edit-list-entry-dialog"
import { ListsImportExport } from "@/components/lists-import-export"
import { Film, BookOpen, Trash2, RefreshCw, Star, ArrowRight, Edit, Search } from "lucide-react"
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

const STATUS_COLORS: Record<string, string> = {
  CURRENT: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  PLANNING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  DROPPED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  REPEATING: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
}

export function ListsClient() {
  const { user, isLoading } = useAniList()
  const [activeMediaType, setActiveMediaType] = useState<MediaType>("anime")
  const [animeCollection, setAnimeCollection] = useState<any>(null)
  const [mangaCollection, setMangaCollection] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

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
      console.log("[v0] Loading lists for user:", user?.name)
      const [animeData, mangaData] = await Promise.all([
        aniListManager.getUserAnimeList(),
        aniListManager.getUserMangaList(),
      ])
      console.log("[v0] Anime collection:", animeData)
      console.log("[v0] Manga collection:", mangaData)
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

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry)
    setEditDialogOpen(true)
  }

  const handleSaveEntry = async (updates: { status?: string; progress?: number; score?: number }) => {
    if (!editingEntry) return

    console.log("[v0] Saving entry updates:", updates)

    const updateMethod =
      activeMediaType === "anime"
        ? aniListManager.updateAnimeEntry.bind(aniListManager)
        : aniListManager.updateMangaEntry.bind(aniListManager)

    // Build mutation variables
    const variables: any = { mediaId: editingEntry.media.id }
    if (updates.status) variables.status = updates.status
    if (updates.progress !== undefined) variables.progress = updates.progress
    if (updates.score !== undefined) variables.score = updates.score

    // Use GraphQL mutation directly for full update support
    try {
      const mutation = `
        mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
          SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
            id
            status
            progress
            score
          }
        }
      `

      const response = await fetch("/api/anilist/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      })

      const data = await response.json()

      if (data.errors) {
        throw new Error("GraphQL error")
      }

      console.log("[v0] Entry updated successfully:", data)
      await loadLists()
    } catch (error) {
      console.error("[v0] Error updating entry:", error)
      throw error
    }
  }

  const scrollToSection = (status: string) => {
    const element = sectionRefs.current[status]
    if (element) {
      const yOffset = -140
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  const toggleSection = (status: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }))
  }

  const filterBySearch = (entry: any) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const romajiTitle = entry.media.title.romaji?.toLowerCase() || ""
    const englishTitle = entry.media.title.english?.toLowerCase() || ""
    const nativeTitle = entry.media.title.native?.toLowerCase() || ""

    return romajiTitle.includes(query) || englishTitle.includes(query) || nativeTitle.includes(query)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SlideOutMenu />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mx-auto" />
              <p className="text-muted-foreground">Caricamento...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SlideOutMenu />

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto space-y-8">
            <AniListAuthPanel />
            <Card className="p-8 text-center space-y-4 border-dashed">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Inizia a tracciare i tuoi anime</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Accedi con AniList per visualizzare e gestire le tue liste di anime e manga in un unico posto
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const currentCollection = activeMediaType === "anime" ? animeCollection : mangaCollection
  const statusMap = activeMediaType === "anime" ? ANIME_STATUS_MAP : MANGA_STATUS_MAP

  return (
    <div className="min-h-screen bg-background">
      <SlideOutMenu />

      {user?.bannerImage && (
        <div className="relative w-full h-48 md:h-64 overflow-hidden">
          <Image
            src={user.bannerImage || "/placeholder.svg"}
            alt={`${user.name}'s banner`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-4 left-4 md:left-8 flex items-end gap-4">
            {user.avatar?.large && (
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-4 ring-background shadow-xl">
                <Image src={user.avatar.large || "/placeholder.svg"} alt={user.name} fill className="object-cover" />
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">{user.name}</h1>
              <p className="text-sm text-white/80 drop-shadow">Le tue liste AniList</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {!user?.bannerImage && (
          <div className="mb-8">
            <AniListAuthPanel />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          {!user?.bannerImage && <h1 className="text-2xl font-bold">Le Mie Liste</h1>}
          {user?.bannerImage && <div />}
          <div className="flex items-center gap-2">
            <ListsImportExport
              animeCollection={animeCollection}
              mangaCollection={mangaCollection}
              user={user}
              onImportComplete={loadLists}
            />
            <Button
              onClick={loadLists}
              variant="outline"
              disabled={loading}
              className="gap-2 shrink-0 bg-transparent"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Aggiorna</span>
            </Button>
          </div>
        </div>

        {currentCollection && (
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Cerca ${activeMediaType === "anime" ? "anime" : "manga"} per titolo...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        <Tabs value={activeMediaType} onValueChange={(v) => setActiveMediaType(v as MediaType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="anime" className="gap-2">
              <Film className="h-4 w-4" />
              Anime
            </TabsTrigger>
            <TabsTrigger value="manga" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Manga
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeMediaType} className="mt-0">
            {loading ? (
              <div className="space-y-8">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-6 space-y-4">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[...Array(6)].map((_, j) => (
                        <div key={j} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : !currentCollection ? (
              <Card className="p-12 text-center space-y-4 border-dashed">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  {activeMediaType === "anime" ? (
                    <Film className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Nessuna lista disponibile</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Inizia ad aggiungere {activeMediaType === "anime" ? "anime" : "manga"} alla tua lista su AniList
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="sticky top-[105px] z-20 mb-6 bg-background/95 backdrop-blur-sm border-y border-border/50 -mx-4 px-4 py-3">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="text-sm font-medium text-muted-foreground shrink-0">Salta a:</span>
                    {currentCollection.lists?.map((list: any) => (
                      <Button
                        key={list.status}
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(list.status)}
                        className={`shrink-0 gap-2 ${STATUS_COLORS[list.status]} hover:bg-opacity-20`}
                      >
                        {statusMap[list.status] || list.name}
                        <Badge variant="secondary" className="bg-background/50 text-xs px-1.5">
                          {list.entries.length}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {currentCollection.lists?.map((list: any) => {
                    const filteredEntries = list.entries.filter(filterBySearch)
                    const isExpanded = expandedSections[list.status]
                    const maxItemsToShow = 6
                    const hasMore = filteredEntries.length > maxItemsToShow
                    const displayedEntries = isExpanded ? filteredEntries : filteredEntries.slice(0, maxItemsToShow)

                    return (
                      <Card
                        key={list.name}
                        className="overflow-hidden"
                        ref={(el) => {
                          sectionRefs.current[list.status] = el
                        }}
                      >
                        <div className="p-6 border-b border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h2 className="text-xl font-semibold">{statusMap[list.status] || list.name}</h2>
                              <Badge variant="secondary" className={`${STATUS_COLORS[list.status]} border`}>
                                {filteredEntries.length}
                              </Badge>
                            </div>
                            {hasMore && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSection(list.status)}
                                className="gap-2 text-primary hover:text-primary/80"
                              >
                                {isExpanded ? "Mostra meno" : "Guarda tutti"}
                                <ArrowRight
                                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-6">
                          {filteredEntries.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground text-sm">
                              {searchQuery
                                ? "Nessun risultato trovato per la ricerca"
                                : "Nessun elemento in questa lista"}
                            </p>
                          ) : (
                            <>
                              <div
                                className={`${
                                  isExpanded
                                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                                    : "flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
                                }`}
                              >
                                {displayedEntries.map((entry: any) => (
                                  <div
                                    key={entry.id}
                                    className={`group relative ${!isExpanded ? "shrink-0 w-[160px] snap-start" : ""}`}
                                  >
                                    <Link
                                      href={`https://anilist.co/${activeMediaType}/${entry.media.id}`}
                                      target="_blank"
                                      className="block"
                                    >
                                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted ring-1 ring-border/50 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/50 group-hover:shadow-lg group-hover:shadow-primary/10">
                                        <Image
                                          src={entry.media.coverImage.large || entry.media.coverImage.medium}
                                          alt={entry.media.title.romaji}
                                          fill
                                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {entry.score > 0 && (
                                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full">
                                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-xs font-medium text-white">{entry.score}</span>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                      </div>

                                      <div className="mt-3 space-y-2 h-[60px] flex flex-col">
                                        <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors flex-1">
                                          {entry.media.title.romaji}
                                        </h3>
                                        {entry.progress > 0 && (
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                              <div
                                                className="bg-primary h-full rounded-full transition-all duration-300"
                                                style={{
                                                  width: `${
                                                    activeMediaType === "anime" && entry.media.episodes
                                                      ? (entry.progress / entry.media.episodes) * 100
                                                      : activeMediaType === "manga" && entry.media.chapters
                                                        ? (entry.progress / entry.media.chapters) * 100
                                                        : 0
                                                  }%`,
                                                }}
                                              />
                                            </div>
                                            <span className="shrink-0">
                                              {entry.progress}
                                              {activeMediaType === "anime" && entry.media.episodes
                                                ? `/${entry.media.episodes}`
                                                : activeMediaType === "manga" && entry.media.chapters
                                                  ? `/${entry.media.chapters}`
                                                  : ""}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </Link>

                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8 shadow-lg hover:scale-110 bg-background/90 backdrop-blur-sm"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          handleEditEntry(entry)
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-8 w-8 shadow-lg hover:scale-110"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          handleDeleteEntry(entry.id)
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {editingEntry && (
          <EditListEntryDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            entry={editingEntry}
            mediaType={activeMediaType}
            onSave={handleSaveEntry}
          />
        )}
      </div>
    </div>
  )
}
