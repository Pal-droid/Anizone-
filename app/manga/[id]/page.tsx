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
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set([0]))

  const actualMangaId = deobfuscateId(params.id as string)

  useEffect(() => {
    const fetchMangaData = async () => {
      try {
        // ✅ Keep the old API endpoint
        const response = await fetch(`/api/manga-info?id=${actualMangaId}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        setMangaData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load manga data")
      } finally {
        setLoading(false)
      }
    }

    if (actualMangaId) fetchMangaData()
  }, [actualMangaId])

  const toggleVolume = (index: number) => {
    const newExpanded = new Set(expandedVolumes)
    if (newExpanded.has(index)) newExpanded.delete(index)
    else newExpanded.add(index)
    setExpandedVolumes(newExpanded)
  }

  if (loading) {
    return (
      <main className="min-h-screen pb-16 bg-background">
        <SlideOutMenu currentPath={`/manga/${params.id}`} />
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold">Caricamento...</h1>
          </div>
        </header>
        <div className="px-4 py-6 space-y-6 animate-pulse">
          <div className="w-full flex justify-center">
            <div className="w-28 h-40 bg-muted rounded-lg shadow-md"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-48 bg-muted rounded"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
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

  // ✅ Always pick the oldest chapter (last in the array)
  const firstVolume = mangaData.volumes[0]
  const oldestChapter = firstVolume.chapters[firstVolume.chapters.length - 1]

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
        <Card className="overflow-hidden">
          <CardContent className="p-6 flex flex-col gap-3 items-center text-center">
            <img
              src={mangaData.image || "/placeholder.svg"}
              alt={mangaData.title || "Manga"}
              className="w-28 h-40 object-cover rounded-lg shadow-md"
              onError={(e) => ((e.target as HTMLImageElement).src = "/manga-cover.png")}
            />
            <h1 className="text-2xl font-bold">{mangaData.title}</h1>
            <div className="mt-2 w-full flex justify-center">
              <QuickListManager
                itemId={actualMangaId}
                itemTitle={mangaData.title}
                itemImage={mangaData.image}
                type="manga"
              />
            </div>
            {mangaData.volumes.length > 0 && firstVolume.chapters.length > 0 && (
              <Link
                href={`/manga/${params.id}/read?u=${obfuscateUrl(
                  oldestChapter.url
                )}&title=${encodeURIComponent(mangaData.title)}&chapter=${encodeURIComponent(
                  oldestChapter.title
                )}`}
                className="w-full flex justify-center"
              >
                <Button size="sm" variant="outline" className="mt-2">
                  <BookOpen size={16} className="mr-2" />
                  Inizia a leggere
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}