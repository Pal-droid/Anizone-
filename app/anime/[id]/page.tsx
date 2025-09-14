"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Play, Calendar, Star, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { QuickListManager } from "@/components/quick-list-manager"
import Link from "next/link"

interface AnimeInfo {
  title: string
  description: string
  image: string
  genre: string[]
  year: number
  status: string
  rating?: string
  episodes?: number
  studio?: string
}

export default function AnimePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnimeInfo = async () => {
      try {
        console.log("[v0] Loading anime info for ID:", params.id)

        const response = await fetch(`/api/anime-meta?path=${encodeURIComponent(params.id)}`)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Anime metadata loaded:", data)

          setAnimeInfo({
            title: data.meta?.title || params.id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            description: data.meta?.description || "Descrizione non disponibile.",
            image: data.meta?.image || "/anime-poster.png",
            genre: data.meta?.genre || ["Anime"],
            year: data.meta?.year || new Date().getFullYear(),
            status: data.meta?.status || "Sconosciuto",
            rating: data.meta?.rating,
            episodes: data.meta?.episodes,
            studio: data.meta?.studio,
          })
        } else {
          console.log("[v0] API failed, using fallback data")
          setAnimeInfo({
            title: params.id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            description: "Descrizione non disponibile. Seleziona un episodio per iniziare a guardare.",
            image: "/anime-poster.png",
            genre: ["Anime"],
            year: new Date().getFullYear(),
            status: "Disponibile",
          })
        }
      } catch (error) {
        console.error("[v0] Error loading anime info:", error)
        setError("Errore nel caricamento delle informazioni")

        setAnimeInfo({
          title: params.id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          description: "Descrizione non disponibile. Seleziona un episodio per iniziare a guardare.",
          image: "/anime-poster.png",
          genre: ["Anime"],
          year: new Date().getFullYear(),
          status: "Disponibile",
        })
      } finally {
        setLoading(false)
      }
    }

    loadAnimeInfo()
  }, [params.id])

  const handleWatchClick = () => {
    const animePath = `/play/${params.id}/episode-1`
    router.push(`/watch?path=${encodeURIComponent(animePath)}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-muted rounded"></div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error && !animeInfo) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">Torna alla Home</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="glass bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground">Anime / {animeInfo?.title || params.id}</div>
        </div>

        {animeInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Poster and Actions */}
            <div className="space-y-4">
              <Card className="glass overflow-hidden">
                <img
                  src={animeInfo.image || "/placeholder.svg"}
                  alt={animeInfo.title}
                  className="w-full aspect-[3/4] object-cover"
                />
              </Card>

              <div className="space-y-3">
                <Button
                  onClick={handleWatchClick}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Guarda Ora
                </Button>

                <QuickListManager
                  itemId={params.id}
                  itemTitle={animeInfo.title}
                  itemImage={animeInfo.image}
                  type="anime"
                  itemPath={`/play/${params.id}`}
                />
              </div>
            </div>

            {/* Info and Description */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{animeInfo.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {animeInfo.genre.map((g) => (
                    <Badge key={g} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>

              <Card className="glass">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">Descrizione</h2>
                  <p className="text-muted-foreground leading-relaxed">{animeInfo.description}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass">
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-sm text-muted-foreground">Anno</div>
                    <div className="font-semibold">{animeInfo.year}</div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-sm text-muted-foreground">Stato</div>
                    <div className="font-semibold">{animeInfo.status}</div>
                  </CardContent>
                </Card>

                {animeInfo.rating && (
                  <Card className="glass">
                    <CardContent className="p-4 text-center">
                      <Star className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-sm text-muted-foreground">Voto</div>
                      <div className="font-semibold">{animeInfo.rating}</div>
                    </CardContent>
                  </Card>
                )}

                {animeInfo.episodes && (
                  <Card className="glass">
                    <CardContent className="p-4 text-center">
                      <Play className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-sm text-muted-foreground">Episodi</div>
                      <div className="font-semibold">{animeInfo.episodes}</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {animeInfo.studio && (
                <Card className="glass">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Studio</h3>
                    <p className="text-muted-foreground">{animeInfo.studio}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
