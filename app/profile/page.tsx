"use client"

import { useAniList } from "@/contexts/anilist-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { User, Calendar, Film, BookOpen, Heart, ExternalLink, ArrowLeft, List } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAniList()
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] Profile page - isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "user:", user?.name)
  }, [isLoading, isAuthenticated, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Accesso richiesto</CardTitle>
            <CardDescription>Devi effettuare l'accesso per visualizzare il tuo profilo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Torna alla home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatar?.large || user.avatar?.medium || undefined} />
                <AvatarFallback>
                  <User size={48} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-muted-foreground mb-4">Account AniList</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    ID: {user.id}
                  </Badge>
                  <a
                    href={`https://anilist.co/user/${user.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Badge variant="outline" className="flex items-center gap-1 hover:bg-muted cursor-pointer">
                      <ExternalLink className="w-3 h-3" />
                      Visualizza su AniList
                    </Badge>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Film className="w-4 h-4" />
                Anime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.statistics?.anime?.count || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((user.statistics?.anime?.minutesWatched || 0) / 60)} ore guardate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                Manga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.statistics?.manga?.count || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {user.statistics?.manga?.chaptersRead || 0} capitoli letti
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Heart className="w-4 h-4" />
                Preferiti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(user.favourites?.anime?.nodes?.length || 0) + (user.favourites?.manga?.nodes?.length || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Anime e manga</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni account</CardTitle>
            <CardDescription>Dettagli del tuo account AniList</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Username</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ID Utente</span>
              <span className="text-sm font-medium">{user.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Anime nella lista</span>
              <span className="text-sm font-medium">{user.statistics?.anime?.count || 0}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Manga nella lista</span>
              <span className="text-sm font-medium">{user.statistics?.manga?.count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button asChild className="flex-1">
            <Link href="/lists">
              <List className="mr-2 h-4 w-4" />
              Le mie liste
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/">
              <Film className="mr-2 h-4 w-4" />
              Cerca Anime
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
