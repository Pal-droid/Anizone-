"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { QuickListManager } from "@/components/quick-list-manager"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { deobfuscateId, obfuscateUrl } from "@/lib/utils"
import { ArrowLeft, BookOpen, Calendar, User, Palette, Star, ChevronDown, ChevronUp, FileImage } from "lucide-react"

type Chapter = {
  title: string
  url: string
  date: string
  isNew?: boolean
}

type Volume = {
  name: string
  image?: string
  chapters: Chapter[]
}

type MangaData = {
  title: string
  image: string
  type: string
  status: string
  author: string
  artist: string
  year: string
  genres: string[]
  trama: string
  volumes: Volume[]
  url: string
  alternativeTitles?: string
  totalVolumes?: string
  totalChapters?: string
  views?: string
}

export default function MangaMetadataPage() {
  const params = useParams()
  const router = useRouter()
  const [mangaData, setMangaData] = useState<MangaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set([0])) // First volume expanded by default

  const actualMangaId = deobfuscateId(params.id as string)

  useEffect(() => {
    const fetchMangaData = async () => {
      try {
        const response = await fetch(`/api/manga-info?id=${actualMangaId}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setMangaData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load manga data")
      } finally {
        setLoading(false)
      }
    }

    if (actualMangaId) {
      fetchMangaData()
    }
  }, [actualMangaId])

  const toggleVolume = (index: number) => {
    const newExpanded = new Set(expandedVolumes)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedVolumes(newExpanded)
  }

  if (loading) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu currentPath={`/manga/${params.id}`} />
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold">Caricamento...</h1>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    )
  }

  if (error || !mangaData) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu currentPath={`/manga/${params.id}`} />
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold">Errore</h1>
          </div>
        </header>
        <div className="px-4 py-8 text-center">
          <p className="text-red-600">{error || "Manga non trovato"}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu currentPath={`/manga/${params.id}`} />
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-lg font-bold line-clamp-1">{mangaData?.title || "Caricamento..."}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Manga Info Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex gap-4 p-6">
              <div className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mangaData?.image || "/placeholder.svg"}
                  alt={mangaData?.title || "Manga"}
                  className="w-28 h-40 object-cover rounded-lg shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/manga-cover.png"
                  }}
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-balance leading-tight mb-2">{mangaData?.title}</h1>

                  <div className="space-y-3">
                    {mangaData?.author && (
                      <div className="flex items-center gap-2 text-sm">
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium">Autore:</span>
                        <span className="text-muted-foreground">{mangaData.author}</span>
                      </div>
                    )}

                    {mangaData?.artist && mangaData.artist !== mangaData.author && (
                      <div className="flex items-center gap-2 text-sm">
                        <Palette size={16} className="text-muted-foreground" />
                        <span className="font-medium">Artista:</span>
                        <span className="text-muted-foreground">{mangaData.artist}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      {mangaData?.type && (
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-muted-foreground" />
                          <Badge variant="secondary">{mangaData.type}</Badge>
                        </div>
                      )}

                      {mangaData?.status && (
                        <div className="flex items-center gap-2">
                          <Star size={16} className="text-muted-foreground" />
                          <Badge variant={mangaData.status === "Finito" ? "default" : "outline"}>
                            {mangaData.status}
                          </Badge>
                        </div>
                      )}

                      {mangaData?.year && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span className="text-muted-foreground">{mangaData.year}</span>
                        </div>
                      )}
                    </div>

                    {mangaData?.genres.length > 0 && (
                      <div>
                        <span className="text-sm font-medium mb-2 block">Generi:</span>
                        <div className="flex flex-wrap gap-1">
                          {mangaData.genres.map((genre, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <QuickListManager
                    itemId={actualMangaId}
                    itemTitle={mangaData.title}
                    itemImage={mangaData.image}
                    type="manga"
                  />
                  {mangaData.volumes.length > 0 && mangaData.volumes[0].chapters.length > 0 && (
                    <Link
                      href={`/manga/${params.id}/read?u=${obfuscateUrl(mangaData.volumes[0].chapters[0].url)}&title=${encodeURIComponent(mangaData.title)}&chapter=${encodeURIComponent(mangaData.volumes[0].chapters[0].title)}`}
                    >
                      <Button size="sm" variant="outline">
                        <BookOpen size={16} className="mr-2" />
                        Inizia a leggere
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {mangaData?.trama && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trama</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{mangaData.trama}</p>
            </CardContent>
          </Card>
        )}

        {mangaData?.volumes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Capitoli
                <Badge variant="secondary" className="text-xs">
                  {mangaData.volumes.reduce((total, vol) => total + vol.chapters.length, 0)} capitoli
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mangaData.volumes.map((volume, volumeIndex) => (
                <div key={volumeIndex} className="border rounded-lg overflow-hidden">
                  {mangaData.volumes.length === 1 && volume.name === "Chapters" ? (
                    <div className="p-3 space-y-1">
                      {volume.chapters.map((chapter, chapterIndex) => (
                        <div
                          key={chapterIndex}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md transition-colors group"
                        >
                          <Link
                            href={`/manga/${params.id}/read?u=${obfuscateUrl(chapter.url)}&title=${encodeURIComponent(mangaData.title)}&chapter=${encodeURIComponent(chapter.title)}`}
                            className="flex-1 text-sm hover:text-primary transition-colors group-hover:text-primary"
                          >
                            {chapter.title
                              .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, "")
                              .replace(/\s*$$\d{1,2}\/\d{1,2}\/\d{4}$$.*$/, "")}
                          </Link>
                          <div className="flex items-center gap-2">
                            {chapter.isNew && (
                              <Badge variant="destructive" className="text-xs px-2 py-0">
                                NUOVO
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{chapter.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Collapsible open={expandedVolumes.has(volumeIndex)} onOpenChange={() => toggleVolume(volumeIndex)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <FileImage size={18} className="text-muted-foreground" />
                            <div className="text-left">
                              <span className="font-medium">{volume.name}</span>
                              <p className="text-xs text-muted-foreground mt-1">{volume.chapters.length} capitoli</p>
                            </div>
                          </div>
                          {expandedVolumes.has(volumeIndex) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-muted/20">
                          <div className="p-3 space-y-1">
                            {volume.chapters.map((chapter, chapterIndex) => (
                              <div
                                key={chapterIndex}
                                className="flex items-center justify-between p-3 hover:bg-background rounded-md transition-colors group"
                              >
                                <Link
                                  href={`/manga/${params.id}/read?u=${obfuscateUrl(chapter.url)}&title=${encodeURIComponent(mangaData.title)}&chapter=${encodeURIComponent(chapter.title)}`}
                                  className="flex-1 text-sm hover:text-primary transition-colors group-hover:text-primary"
                                >
                                  {chapter.title
                                    .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, "")
                                    .replace(/\s*$$\d{1,2}\/\d{1,2}\/\d{4}$$.*$/, "")}
                                </Link>
                                <div className="flex items-center gap-2">
                                  {chapter.isNew && (
                                    <Badge variant="destructive" className="text-xs px-2 py-0">
                                      NUOVO
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">{chapter.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
