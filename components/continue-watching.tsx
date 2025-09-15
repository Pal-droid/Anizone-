"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSeconds } from "@/lib/time"
import { useAuth } from "@/contexts/auth-context"
import { authManager } from "@/lib/auth"
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
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuth()
  const token = user?.token

  const load = async () => {
    if (!user || !token) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [backendData, inCorsoAnime] = await Promise.all([fetchContinueWatching(), fetchInCorsoAnime()])

      let cw: ContinueEntry[] = []

      if (backendData && typeof backendData === "object") {
        cw = Object.entries(backendData).map(([animeId, data]: [string, any]) => ({
          seriesKey: animeId,
          seriesPath: animeId,
          title: data.anime || animeId,
          episode: { num: data.episode || 1, href: "" },
          updatedAt: Date.now(),
          positionSeconds: data.progress ? parseTimeToSeconds(data.progress) : 0,
        }))
      }

      const existingKeys = new Set(cw.map((item) => item.seriesKey))
      for (const animeId of inCorsoAnime) {
        if (!existingKeys.has(animeId)) {
          cw.push({
            seriesKey: animeId,
            seriesPath: animeId,
            title: animeId,
            episode: { num: 1, href: "" },
            updatedAt: Date.now(),
            positionSeconds: 0,
          })
        }
      }

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
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchContinueWatching = async () => {
    if (!token) return {}

    try {
      const response = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/continue-watching", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        if (response.status === 401) {
          authManager.logout()
          return {}
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data || {}
    } catch (error) {
      console.error("Failed to fetch continue watching:", error)
      return {}
    }
  }

  const fetchInCorsoAnime = async () => {
    if (!token) return []
    try {
      const lists = await authManager.getAnimeLists()
      return lists.in_corso || []
    } catch (error) {
      console.error("Failed to fetch anime lists:", error)
      return []
    }
  }

  const parseTimeToSeconds = (timeString: string): number => {
    const parts = timeString.split(":")
    if (parts.length === 2) return Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1])
    return 0
  }

  useEffect(() => {
    if (user && token) load()
  }, [user, token])

  useEffect(() => {
    mountedRef.current = true

    if (user && token) {
      pollingIntervalRef.current = setInterval(load, 30000)
    } else if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

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

    const onContinueWatchingUpdate = () => load()

    window.addEventListener("anizone:progress", onProgress as EventListener)
    window.addEventListener("anizone:continue-watching-updated", onContinueWatchingUpdate as EventListener)

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      window.removeEventListener("anizone:progress", onProgress as EventListener)
      window.removeEventListener("anizone:continue-watching-updated", onContinueWatchingUpdate as EventListener)
    }
  }, [user, token])

  if (!user) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Continua a guardare</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <div className="text-muted-foreground text-sm">Accedi per vedere i tuoi anime in corso</div>
            <Link href="/login">
              <Button size="sm">Accedi</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Continua a guardare</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[140px] shrink-0 space-y-2">
              <div className="aspect-[3/4] w-full bg-gradient-to-br from-muted/50 to-muted animate-pulse rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>
              <div className="h-4 bg-gradient-to-r from-muted/70 to-muted/30 animate-pulse rounded" />
              <div className="h-6 bg-gradient-to-r from-muted/50 to-muted/20 animate-pulse rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Continua a guardare</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <div className="text-muted-foreground text-sm">Nessun anime in corso. Inizia a guardare qualcosa!</div>
            <Link href="/search">
              <Button size="sm">Cerca anime</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

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
            <div key={`${bp}-${it.episode?.num}`} className="min-w-[140px] max-h-[300px] shrink-0 space-y-2">
              <Link href={`/watch?p=${obfuscateUrl(bp)}&ep=${encodeURIComponent(String(displayEpisode))}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden">
                    <img
                      src={it.image || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
                      alt={it.title || "Anime"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                      <div className="text-xs text-white/90 font-medium">
                        Ep. {displayEpisode}
                        {it.positionSeconds && it.positionSeconds > 0 ? ` • ${resumeTime}` : ""}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-2 flex flex-col">
                    <div className="text-sm font-medium flex-1 flex items-start leading-tight overflow-hidden">
                      <span className="line-clamp-2">{it.title || "Anime"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/watch?p=${obfuscateUrl(bp)}&ep=${encodeURIComponent(String(displayEpisode))}`}>
                <Button size="sm" className="w-full">
                  {it.positionSeconds && it.positionSeconds > 0 ? "Riprendi" : "Guarda"}
                </Button>
              </Link>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}