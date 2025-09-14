"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { obfuscateId } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { authManager } from "@/lib/auth"

type ContinueReadingEntry = {
  manga_id: string
  chapter: number
  page: number
  title?: string
  image?: string
  updatedAt: number
}

export async function saveMangaProgress(
  mangaId: string,
  chapter: number,
  page: number,
  title?: string,
  image?: string,
) {
  try {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      throw new Error("No auth token found")
    }

    const getCurrentData = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/data", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!getCurrentData.ok) {
      throw new Error("Failed to get current user data")
    }

    const currentData = await getCurrentData.json()

    const userData = {
      continue_watching: currentData.continue_watching || [],
      continue_reading: currentData.continue_reading || [],
      continue_lightnovels: currentData.continue_lightnovels || [],
      anime_lists: {
        da_guardare: currentData.anime_lists?.da_guardare || [],
        in_corso: currentData.anime_lists?.in_corso || [],
        completati: currentData.anime_lists?.completati || [],
        in_pausa: currentData.anime_lists?.in_pausa || [],
        abbandonati: currentData.anime_lists?.abbandonati || [],
        in_revisione: currentData.anime_lists?.in_revisione || [],
      },
      manga_lists: {
        da_leggere: currentData.manga_lists?.da_leggere || [],
        in_corso: currentData.manga_lists?.in_corso || [],
        completati: currentData.manga_lists?.completati || [],
        in_pausa: currentData.manga_lists?.in_pausa || [],
        abbandonati: currentData.manga_lists?.abbandonati || [],
        in_revisione: currentData.manga_lists?.in_revisione || [],
      },
      lightnovel_lists: {
        da_leggere: currentData.lightnovel_lists?.da_leggere || [],
        in_corso: currentData.lightnovel_lists?.in_corso || [],
        completati: currentData.lightnovel_lists?.completati || [],
        in_pausa: currentData.lightnovel_lists?.in_pausa || [],
        abbandonati: currentData.lightnovel_lists?.abbandonati || [],
        in_revisione: currentData.lightnovel_lists?.in_revisione || [],
      },
      profile_picture_url: currentData.profile_picture_url || null,
    }

    const existingIndex = userData.continue_reading.findIndex((item: any) => item.manga_id === mangaId)
    const readingEntry = { manga_id: mangaId, chapter, page }

    if (existingIndex >= 0) {
      userData.continue_reading[existingIndex] = readingEntry
    } else {
      userData.continue_reading.push(readingEntry)
    }

    if (!userData.manga_lists.in_corso.includes(mangaId)) {
      userData.manga_lists.in_corso.push(mangaId)
    }

    const saveResponse = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/data", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!saveResponse.ok) {
      throw new Error("Failed to save manga progress")
    }

    return true
  } catch (error) {
    console.error("[v0] Failed to save manga progress:", error)
    return false
  }
}

export function ContinueReading() {
  const [items, setItems] = useState<ContinueReadingEntry[]>([])
  const mountedRef = useRef(false)
  const { user } = useAuth()

  const load = useMemo(
    () => async () => {
      try {
        if (!user?.token) {
          setItems([])
          return
        }

        console.log("[v0] Loading continue reading for user:", user.username)

        const continueReadingData = await authManager.getContinueReading()
        console.log("[v0] Continue reading data:", continueReadingData)

        if (continueReadingData && Object.keys(continueReadingData).length > 0) {
          const enriched = await Promise.all(
            Object.entries(continueReadingData).map(async ([mangaId, data]: [string, any]) => {
              // Fetch manga metadata for title and image
              let title = data.manga || mangaId
              let image = data.image

              try {
                const response = await fetch(`/api/manga-info?id=${encodeURIComponent(mangaId)}`)
                if (response.ok) {
                  const metadata = await response.json()
                  title = metadata.title || title
                  image = metadata.image || image
                  console.log("[v0] Fetched manga metadata:", { mangaId, title, image })
                }
              } catch (error) {
                console.log("[v0] Failed to fetch manga metadata for:", mangaId, error)
              }

              return {
                manga_id: mangaId,
                chapter: data.chapter || 1,
                page: data.page || 1,
                title,
                image,
                updatedAt: Date.now(),
              }
            }),
          )

          enriched.sort((a: any, b: any) => b.updatedAt - a.updatedAt)
          console.log("[v0] Enriched continue reading:", enriched)
          setItems(enriched)
        } else {
          setItems([])
        }
      } catch (error) {
        console.error("[v0] Failed to load continue reading:", error)
        setItems([])
      }
    },
    [user?.token],
  )

  useEffect(() => {
    load()
    mountedRef.current = true
  }, [load])

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Continua a leggere</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
        {items.map((item) => (
          <div key={`${item.manga_id}-${item.chapter}`} className="min-w-[160px] sm:min-w-[180px] shrink-0 space-y-2">
            <div className="relative">
              <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted relative">
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
                    <div className="text-center text-muted-foreground">
                      <div className="text-xs font-medium">{item.title || "Manga"}</div>
                    </div>
                  </div>
                )}

                {/* Chapter and page overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="text-xs text-white/90 font-medium">
                    Cap. {item.chapter}
                    {item.page > 0 ? ` • Pag. ${item.page}` : ""}
                  </div>
                </div>
              </div>

              {/* Title below the card with proper height */}
              <div className="px-1 h-[40px] flex items-start">
                <h3 className="text-xs font-medium line-clamp-2 text-center w-full">{item.title || "Manga"}</h3>
              </div>
            </div>
            <div>
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
