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

// --- Loading Skeleton Components ---
const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
)

const ProfileSkeleton = () => (
  <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
    <div className="h-56 bg-muted rounded-xl animate-pulse" />
    <div className="relative -mt-16 p-6 bg-card border rounded-lg space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-muted animate-pulse border-4 border-background" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
    <div className="grid gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  </div>
)

// --- Main Page Component ---
export default function ProfilePage() {
  const { user, isLoading: userLoading } = useAniList()
  const [activities, setActivities] = useState<Activity[]>([])
  const [animeLists, setAnimeLists] = useState<MediaList[]>([])
  const [mangaLists, setMangaLists] = useState<MediaList[]>([])
  const [isDataFetching, setIsDataFetching] = useState(false)
  const loadingRef = useRef(false)
  const dataLoadedRef = useRef(false)

  useEffect(() => {
    if (user && !dataLoadedRef.current && !loadingRef.current) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (loadingRef.current || !user?.id) return

    loadingRef.current = true
    setIsDataFetching(true)

    const activityQuery = `
      query ($userId: Int) {
        Page(page: 1, perPage: 10) {
          activities(userId: $userId, type: MEDIA_LIST, sort: ID_DESC) {
            ... on ListActivity {
              id
              status
              progress
              createdAt
              type
              media {
                id
                title { romaji english }
                coverImage { large medium }
              }
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
      console.error("Error loading profile:", error)
    } finally {
      setIsDataFetching(false)
      loadingRef.current = false
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min fa`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ore fa`
    return date.toLocaleDateString("it-IT", { day: 'numeric', month: 'short' })
  }

  const getActivityDescription = (activity: Activity) => {
    const title = activity.media.title.english || activity.media.title.romaji
    const s = activity.status.toLowerCase()
    if (s.includes('watched episode')) return `ha guardato l'ep. ${activity.progress} di ${title}`
    if (s.includes('read chapter')) return `ha letto il cap. ${activity.progress} di ${title}`
    if (s.includes('completed')) return `ha completato ${title}`
    if (s.includes('dropped')) return `ha abbandonato ${title}`
    return `ha aggiornato ${title}`
  }

  if (userLoading || (isDataFetching && !dataLoadedRef.current)) {
    return (
      <div className="min-h-screen bg-background">
        <SlideOutMenu />
        <ProfileSkeleton />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Accesso richiesto</CardTitle>
            <CardDescription>Connettiti ad AniList per vedere il tuo profilo.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      <SlideOutMenu />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Banner Section */}
        <div className="relative h-64 -mx-4 md:mx-0 md:rounded-t-2xl overflow-hidden group">
          {user.bannerImage ? (
            <Image src={user.bannerImage} alt="Banner" fill className="object-cover transition-transform duration-1000 group-hover:scale-105" priority />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
        </div>

        {/* Profile Card */}
        <div className="relative -mt-20 pb-8 bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
            <Avatar className="w-36 h-36 border-4 border-background shadow-2xl ring-2 ring-primary/20">
              <AvatarImage src={user.avatar?.large} />
              <AvatarFallback><User size={50} /></AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight">{user.name}</h1>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="px-3 py-1">ID: {user.id}</Badge>
                <Link href={`https://anilist.co/user/${user.name}`} target="_blank">
                  <Badge variant="outline" className="gap-2 px-3 py-1 hover:bg-primary hover:text-white transition-colors">
                    <ExternalLink size={14} /> AniList
                  </Badge>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon={<Film />} label="Anime" value={user.statistics?.anime?.count} sub="Titoli" color="text-blue-500" />
            <StatsCard icon={<BookOpen />} label="Manga" value={user.statistics?.manga?.count} sub="Volumi" color="text-emerald-500" />
            <StatsCard icon={<Heart />} label="Favoriti" value={(user.favourites?.anime?.nodes?.length || 0)} sub="Totali" color="text-rose-500" />
            <StatsCard icon={<Star />} label="Score" value={user.statistics?.anime?.meanScore} sub="Media" color="text-amber-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="text-primary" /> Attività
            </h2>
            <Card className="border-none bg-muted/30 shadow-none">
              <CardContent className="p-4 space-y-4">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 group">
                      <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                        <Image src={activity.media.coverImage.medium || ""} alt="cover" fill className="object-cover" />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <p className="text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {getActivityDescription(activity)}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                          {formatTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna attività recente.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Library Preview */}
          <div className="lg:col-span-2 space-y-8">
             <h2 className="text-2xl font-bold flex items-center gap-2">
                <Film className="text-primary" /> Continua a guardare
             </h2>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {animeLists.find(l => l.status === 'CURRENT')?.entries.slice(0, 4).map(entry => (
                 <Link key={entry.id} href={`https://anilist.co/anime/${entry.mediaId}`} target="_blank" className="group">
                    <div className="aspect-[2/3] relative rounded-xl overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
                      <Image src={entry.media.coverImage.large || ""} alt="cover" fill className="object-cover" />
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black text-[10px] text-white">
                        Episodio {entry.progress}
                      </div>
                    </div>
                 </Link>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1 hover:shadow-md transition-shadow">
      <div className={`${color} bg-current/10 p-2 rounded-full mb-1`}>
        {icon}
      </div>
      <div className="text-2xl font-black">{value || 0}</div>
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</div>
    </div>
  )
}
