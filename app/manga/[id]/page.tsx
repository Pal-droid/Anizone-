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
import { deobfuscateId, obfuscateUrl } from "@/lib/utils"
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
  alternativeTitles?: string
  totalVolumes?: string
  totalChapters?: string
  views?: string
  anilistId?: string
  sources?: Array<{
    name: string
    slug: string
    id: string
    hash_id?: string
  }>
}

export default function MangaMetadataPage() {
  const params = useParams()
  const router = useRouter()
  const menuRef = useRef<SlideOutMenuHandle>(null)
  const [mangaData, setMangaData] = useState<MangaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set([0]))
  const [selectedSource, setSelectedSource] = useState<string>("")
  const [unifiedChapters, setUnifiedChapters] = useState<any[]>([])
  const [fetchingUnifiedChapters, setFetchingUnifiedChapters] = useState(false)

  const actualMangaId = deobfuscateId(params.id as string)

  const handleGoBack = () => {
    router.push("/manga")
  }

  useEffect(() => {
    const fetchMangaData = async () => {
      try {
        const response = await fetch(`/api/manga-info?id=${actualMangaId}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        setMangaData(data)
        if (data.sources && data.sources.length > 0) {
          setSelectedSource(data.sources[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load manga data")
      } finally {
        setLoading(false)
      }
    }

    if (actualMangaId) fetchMangaData()
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
          slug: sourceInfo.slug,
        })

        if (selectedSource === "Comix" && sourceInfo.hash_id) {
          params.append("hash_id", sourceInfo.hash_id)
        } else if (selectedSource === "World") {
          params.append("manga_id", sourceInfo.id)
        }

        const response = await fetch(`/api/manga-unified-chapters?${params}`)
        if (!response.ok) throw new Error("Failed to fetch chapters")

        const chapters = await response.json()
        console.log("[v0] Unified chapters fetched:", chapters.length)
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
    if (newExpanded.has(index)) newExpanded.delete(index)
    else newExpanded.add(index)
    setExpandedVolumes(newExpanded)
  }

  const displayVolumes =
    unifiedChapters.length > 0
      ? transformUnifiedChaptersToVolumes(unifiedChapters, selectedSource, mangaData?.sources)
      : mangaData?.volumes || []

  if (loading) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu ref={menuRef} currentPath={`/manga/${params.id}`} hideButton />
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
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold">Caricamento...</h1>
          </div>
        </header>
        <div className="px-4 py-6 space-y-6 animate-pulse max-w-5xl mx-auto">
          <div className="w-full flex justify-center">
            <div className="w-28 h-40 md:w-48 md:h-64 bg-muted rounded-lg shadow-md"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-48 bg-muted rounded"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-6 w-16 bg-muted rounded-full"></div>
              ))}
          </div>
          <div className="space-y-2">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-4 w-full bg-muted rounded"></div>
              ))}
          </div>
          <div className="space-y-2">
            {Array(2)
              .fill(0)
              .map((_, volIndex) => (
                <div key={volIndex} className="border rounded-lg p-4 space-y-2">
                  <div className="h-5 w-40 bg-muted rounded"></div>
                  {Array(3)
                    .fill(0)
                    .map((_, chapIndex) => (
                      <div key={chapIndex} className="h-4 w-full bg-muted rounded"></div>
                    ))}
                </div>
              ))}
          </div>
        </div>
      </main>
    )
  }

  if (error || !mangaData) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu ref={menuRef} currentPath={`/manga/${params.id}`} hideButton />
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

  const lastVolume = mangaData.volumes[mangaData.volumes.length - 1]
  const oldestChapter = lastVolume.chapters[lastVolume.chapters.length - 1]

  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu ref={menuRef} currentPath={`/manga/${params.id}`} hideButton />
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
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-lg font-bold line-clamp-1">{mangaData?.title || "Caricamento..."}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="overflow-hidden sticky top-20">
              <CardContent className="p-6 flex flex-col gap-3 items-center text-center">
                <img
                  src={mangaData.image || "/placeholder.svg"}
                  alt={mangaData.title || "Manga"}
                  className="w-full max-w-[200px] h-auto object-cover rounded-lg shadow-md"
                  onError={(e) => ((e.target as HTMLImageElement).src = "/manga-cover.png")}
                />
                <h1 className="text-2xl font-bold text-balance leading-tight">{mangaData.title}</h1>
                {mangaData.author && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{mangaData.author}</span>
                  </div>
                )}
                {mangaData.artist && mangaData.artist !== mangaData.author && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Palette size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{mangaData.artist}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  {mangaData.type && (
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen size={16} className="text-muted-foreground" />
                      <Badge variant="secondary">{mangaData.type}</Badge>
                    </div>
                  )}
                  {mangaData.status && (
                    <div className="flex items-center justify-center gap-1">
                      <Star size={16} className="text-muted-foreground" />
                      <Badge variant={mangaData.status === "Finito" ? "default" : "outline"}>{mangaData.status}</Badge>
                    </div>
                  )}
                  {mangaData.year && (
                    <div className="flex items-center justify-center gap-1">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">{mangaData.year}</span>
                    </div>
                  )}
                </div>
                <hr className="w-full border-t border-muted/50 my-2" />
                {mangaData.genres.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {mangaData.genres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-2 w-full flex justify-center">
                  <QuickListManager
                    itemId={actualMangaId}
                    itemTitle={mangaData.title}
                    itemImage={mangaData.image}
                    anilistMediaId={mangaData.anilistId}
                    itemPath={`/manga/${params.id}`}
                  />
                </div>
                {mangaData.volumes.length > 0 && lastVolume.chapters.length > 0 && (
                  <Link
                    href={`/manga/${params.id}/read?u=${obfuscateUrl(
                      oldestChapter.url,
                    )}&title=${encodeURIComponent(mangaData.title)}&chapter=${encodeURIComponent(oldestChapter.title)}&source=${selectedSource}`}
                    className="w-full flex justify-center"
                  >
                    <Button size="sm" variant="outline" className="mt-2 w-full bg-transparent">
                      <BookOpen size={16} className="mr-2" />
                      Inizia a leggere
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {mangaData.trama && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Trama</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{mangaData.trama}</p>
                </CardContent>
              </Card>
            )}

            {displayVolumes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Capitoli
                      <Badge variant="secondary" className="text-xs">
                        {displayVolumes.reduce((total, vol) => total + vol.chapters.length, 0)} capitoli
                      </Badge>
                    </CardTitle>
                    {mangaData?.sources && mangaData.sources.length > 1 && (
                      <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Fonte" />
                        </SelectTrigger>
                        <SelectContent>
                          {mangaData.sources.map((source) => (
                            <SelectItem key={source.name} value={source.name}>
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
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
                                  href={`/manga/${params.id}/read?u=${obfuscateUrl(chapter.url)}&title=${encodeURIComponent(
                                    mangaData.title,
                                  )}&chapter=${encodeURIComponent(chapter.title)}&source=${selectedSource}`}
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
                                  <FileImage size={18} className="text-muted-foreground" />
                                  <div className="text-left">
                                    <span className="font-medium">{volume.name}</span>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {volume.chapters.length} capitoli
                                    </p>
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
                                        href={`/manga/${params.id}/read?u=${obfuscateUrl(chapter.url)}&title=${encodeURIComponent(
                                          mangaData.title,
                                        )}&chapter=${encodeURIComponent(chapter.title)}&source=${selectedSource}`}
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
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function transformUnifiedChaptersToVolumes(
  unifiedChapters: any[],
  source: string,
  sources?: Array<{ name: string; slug: string; id: string; hash_id?: string }>,
): Volume[] {
  const sourceInfo = sources?.find((s) => s.name === source)

  const chapters = unifiedChapters
    .map((ch) => {
      const sourceData = ch.sources?.[source]
      if (!sourceData || !sourceData.available) return null

      // Format date
      let formattedDate = ""
      if (typeof sourceData.date === "number") {
        formattedDate = new Date(sourceData.date * 1000).toLocaleDateString("it-IT")
      } else {
        formattedDate = sourceData.date || ""
      }

      // Build chapter URL with all necessary data
      let chapterUrl = sourceData.url || ""

      // Store metadata in URL params for unified pages API
      if (source === "Comix" && sourceInfo) {
        const params = new URLSearchParams({
          _unified: "true",
          _source: source,
          _hash_id: sourceInfo.hash_id || sourceData.hash_id || "",
          _slug: sourceInfo.slug || sourceData.slug || "",
          _chapter_id: sourceData.id || "",
          _chapter_num: String(ch),
        })
        chapterUrl += `?${params}`
      } else if (source === "World") {
        const params = new URLSearchParams({
          _unified: "true",
          _source: source,
          _manga_id: sourceInfo.id || "",
          _chapter_id: sourceData.id || "",
          _chapter_num: String(ch),
        })
        chapterUrl += `?${params}`
      }

      return {
        title: sourceData.title,
        url: chapterUrl,
        date: formattedDate,
        isNew: sourceData.isNew,
      }
    })
    .filter((ch) => ch !== null) as Chapter[]

  return [
    {
      name: "Chapters",
      chapters: chapters,
    },
  ]
}
