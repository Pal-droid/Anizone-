"use client"

import { useAniList } from "@/contexts/anilist-context"
import { aniListManager } from "@/lib/anilist"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Film, BookOpen, Heart, ExternalLink, Clock, Star } from "lucide-react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"

interface MediaEntry {
  id: number
  mediaId: number
  status: string
  progress: number
  score: number
  updatedAt?: number
  createdAt?: number
  media: {
    id: number
    title: {
      romaji: string
      english?: string
      native?: string
    }
    coverImage: {
      large?: string
      medium?: string
    }
    episodes?: number
    chapters?: number
  }
}

interface MediaList {
  name: string
  status: string
  entries: MediaEntry[]
}

export default function ProfilePage() {
  const { user, isLoading } = useAniList()
  const [animeLists, setAnimeLists] = useState<MediaList[]>([])
  const [mangaLists, setMangaLists] = useState<MediaList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const loadingRef = useRef(false)
  const dataLoadedRef = useRef(false)

  useEffect(() => {
    if (user && !dataLoadedRef.current && !loadingRef.current) {
      loadUserLists()
    }
  }, [user])

  const loadUserLists = async () => {
    if (loadingRef.current) {
      console.log("[v0] Already loading lists, skipping...")
      return
    }

    loadingRef.current = true
    setLoadingLists(true)

    try {
      console.log("[v0] Starting to load user lists...")
      const [animeData, mangaData] = await Promise.all([
        aniListManager.getUserAnimeList(),
        aniListManager.getUserMangaList(),
      ])
      setAnimeLists(animeData?.lists || [])
      setMangaLists(mangaData?.lists || [])
      dataLoadedRef.current = true
      console.log("[v0] Successfully loaded lists")
    } catch (error) {
      console.error("Error loading lists:", error)
    } finally {
      setLoadingLists(false)
      loadingRef.current = false
    }
  }

  const getRecentActivity = () => {
    const allEntries: Array<MediaEntry & { type: "anime" | "manga" }> = []

    animeLists.forEach((list) => {
      list.entries.forEach((entry) => {
        allEntries.push({ ...entry, type: "anime" })
      })
    })

    mangaLists.forEach((list) => {
      list.entries.forEach((entry) => {
        allEntries.push({ ...entry, type: "manga" })
      })
    })

    // Sort by ID (most recent entries have higher IDs typically)
    return allEntries.sort((a, b) => b.id - a.id).slice(0, 6)
  }

  const getActivityDescription = (entry: MediaEntry & { type: "anime" | "manga" }) => {
    const title = entry.media.title.english || entry.media.title.romaji
    const isAnime = entry.type === "anime"
    const statusMap: Record<string, string> = {
      CURRENT: isAnime ? "sta guardando" : "sta leggendo",
      COMPLETED: isAnime ? "ha completato" : "ha completato",
      PLANNING: isAnime ? "pianifica di guardare" : "pianifica di leggere",
      DROPPED: isAnime ? "ha abbandonato" : "ha abbandonato",
      PAUSED: isAnime ? "ha messo in pausa" : "ha messo in pausa",
      REPEATING: isAnime ? "sta riguardando" : "sta rileggendo",
    }

    const action = statusMap[entry.status] || "ha aggiornato"
    return `${action} ${title}`
  }

  const translateListStatus = (status: string, name: string): string => {
    const translations: Record<string, string> = {
      CURRENT: "In Corso",
      COMPLETED: "Completati",
      PLANNING: "Pianificati",
      DROPPED: "Abbandonati",
      PAUSED: "In Pausa",
      REPEATING: "In Ripetizione",
    }
    return translations[status] || name
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SlideOutMenu />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento profilo...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SlideOutMenu />
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Accesso richiesto</CardTitle>
            <CardDescription>Devi effettuare l'accesso per visualizzare il tuo profilo.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const recentActivity = getRecentActivity()

  return (
    <div className="min-h-screen bg-background">
      <SlideOutMenu />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 overflow-hidden">
          {/* Banner Section with fade */}
          <div className="h-56 relative -mx-4 md:mx-0 md:rounded-t-lg overflow-hidden">
            {user.bannerImage ? (
              <Image
                src={user.bannerImage || "/placeholder.svg"}
                alt="Profile Banner"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
            )}
            {/* Fade overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </div>

          {/* Profile Info Section */}
          <div className="relative -mt-16 pb-6 bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-6">
              <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
                <AvatarImage src={user.avatar?.large || user.avatar?.medium || undefined} />
                <AvatarFallback className="text-3xl bg-primary/10">
                  <User size={48} />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary" className="gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    ID: {user.id}
                  </Badge>
                  <a
                    href={`https://anilist.co/user/${user.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Badge variant="outline" className="gap-1.5 hover:bg-accent cursor-pointer transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Profilo AniList
                    </Badge>
                  </a>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                  <Film className="w-4 h-4" />
                  <span className="text-sm font-medium">Anime</span>
                </div>
                <div className="text-2xl font-bold">{user.statistics?.anime?.count || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round((user.statistics?.anime?.minutesWatched || 0) / 60)} ore
                </div>
              </div>

              <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Manga</span>
                </div>
                <div className="text-2xl font-bold">{user.statistics?.manga?.count || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {user.statistics?.manga?.chaptersRead || 0} cap.
                </div>
              </div>

              <div className="bg-pink-500/5 rounded-lg p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 mb-2">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-medium">Preferiti</span>
                </div>
                <div className="text-2xl font-bold">
                  {(user.favourites?.anime?.nodes?.length || 0) + (user.favourites?.manga?.nodes?.length || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">totali</div>
              </div>

              <div className="bg-amber-500/5 rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Voto Medio</span>
                </div>
                <div className="text-2xl font-bold">{user.statistics?.anime?.meanScore?.toFixed(1) || "N/A"}</div>
                <div className="text-xs text-muted-foreground mt-1">su 10</div>
              </div>
            </div>
          </div>
        </div>

        {recentActivity.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attività Recente
              </CardTitle>
              <CardDescription>I tuoi ultimi aggiornamenti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`https://anilist.co/${entry.type}/${entry.mediaId}`}
                    target="_blank"
                    className="flex items-start gap-4 p-3 rounded-lg border-l-2 border-transparent hover:border-l-primary transition-all group"
                  >
                    <div className="relative w-14 h-20 flex-shrink-0 rounded overflow-hidden border group-hover:border-primary/50 transition-colors">
                      <Image
                        src={entry.media.coverImage.large || entry.media.coverImage.medium || "/placeholder.svg"}
                        alt={entry.media.title.english || entry.media.title.romaji}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                        {user.name} {getActivityDescription(entry)}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {entry.media.title.english || entry.media.title.romaji}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {entry.type === "anime" ? "Anime" : "Manga"}
                        </Badge>
                        {entry.progress > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Progresso: {entry.progress}
                            {entry.type === "anime"
                              ? entry.media.episodes
                                ? `/${entry.media.episodes}`
                                : ""
                              : entry.media.chapters
                                ? `/${entry.media.chapters}`
                                : ""}
                          </span>
                        )}
                        {entry.score > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{entry.score}/10</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loadingLists ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Caricamento liste...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {animeLists.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Film className="w-5 h-5" />
                    Le Mie Liste Anime
                  </CardTitle>
                  <CardDescription>
                    {animeLists.reduce((acc, list) => acc + list.entries.length, 0)} anime totali
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {animeLists.map((list) => (
                    <div key={list.status}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{translateListStatus(list.status, list.name)}</h3>
                        <Badge variant="outline">{list.entries.length}</Badge>
                      </div>
                      {list.entries.length > 0 ? (
                        <div className="relative">
                          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                            {list.entries.map((entry) => (
                              <Link
                                key={entry.id}
                                href={`https://anilist.co/anime/${entry.mediaId}`}
                                target="_blank"
                                className="group flex-shrink-0 w-32 snap-start"
                              >
                                <div className="aspect-[2/3] relative rounded-lg overflow-hidden border hover:border-primary/50 transition-all hover:scale-105 hover:shadow-lg">
                                  <Image
                                    src={
                                      entry.media.coverImage.large ||
                                      entry.media.coverImage.medium ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg"
                                    }
                                    alt={entry.media.title.english || entry.media.title.romaji}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                      <p className="text-white text-xs font-medium line-clamp-2">
                                        {entry.media.title.english || entry.media.title.romaji}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Nessun anime in questa lista</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {mangaLists.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Le Mie Liste Manga
                  </CardTitle>
                  <CardDescription>
                    {mangaLists.reduce((acc, list) => acc + list.entries.length, 0)} manga totali
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mangaLists.map((list) => (
                    <div key={list.status}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{translateListStatus(list.status, list.name)}</h3>
                        <Badge variant="outline">{list.entries.length}</Badge>
                      </div>
                      {list.entries.length > 0 ? (
                        <div className="relative">
                          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                            {list.entries.map((entry) => (
                              <Link
                                key={entry.id}
                                href={`https://anilist.co/manga/${entry.mediaId}`}
                                target="_blank"
                                className="group flex-shrink-0 w-32 snap-start"
                              >
                                <div className="aspect-[2/3] relative rounded-lg overflow-hidden border hover:border-primary/50 transition-all hover:scale-105 hover:shadow-lg">
                                  <Image
                                    src={
                                      entry.media.coverImage.large ||
                                      entry.media.coverImage.medium ||
                                      "/placeholder.svg" ||
                                      "/placeholder.svg"
                                    }
                                    alt={entry.media.title.english || entry.media.title.romaji}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                      <p className="text-white text-xs font-medium line-clamp-2">
                                        {entry.media.title.english || entry.media.title.romaji}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Nessun manga in questa lista</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
