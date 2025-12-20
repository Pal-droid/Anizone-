"use client"

import type React from "react"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAniList } from "@/contexts/anilist-context"
import { aniListManager } from "@/lib/anilist"
import { obfuscateUrl } from "@/lib/utils"

type ContinueEntry = {
  seriesKey: string
  seriesPath: string
  title: string
  episode: { num: number; href: string }
  updatedAt: number
  positionSeconds?: number
  image?: string
}

// Cache for meta
const metaCache = new Map<string, { title: string; image?: string; ts: number }>()

export function ContinueWatching() {
  const { user } = useAniList()
  const [entries, setEntries] = useState<ContinueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (!user || initialized.current) return
    initialized.current = true

    async function fetchEntries() {
      try {
        const animeList = await aniListManager.getUserAnimeList()

        // Get CURRENT status entries
        const currentList = animeList.lists?.find((list: any) => list.status === "CURRENT")
        if (!currentList) {
          setEntries([])
          setLoading(false)
          return
        }

        const mapped: ContinueEntry[] = currentList.entries.map((entry: any) => {
          return {
            seriesKey: entry.media.id.toString(),
            seriesPath: entry.media.id.toString(),
            title: entry.media.title.romaji || entry.media.title.english || "Unknown",
            episode: { num: entry.progress || 1, href: `/anime/${entry.media.id}/episode/${entry.progress || 1}` },
            updatedAt: Date.now(),
            image: entry.media.coverImage.large || entry.media.coverImage.medium,
          }
        })

        setEntries(mapped)
      } catch (e) {
        console.error("[v0] Error loading continue watching:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
    const id = setInterval(fetchEntries, 30 * 1000)
    return () => clearInterval(id)
  }, [user])

  async function handleClick(e: React.MouseEvent, entry: ContinueEntry) {
    e.preventDefault()
    try {
      // Fetch episodes + sources from your API
      const [episodesRes, sourcesRes] = await Promise.all([
        fetch(`/api/anime-episodes?path=${encodeURIComponent(entry.seriesKey)}`),
        fetch(`/api/unified-search?keyword=${encodeURIComponent(entry.title)}`),
      ])

      const episodes = episodesRes.ok ? await episodesRes.json() : []
      const sources = sourcesRes.ok ? await sourcesRes.json() : []

      // Save into sessionStorage
      sessionStorage.setItem(
        "animeData",
        JSON.stringify({
          episodes,
          sources,
        }),
      )

      // Redirect to watch page
      window.location.href = `/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`
    } catch (err) {
      console.error("[v0] Error handling continue watching click:", err)
      window.location.href = `/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`
    }
  }

  if (loading) return null
  if (!entries.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continua a guardare</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {entries.map((entry) => (
          <div key={entry.seriesKey} className="flex items-center gap-4">
            {entry.image && (
              <img
                src={entry.image || "/placeholder.svg"}
                alt={entry.title}
                className="w-16 h-24 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <Link
                href={`/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`}
                onClick={(e) => handleClick(e, entry)}
                className="font-medium hover:underline"
              >
                {entry.title}
              </Link>
              <div className="text-sm text-muted-foreground">Ep {entry.episode.num}</div>
            </div>
            <Button asChild onClick={(e) => handleClick(e, entry)} variant="secondary" size="sm">
              <Link href={`/watch?p=${obfuscateUrl(entry.seriesKey)}&ep=${entry.episode.num}`}>Riprendi</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
