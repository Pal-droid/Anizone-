"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { QuickListManager } from "@/components/quick-list-manager"
import { SlideOutMenu, type SlideOutMenuHandle } from "@/components/slide-out-menu"
import { deobfuscateId } from "@/lib/utils"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  User,
  Palette,
  Star,
  ChevronDown,
  ChevronUp,
  FileImage,
  Menu,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Chapter = {
  title: string
  url: string
  date: string
  isNew?: boolean
}

type ChapterSource = {
  available: boolean
  id: string
  url: string
  title: string
  date: string | number
  hash_id?: string
  slug?: string
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
  anilistId: number | null
  sources: Array<{
    name: string
    slug: string
    id: string
    hash_id?: string
  }>
}

type UnifiedChapter = {
  chapter_number: number
  sources: {
    [sourceName: string]: ChapterSource
  }
}

export default function MangaPage() {
  const params = useParams()
  const router = useRouter()
  const menuRef = useRef<SlideOutMenuHandle>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mangaData, setMangaData] = useState<MangaData | null>(null)
  const [selectedSource, setSelectedSource] = useState<string>("")
  const [unifiedChapters, setUnifiedChapters] = useState<UnifiedChapter[]>([])
  const [fetchingUnifiedChapters, setFetchingUnifiedChapters] = useState(false)
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set([0]))

  const actualMangaId = deobfuscateId(params.id as string)

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/manga")
    }
  }

  useEffect(() => {
    const fetchMangaData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const apiParams = new URLSearchParams({ id: actualMangaId })

        // Add source parameters if available
        if (urlParams.has("comix_hash_id")) {
          apiParams.append("comix_hash_id", urlParams.get("comix_hash_id")!)
        }
        if (urlParams.has("comix_slug")) {
          apiParams.append("comix_slug", urlParams.get("comix_slug")!)
        }
        if (urlParams.has("world_id")) {
          apiParams.append("world_id", urlParams.get("world_id")!)
        }
        if (urlParams.has("world_slug")) {
          apiParams.append("world_slug", urlParams.get("world_slug")!)
        }

        const response = await fetch(`/api/manga-info-new?${apiParams}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        
        const data = await response.json()
        setMangaData(data)
        
        if (data.sources && data.sources.length > 0) {
          const comixSource = data.sources.find((s: any) => s.name === "Comix")
          setSelectedSource(comixSource?.name || data.sources[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load manga data")
      } finally {
        setLoading(false)
      }
    }

    fetchMangaData()
  }, [actualMangaId])

  useEffect(() => {
    const fetchUnifiedChapters = async () => {
      if (!mangaData || !selectedSource || !mangaData.sources) return

      const sourceInfo = mangaData.sources.find((s) => s.name === selectedSource)
      if (!sourceInfo) return

      setFetchingUnifiedChapters(true)
      try {
        const params = new URLSearchParams({
          source: selectedSource,
        })

        if (selectedSource === "Comix") {
          params.append("comix_hash_id", sourceInfo.hash_id || "")
          params.append("comix_slug", sourceInfo.slug || "")
        } else if (selectedSource === "World") {
          params.append("world_id", sourceInfo.id || "")
          params.append("world_slug", sourceInfo.slug || "")
        }

        const response = await fetch(`/api/manga-chapters-new?${params}`)
        if (!response.ok) throw new Error("Failed to fetch chapters")

        const chapters = await response.json()
        setUnifiedChapters(chapters)
      } catch (err) {
        console.error("[v0] Error fetching unified chapters:", err)
        setUnifiedChapters([])
      } finally {
        setFetchingUnifiedChapters(false)
      }
    }

    fetchUnifiedChapters()
  }, [selectedSource, mangaData])

  const toggleVolume = (index: number) => {
    const newExpanded = new Set(expandedVolumes)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedVolumes(newExpanded)
  }

  const displayVolumes = transformUnifiedChaptersToVolumes(unifiedChapters, selectedSource, mangaData?.sources)

  if (loading) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu ref={menuRef} hideButton />
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
            <button
              onClick={() => menuRef.current?.open()}
              className="hover:text-primary transition-colors p-1"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft size={16} className="mr-2" />
              Indietro
            </Button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento manga...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !mangaData) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu ref={menuRef} hideButton />
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
            <button
              onClick={() => menuRef.current?.open()}
              className="hover:text-primary transition-colors p-1"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft size={16} className="mr-2" />
              Indietro
            </Button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <FileImage size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Errore nel caricamento</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleGoBack} className="mt-4">
              Torna indietro
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const oldestChapter = displayVolumes[0]?.chapters[displayVolumes[0].chapters.length - 1]

  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu ref={menuRef} hideButton />
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => menuRef.current?.open()}
            className="hover:text-primary transition-colors p-1"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft size={16} className="mr-2" />
            Indietro
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            <Card className="overflow-hidden">
              <div className="aspect-[3/4] overflow-hidden bg-muted">
                <img
                  src={mangaData.image || "/placeholder.svg"}
                  alt={mangaData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{mangaData.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{mangaData.type}</Badge>
                <Badge variant={mangaData.status === "Finito" ? "default" : "outline"}>
                  {mangaData.status}
                </Badge>
                {mangaData.year && <Badge variant="outline">{mangaData.year}</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {mangaData.author && (
                <div className="flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" />
                  <span>
                    <strong>Autore:</strong> {mangaData.author}
                  </span>
                </div>
              )}
              {mangaData.artist && (
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-muted-foreground" />
                  <span>
                    <strong>Artista:</strong> {mangaData.artist}
                  </span>
                </div>
              )}
            </div>

            {mangaData.genres && mangaData.genres.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Generi</h3>
                <div className="flex flex-wrap gap-2">
                  {mangaData.genres.map((genre) => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {mangaData.trama && (
              <div>
                <h3 className="font-semibold mb-2">Trama</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mangaData.trama}</p>
              </div>
            )}

            <div className="mt-2 w-full flex justify-center">
              <QuickListManager
                itemId={actualMangaId}
                itemTitle={mangaData.title}
                itemImage={mangaData.image}
                anilistMediaId={mangaData.anilistId || undefined}
                itemPath={`/manga/${params.id}`}
              />
            </div>

            {oldestChapter && (
              <Link
                href={createChapterReadingUrl(oldestChapter, selectedSource, actualMangaId, mangaData.title, mangaData.sources)}
                className="w-full flex justify-center"
              >
                <Button size="sm" variant="outline" className="mt-2 w-full bg-transparent">
                  <BookOpen size={16} className="mr-2" />
                  Inizia a leggere
                </Button>
              </Link>
            )}
          </div>
        </div>

        {mangaData.sources && mangaData.sources.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Fonti disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Fonte:</span>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mangaData.sources.map((source) => (
                      <SelectItem key={source.name} value={source.name}>
                        {source.name === "Comix" ? "Mix" : source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capitoli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fetchingUnifiedChapters ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento capitoli...</div>
            ) : (
              displayVolumes.map((volume, volumeIndex) => (
                <div key={volumeIndex} className="border rounded-lg overflow-hidden">
                  {displayVolumes.length === 1 && volume.name === "Chapters" ? (
                    <div className="p-3 space-y-1">
                      {volume.chapters.map((chapter, chapterIndex) => (
                        <div
                          key={chapterIndex}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md transition-colors group"
                        >
                          <Link
                            href={createChapterReadingUrl(chapter, selectedSource, actualMangaId, mangaData.title, mangaData.sources)}
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
                    <Collapsible
                      open={expandedVolumes.has(volumeIndex)}
                      onOpenChange={() => toggleVolume(volumeIndex)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${expandedVolumes.has(volumeIndex) ? "rotate-180" : ""}`}
                            />
                            <span className="font-medium">{volume.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {volume.chapters.length} capitoli
                            </Badge>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 pt-0 space-y-1">
                          {volume.chapters.map((chapter, chapterIndex) => (
                            <div
                              key={chapterIndex}
                              className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md transition-colors group"
                            >
                              <Link
                                href={createChapterReadingUrl(chapter, selectedSource, actualMangaId, mangaData.title, mangaData.sources)}
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
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function transformUnifiedChaptersToVolumes(
  unifiedChapters: UnifiedChapter[],
  source: string,
  sources?: Array<{ name: string; slug: string; id: string; hash_id?: string }>,
): Volume[] {
  const sourceInfo = sources?.find((s) => s.name === source)
  const comixInfo = sources?.find((s) => s.name === "Comix")
  const worldInfo = sources?.find((s) => s.name === "World")

  const chapters = unifiedChapters
    .map((ch) => {
      const sourceData = ch.sources?.[source]
      if (!sourceData || !sourceData.available) return null

      let formattedDate = ""
      if (typeof sourceData.date === "number") {
        formattedDate = new Date(sourceData.date * 1000).toLocaleDateString("it-IT")
      } else {
        formattedDate = sourceData.date || ""
      }

      return {
        title: sourceData.title,
        url: sourceData.url,
        date: formattedDate,
        isNew: false, // Could be implemented based on date logic
      }
    })
    .filter((ch): ch is NonNullable<typeof ch> => ch !== null)

  if (chapters.length === 0) return []

  return [{ name: "Chapters", chapters }]
}

function createChapterReadingUrl(
  chapter: Chapter,
  source: string,
  mangaId: string,
  mangaTitle: string,
  sources?: Array<{ name: string; slug: string; id: string; hash_id?: string }>,
): string {
  const sourceInfo = sources?.find((s) => s.name === source)
  const comixInfo = sources?.find((s) => s.name === "Comix")
  const worldInfo = sources?.find((s) => s.name === "World")

  if (source === "Comix" && sourceInfo) {
    const params = new URLSearchParams({
      _unified: "true",
      _source: "Comix",
      _hash_id: sourceInfo.hash_id || "",
      _slug: sourceInfo.slug || "",
      _chapter_url: chapter.url,
    })
    if (worldInfo) {
      params.append("_world_id", worldInfo.id)
      params.append("_world_slug", worldInfo.slug)
    }
    return `/manga/${mangaId}/read?${params.toString()}&title=${encodeURIComponent(mangaTitle)}&chapter=${encodeURIComponent(chapter.title)}`
  } else if (source === "World") {
    const params = new URLSearchParams({
      _unified: "true",
      _source: "World",
      _chapter_url: chapter.url,
    })
    if (comixInfo) {
      params.append("_comix_hash_id", comixInfo.hash_id || "")
      params.append("_comix_slug", comixInfo.slug)
    }
    return `/manga/${mangaId}/read?${params.toString()}&title=${encodeURIComponent(mangaTitle)}&chapter=${encodeURIComponent(chapter.title)}`
  } else {
    // Fallback to legacy format
    return `/manga/${mangaId}/read?_unified=true&_source=${source}&_chapter_url=${encodeURIComponent(chapter.url)}&title=${encodeURIComponent(mangaTitle)}&chapter=${encodeURIComponent(chapter.title)}`
  }
}
