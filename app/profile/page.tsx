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

interface MediaList {
  name: string
  status: string
  entries: any[]
}

// --- Modern Shimmering Loading Animation ---
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-56 bg-muted rounded-xl mb-8" />
        
        {/* Header Skeleton */}
        <div className="relative -mt-16 p-6 bg-card border border-border rounded-lg mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            <div className="w-32 h-32 rounded-full bg-muted border-4 border-background" />
            <div className="space-y-3 flex-1">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Activity Feed Skeleton */}
        <div className="h-64 bg-card border border-border rounded-lg" />
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

    // Corrected GraphQL Query (removed semicolons)
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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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

  if (isLoading || (user && loadingLists && activities.length === 0)) {
    return (
      <>
        <SlideOutMenu />
        <ProfileSkeleton />
      </>
    )
  }

  if (!user) return <div className="p-8 text-center">Please login...</div>

  return (
    <div className="min-h-screen bg-background">
      <SlideOutMenu />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 overflow-hidden">
          {/* Banner - Rounded on Mobile */}
          <div className="h-56 relative rounded-xl overflow-hidden shadow-md">
            {user.bannerImage ? (
              <Image src={user.bannerImage} alt="Banner" fill className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />
            )}
          </div>

          {/* Profile Header */}
          <div className="relative -mt-16 pb-6 bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-6">
              <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                <AvatarImage src={user.avatar?.large} />
                <AvatarFallback><User size={48} /></AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <Link href={`https://anilist.co/user/${user.name}`} target="_blank">
                  <Badge variant="outline" className="gap-1.5 hover:bg-accent cursor-pointer">
                    <ExternalLink className="w-3.5 h-3.5" /> AniList Profile
                  </Badge>
                </Link>
              </div>
            </div>

            {/* Stats - Grid of 3 (Voto Medio removed) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatsCard icon={<Film className="w-4 h-4" />} label="Anime" value={user.statistics?.anime?.count} sub="watched" color="blue" />
              <StatsCard icon={<BookOpen className="w-4 h-4" />} label="Manga" value={user.statistics?.manga?.count} sub="chapters" color="green" />
              <StatsCard icon={<Heart className="w-4 h-4" />} label="Favorites" value={(user.favourites?.anime?.nodes?.length || 0) + (user.favourites?.manga?.nodes?.length || 0)} sub="total" color="pink" />
            </div>
          </div>
        </div>

        {/* FEED: INTEGRATED ACTIVITY FEED */}
        {activities.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`https://anilist.co/anime/${activity.media.id}`}
                  target="_blank"
                  className="flex items-start gap-4 p-3 rounded-lg border-l-2 border-transparent hover:border-l-primary hover:bg-muted/50 transition-all group"
                >
                  <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden border">
                    <Image src={activity.media.coverImage.medium || "/placeholder.svg"} alt="Cover" fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm group-hover:text-primary transition-colors">
                      <span className="font-bold">{user.name}</span> {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Lists */}
        <div className="space-y-6">
          <ListSection title="Anime Lists" icon={<Film />} lists={animeLists} type="anime" />
          <ListSection title="Manga Lists" icon={<BookOpen />} lists={mangaLists} type="manga" />
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon, label, value, sub, color }: any) {
  const colors: any = {
    blue: "bg-blue-500/5 border-blue-500/20 text-blue-600",
    green: "bg-green-500/5 border-green-500/20 text-green-600",
    pink: "bg-pink-500/5 border-pink-500/20 text-pink-600",
  }
  return (
    <div className={`rounded-lg p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 text-sm font-medium">{icon} {label}</div>
      <div className="text-2xl font-bold text-foreground">{value || 0}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

function ListSection({ title, icon, lists, type }: any) {
  if (lists.length === 0) return null
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {lists.map((list: any) => (
          <div key={list.status}>
            <h3 className="text-sm font-semibold mb-3 opacity-70 uppercase tracking-wider">{list.status}</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {list.entries.map((entry: any) => (
                <Link key={entry.id} href={`https://anilist.co/${type}/${entry.mediaId}`} target="_blank" className="w-24 flex-shrink-0">
                  <div className="aspect-[2/3] relative rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all">
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
