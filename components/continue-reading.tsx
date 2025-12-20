"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { obfuscateId } from "@/lib/utils"
import { useAniList } from "@/contexts/anilist-context"
import { aniListManager } from "@/lib/anilist"

type ContinueReadingEntry = {
  manga_id: string
  chapter: number
  page: number
  title?: string
  image?: string
  updatedAt: number
}

export function ContinueReading() {
  const [items, setItems] = useState<ContinueReadingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const { user } = useAniList()

  const load = useMemo(
    () => async () => {
      setLoading(true)
      try {
        if (!user) {
          setItems([])
          setLoading(false)
          return
        }

        const mangaList = await aniListManager.getUserMangaList()

        const currentList = mangaList.lists?.find((list: any) => list.status === "CURRENT")
        if (!currentList) {
          setItems([])
          setLoading(false)
          return
        }

        const enriched = currentList.entries.map((entry: any) => ({
          manga_id: entry.media.id.toString(),
          chapter: entry.progress || 1,
          page: 1,
          title: entry.media.title.romaji || entry.media.title.english || "Unknown",
          image: entry.media.coverImage.large || entry.media.coverImage.medium,
          updatedAt: Date.now(),
        }))

        enriched.sort((a: any, b: any) => b.updatedAt - a.updatedAt)
        setItems(enriched)
      } catch (error) {
        console.error("[v0] Failed to load continue reading:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  useEffect(() => {
    load()
    mountedRef.current = true
  }, [load])

  if (!mountedRef.current) return null
  if (items.length === 0 && !loading) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Continua a leggere</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[120px] shrink-0 space-y-2 animate-pulse">
                <div className="w-full aspect-[2/3] rounded-lg bg-gray-200" />
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            ))
          : items.map((item) => (
              <div key={`${item.manga_id}-${item.chapter}`} className="w-[120px] shrink-0 flex flex-col">
                <div className="space-y-2">
                  <div className="relative">
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                      {item.image ? (
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title || "Manga"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=240&width=180&query=manga cover`
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <div className="text-center text-muted-foreground text-xs font-medium p-2">
                            {item.title || "Manga"}
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <div className="text-xs text-white/90 font-medium">
                          Cap. {item.chapter}
                          {item.page > 0 ? ` • Pag. ${item.page}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-16 flex items-start">
                    <h3 className="text-xs font-medium line-clamp-2 text-center w-full">{item.title || "Manga"}</h3>
                  </div>

                  <Link href={`/manga/${obfuscateId(item.manga_id)}`}>
                    <Button size="sm" className="w-full">
                      Riprendi
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
      </CardContent>
    </Card>
  )
}
