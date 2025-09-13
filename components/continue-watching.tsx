"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSeconds } from "@/lib/time"
import { AnimeCard } from "@/components/anime-card"
import { useAuth } from "@/contexts/auth-context"

type ContinueEntry = {
  seriesKey: string
  seriesPath: string
  title: string
  episode: { num: number; href: string }
  updatedAt: number
  positionSeconds?: number
  image?: string
}

type UserState = {
  continueWatching: Record<string, ContinueEntry>
}

// Simple cache for meta per series
const metaCache = new Map<string, { title: string; image?: string; ts: number }>()
const TTL = 1000 * 60 * 30 // 30 minutes

async function getMeta(path: string) {
  const key = basePath(path)
  const cached = metaCache.get(key)
  const now = Date.now()
  if (cached && now - cached.ts < TTL) return cached
  try {
    const r = await fetch(`/api/anime-meta?path=${encodeURIComponent(key)}`)
    const j = await r.json()
    if (j.ok) {
      const entry = { title: j.meta?.title || key, image: j.meta?.image, ts: now }
      metaCache.set(key, entry)
      try {
        localStorage.setItem(`anizone:meta:${key}`, JSON.stringify(entry))
      } catch {}
      return entry
    }
  } catch {}
  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(`anizone:meta:${key}`)
    if (raw) {
      const entry = JSON.parse(raw)
      metaCache.set(key, entry)
      return entry
    }
  } catch {}
  return { title: key, image: undefined, ts: now }
}

function basePath(p: string) {
  try {
    const u = new URL(p, "https://dummy.local")
    const parts = u.pathname.split("/").filter(Boolean)
    return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : u.pathname
  } catch {
    const parts = p.split("/").filter(Boolean)
    return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : p
  }
}

export function ContinueWatching() {
  const [items, setItems] = useState<ContinueEntry[]>([])
  const [continueWatchingData, setContinueWatchingData] = useState<any>({})
  const mountedRef = useRef(false)
  const { user, token } = useAuth()

  const fetchContinueWatching = async () => {
    if (!token) return {}

    try {
      const response = await fetch("/user/continue-watching", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (error) {
      console.error("Failed to fetch continue watching:", error)
    }

    return {}
  }

  const load = useMemo(
    () => async () => {
      if (!user || !token) return

      try {
        const [localResponse, backendData] = await Promise.all([
          fetch("/api/user-state", { cache: "no-store" }),
          fetchContinueWatching(),
        ])

        const localJson = await localResponse.json()
        let cw: ContinueEntry[] = []

        if (localJson.ok) {
          cw = Object.values((localJson.data as UserState).continueWatching || {}) as ContinueEntry[]
        }

        if (backendData.anime) {
          const backendEntry: ContinueEntry = {
            seriesKey: backendData.anime,
            seriesPath: `/anime/${backendData.anime.toLowerCase().replace(/\s+/g, "-")}`,
            title: backendData.anime,
            episode: { num: backendData.episode || 1, href: "" },
            updatedAt: Date.now(),
            positionSeconds: backendData.progress ? parseTimeToSeconds(backendData.progress) : 0,
          }

          // Replace or add the backend entry
          const existingIndex = cw.findIndex((item) => basePath(item.seriesKey) === basePath(backendEntry.seriesKey))

          if (existingIndex >= 0) {
            cw[existingIndex] = backendEntry
          } else {
            cw.push(backendEntry)
          }
        }

        // hydrate meta
        const enriched = await Promise.all(
          cw.map(async (it) => {
            const meta = await getMeta(it.seriesPath || it.seriesKey)
            const episodeNum = it.episode?.num && it.episode.num > 0 ? it.episode.num : 1
            return {
              ...it,
              title: meta.title || it.title,
              image: meta.image,
              episode: { ...it.episode, num: episodeNum },
            }
          }),
        )
        enriched.sort((a, b) => b.updatedAt - a.updatedAt)
        setItems(enriched)
      } catch (error) {
        console.error("Failed to load continue watching:", error)
      }
    },
    [user, token],
  )

  const parseTimeToSeconds = (timeString: string): number => {
    const parts = timeString.split(":")
    if (parts.length === 2) {
      return Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1])
    }
    return 0
  }

  useEffect(() => {
    load()
    mountedRef.current = true
    // Listen to live progress updates from the player
    const onProgress = (e: Event) => {
      const ev = e as CustomEvent<{ seriesKey: string; episodeNum: number; position: number } | undefined>
      if (!ev?.detail) return
      setItems((prev) =>
        prev.map((it) =>
          basePath(it.seriesKey) === basePath(ev.detail!.seriesKey) && it.episode?.num === ev.detail!.episodeNum
            ? { ...it, positionSeconds: ev.detail!.position, updatedAt: Date.now() }
            : it,
        ),
      )
    }
    window.addEventListener("anizone:progress", onProgress as EventListener)
    return () => {
      window.removeEventListener("anizone:progress", onProgress as EventListener)
    }
  }, [load])

  if (!user || items.length === 0) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Continua a guardare</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
        {items.map((it) => {
          const resumeTime = formatSeconds(it.positionSeconds)
          const bp = basePath(it.seriesPath || it.seriesKey)
          const displayEpisode = it.episode?.num && it.episode.num > 0 ? it.episode.num : 1

          return (
            <div key={`${bp}-${it.episode?.num}`} className="min-w-[100px] sm:min-w-[120px] shrink-0 space-y-2">
              <div className="relative">
                <AnimeCard
                  title={it.title || "Anime"}
                  href={`/watch?path=${encodeURIComponent(bp)}&ep=${encodeURIComponent(String(displayEpisode))}`}
                  image={it.image || "/anime-poster.png"}
                  className="w-full"
                />
                {/* Episode and progress overlay */}
                <div className="absolute bottom-[60px] left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-none">
                  <div className="text-xs text-white/90">
                    E{displayEpisode}
                    {it.positionSeconds && it.positionSeconds > 0 ? ` • ${resumeTime}` : ""}
                  </div>
                </div>
              </div>
              <div>
                <Link href={`/watch?path=${encodeURIComponent(bp)}&ep=${encodeURIComponent(String(displayEpisode))}`}>
                  <Button size="sm" className="w-full">
                    Riprendi
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
