"use client"

import { useAniList } from "@/contexts/anilist-context"
import { aniListManager } from "@/lib/anilist"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Film, BookOpen, Heart, ExternalLink, Clock } from "lucide-react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"

// --- Interfaces ---
interface Activity {
  id: number
  type: string
  status: string
  progress: string
  createdAt: number
  media: {
    id: number
    title: { romaji: string; english?: string }
    coverImage: { large?: string; medium?: string }
  }
}

interface MediaEntry {
  id: number
  mediaId: number
  status: string
  progress: number
  score: number
  media: {
    id: number
    title: { romaji: string; english?: string }
    coverImage: { large?: string; medium?: string }
    episodes?: number
    chapters?: number
  }
}

interface MediaList {
  name: string
  status: string
  entries: MediaEntry[]
}

// --- Loading Shimmer Component ---
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="h-56 bg-muted rounded-xl mb-8" />
        <div className="relative -mt-16 p-6 bg-card border border-border rounded-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-full bg-muted border-4 border-background" />
            <div className="space-y-2 flex-1">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-5 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoading } = useAniList()
  const [activities, setActivities] = useState<Activity[]>([])
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
    if (loadingRef.current || !user?.id) return
    loadingRef.current = true
    setLoadingLists(true)

    const activityQuery = `
      query ($userId: Int) {
        Page(page: 1, perPage: 10) {
          activities(userId: $userId, type: MEDIA_LIST, sort: ID_DESC) {
            ... on ListActivity {
              id; status; progress; createdAt; type
              media { id; title { romaji english }; coverImage { large medium } }
            }
          }
        }
      }
    `;

    try {
      const [animeData, mangaData, activityRes] = await Promise.all([
        aniListManager.getUserAnimeList(),
        aniListManager.getUserMangaList(),
        fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: activityQuery, variables: { userId: user.id } })
        }).then(res => res.json())
      ])

      setAnimeLists(animeData?.lists || [])
      setMangaLists(mangaData?.lists || [])
      setActivities(activityRes?.data?.Page?.activities || [])
      dataLoadedRef.current = true
    } catch (error) {
      console.error("Error loading profile data:", error)
    } finally {
      setLoadingLists(false)
      loadingRef.current = false
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString("it-IT", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getActivityDescription = (activity: Activity) => {
    const title = activity.media.title.english || activity.media.title.romaji
    const status = activity.status.toLowerCase()
    if (status.includes('watched episode')) return `ha guardato l'episodio ${activity.progress} di ${title}`
    if (status.includes('read chapter')) return `ha letto il capitolo ${activity.progress} di ${title}`
    if (status.includes('completed')) return `ha completato ${title}`
    return `ha aggiornato ${title}`
  }

  const translateListStatus = (status: string, name: string): string => {
    const translations: Record<string, string> = {
      CURRENT: "In Corso", COMPLETED: "Completati", PLANNING: "Pianificati", DROPPED: "Abbandonati", PAUSED: "In Pausa",
    }
    return translations[status] || name
  }

  if (isLoading) {
    return (
      <>
        <SlideOutMenu />
        <ProfileSkeleton />
      </>
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

  return (
    <div className="min-h-screen bg-background">
      <SlideOutMenu />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 overflow-hidden">
          {/* Banner Section - Fixed for Mobile Rounded Corners */}
          <div className="h-56 relative rounded-xl overflow-hidden shadow-sm">
            {user.bannerImage ? (
              <Image src={user.bannerImage} alt="Banner" fill className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background/20" />
          </div>

          {/* Profile Header */}
          <div className="relative -mt-16 pb-6 bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-6">
              <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
                <AvatarImage src={user.avatar?.large || user.avatar?.medium} />
                <AvatarFallback className="text-3xl bg-primary/10"><User size={48} /></AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary">ID: {user.id}</Badge>
                  <Link href={`https://anilist.co/user/${user.name}`} target="_blank">
                    <Badge variant="outline" className="gap-1.5 hover:bg-accent cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" /> Profilo AniList
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats - Removed Voto Medio and adjusted layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatsCard 
                icon={<Film className="w-4 h-4" />} 
                label="Anime" 
                value={user.statistics?.anime?.count} 
                sub={`${Math.round((user.statistics?.anime?.minutesWatched || 0) / 60)} ore watched`} 
                color="blue" 
              />
              <StatsCard 
                icon={<BookOpen className="w-4 h-4" />} 
                label="Manga" 
                value={user.statistics?.manga?.count} 
                sub={`${user.statistics?.manga?.chaptersRead || 0} cap. letti`} 
                color="green" 
              />
              <StatsCard 
                icon={<Heart className="w-4 h-4" />} 
                label="Preferiti" 
                value={(user.favourites?.anime?.nodes?.length || 0) + (user.favourites?.manga?.nodes?.length || 0)} 
                sub="totali" 
                color="pink" 
              />
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY SECTION */}
        {activities.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`https://anilist.co/${activity.type === 'ANIME_LIST' ? 'anime' : 'manga'}/${activity.media.id}`}
                    target="_blank"
                    className="flex items-start gap-4 p-3 rounded-lg border-l-2 border-transparent hover:border-l-primary hover:bg-muted/50 transition-all group"
                  >
                    <div className="relative w-14 h-20 flex-shrink-0 rounded overflow-hidden border">
                      <Image src={activity.media.coverImage.large || "/placeholder.svg"} alt="Cover" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                        <span className="font-bold">{user.name}</span> {getActivityDescription(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTime(activity.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <ListSection title="Liste Anime" icon={<Film />} lists={animeLists} translate={translateListStatus} type="anime" />
          <ListSection title="Liste Manga" icon={<BookOpen />} lists={mangaLists} translate={translateListStatus} type="manga" />
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon, label, value, sub, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-500/5 border-blue-500/20 text-blue-600",
    green: "bg-green-500/5 border-green-500/20 text-green-600",
    pink: "bg-pink-500/5 border-pink-500/20 text-pink-600",
  }
  return (
    <div className={`rounded-lg p-4 border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon} <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value || 0}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  )
}

function ListSection({ title, icon, lists, translate, type }: any) {
  if (lists.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-xl flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {lists.map((list: any) => (
          <div key={list.status}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{translate(list.status, list.name)}</h3>
              <Badge variant="outline">{list.entries.length}</Badge>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {list.entries.map((entry: any) => (
                <Link key={entry.id} href={`https://anilist.co/${type}/${entry.mediaId}`} target="_blank" className="group flex-shrink-0 w-32 snap-start">
                  <div className="aspect-[2/3] relative rounded-lg overflow-hidden border hover:scale-105 transition-all">
                    <Image src={entry.media.coverImage.large} alt="Media" fill className="object-cover" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
