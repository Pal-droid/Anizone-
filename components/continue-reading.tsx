"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { obfuscateId } from "@/lib/utils"

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

  const load = useMemo(
    () => async () => {
      try {
        const token = localStorage.getItem("auth_token")
        if (!token) {
          setItems([])
          return
        }

        const r = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/data", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!r.ok) {
          throw new Error("Failed to load continue reading")
        }

        const j = await r.json()
        if (j.continue_reading) {
          const enriched = j.continue_reading.map((item: any) => ({
            ...item,
            updatedAt: Date.now(),
          }))
          enriched.sort((a: any, b: any) => b.updatedAt - a.updatedAt)
          setItems(enriched)
        } else {
          setItems([])
        }
      } catch (error) {
        console.error("[v0] Failed to load continue reading:", error)
        setItems([])
      }
    },
    [],
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
          <div key={`${item.manga_id}-${item.chapter}`} className="min-w-[100px] sm:min-w-[120px] shrink-0 space-y-2">
            <div className="relative aspect-[2/3] w-full rounded overflow-hidden bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image || "/placeholder.svg?height=450&width=300&query=manga%20cover"}
                alt={item.title || "Manga"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="text-xs text-white/90">
                  Cap. {item.chapter}
                  {item.page > 0 ? ` • Pag. ${item.page}` : ""}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium line-clamp-2">{item.title || "Manga"}</div>
            <div>
              <Link href={`/manga/${obfuscateId(item.manga_id)}/read?chapter=${item.chapter}&page=${item.page}`}>
                <Button size="sm">Riprendi</Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
