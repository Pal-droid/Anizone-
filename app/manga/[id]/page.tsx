"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Chapter {
  title: string
  url: string
}

interface Volume {
  number: string
  chapters: Chapter[]
}

interface Manga {
  title: string
  author: string
  illustrator?: string
  genres: string[]
  description: string
  thumbnail: string
  volumes: Volume[]
}

function obfuscateUrl(url: string): string {
  return Buffer.from(url).toString("base64")
}

export default function MangaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [mangaData, setMangaData] = useState<Manga | null>(null)

  useEffect(() => {
    async function fetchManga() {
      try {
        const res = await fetch(`/api/manga/${params.id}`)
        const data: Manga = await res.json()
        setMangaData(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchManga()
  }, [params.id])

  if (!mangaData) {
    return <div className="p-4">Loading…</div>
  }

  // Flatten all chapters from all volumes
  const allChapters = mangaData.volumes.flatMap((v) => v.chapters)

  // Oldest = last chapter (because API returns newest → oldest)
  const oldestChapter =
    allChapters.length > 0
      ? allChapters[allChapters.length - 1]
      : null

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-4">
        <img
          src={mangaData.thumbnail}
          alt={mangaData.title}
          className="w-48 h-72 object-cover rounded-xl shadow"
        />
        <h1 className="text-3xl font-bold">{mangaData.title}</h1>
        <p className="text-sm text-gray-500">
          {mangaData.author}
          {mangaData.illustrator ? ` (Illustrator: ${mangaData.illustrator})` : ""}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {mangaData.genres.map((genre) => (
            <Badge key={genre} variant="secondary">
              {genre}
            </Badge>
          ))}
        </div>
        <p className="text-base max-w-2xl">{mangaData.description}</p>

        {oldestChapter && (
          <Link
            href={`/manga/${params.id}/read?u=${obfuscateUrl(
              oldestChapter.url
            )}&title=${encodeURIComponent(
              mangaData.title
            )}&chapter=${encodeURIComponent(oldestChapter.title)}`}
            className="w-full flex justify-center"
          >
            <Button size="sm" variant="outline" className="mt-2">
              <BookOpen size={16} className="mr-2" />
              Inizia a leggere
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {mangaData.volumes.map((volume) => (
          <Collapsible key={volume.number} defaultOpen>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer">
                <CardHeader>
                  <CardTitle>Volume {volume.number}</CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent className="space-y-2">
                  {volume.chapters.map((chapter) => (
                    <Link
                      key={chapter.url}
                      href={`/manga/${params.id}/read?u=${obfuscateUrl(
                        chapter.url
                      )}&title=${encodeURIComponent(
                        mangaData.title
                      )}&chapter=${encodeURIComponent(chapter.title)}`}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left"
                      >
                        {chapter.title}
                      </Button>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}