"use client"

import type React from "react"

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

// Cache for meta
const metaCache = new Map<string, { title: string; image?: string; ts: number }>()
const TTL = 1000 * 60 * 30

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
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuth()
  const token = user?.token

  const parseTimeToSeconds = (time: string) => {
    const [min, sec] = time.split(":").map(Number)
    return min * 60 + (sec || 0)
  }

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
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchContinueWatching = async () => {
    if (!token) return {}
    try {
      const res = await fetch("https://stale-nananne-anizonee-3fa1a732.koyeb.app/user/continue-watching", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 401) authManager.logout()
        return {}
      }
      return (await res.json()) || {}
    } catch {
      return {}
    }
  }

  const fetchInCorsoAnime = async () => {
    if (!token) return []
    try {
      const lists = await authManager.getAnimeLists()
      return lists.in_corso || []
    } catch {
      return []
    }
  }

  useEffect(() => {
    if (user && token) load()
  }, [user, token])

  useEffect(() => {
    mountedRef.current = true
    if (user && token) pollingRef.current = setInterval(load, 30000)
    else if (pollingRef.current) clearInterval(pollingRef.current)

    const onProgress = (e: Event) => {
      const ev = e as CustomEvent<{ seriesKey: string; episodeNum: number; position: number }>
      if (!ev?.detail) return
      setItems((prev) =>
        prev.map((it) =>
          basePath(it.seriesKey) === basePath(ev.detail!.seriesKey) && it.episode?.num === ev.detail!.episodeNum
            ? { ...it, positionSeconds: ev.detail!.position, updatedAt: Date.now() }
            : it,
        ),
      )
    }

    const onUpdate = () => load()
    window.addEventListener("anizone:progress", onProgress as EventListener)
    window.addEventListener("anizone:continue-watching-updated", onUpdate as EventListener)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      window.removeEventListener("anizone:progress", onProgress as EventListener)
      window.removeEventListener("anizone:continue-watching-updated", onUpdate as EventListener)
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
            <div className="text-muted-foreground text-xs">Accedi per aggiungere alle liste</div>
            <Link href="/lists">
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
            <div key={i} className="min-w-[120px] max-w-[140px] shrink-0 space-y-2">
              <div className="w-full aspect-[2/3] bg-muted animate-pulse rounded-lg" />
              <div className="h-4 bg-muted/70 animate-pulse rounded" />
              <div className="h-6 bg-muted/50 animate-pulse rounded" />
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

          const extractAnimeId = (path: string): string => {
            const match = path.match(/\/play\/([^/?#]+)/)
            if (match) return match[1]

            // Handle direct anime IDs
            const cleanPath = path.replace(/^\/+/, "")
            if (cleanPath.includes("/")) {
              const parts = cleanPath.split("/")
              return parts[parts.length - 1] || parts[0]
            }
            return cleanPath
          }

          const animeId = extractAnimeId(bp)

          const handleClick = async (e: React.MouseEvent) => {
            e.preventDefault()

            // Added debug logging for better error tracking
            console.log("[v0] Continue watching click - animeId:", animeId, "episode:", displayEpisode)

            try {
              // Fetch episodes using the unified API as specified
              const episodesResponse = await fetch(
                `https://aw-au-as-api.vercel.app/api/episodes?AW=${encodeURIComponent(animeId)}`,
                {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
                  },
                },
              )

              if (episodesResponse.ok) {
                const episodes = await episodesResponse.json()
                console.log("[v0] Episodes fetched:", episodes.length)

                // Find the correct episode or use the first available
                const targetEpisode = episodes.find((ep: any) => ep.episode_number === displayEpisode) || episodes[0]

                if (targetEpisode?.sources?.AnimeWorld?.id) {
                  // Store episode data in sessionStorage for the watch page
                  sessionStorage.setItem(
                    "currentAnimeSource",
                    JSON.stringify({
                      animeId,
                      episodeId: targetEpisode.sources.AnimeWorld.id,
                      episodeNumber: displayEpisode,
                      title: it.title,
                      allEpisodes: episodes,
                    }),
                  )

                  // Navigate to watch page with proper episode ID format
                  window.location.href = `/watch?p=${encodeURIComponent(`/play/${animeId}/${targetEpisode.sources.AnimeWorld.id}`)}`
                  return
                }
              } else {
                console.error("[v0] Episodes API failed:", episodesResponse.status)
              }
            } catch (error) {
              console.error("[v0] Failed to fetch episode data:", error)
            }

            // Fallback navigation if API fails
            console.log("[v0] Using fallback navigation")
            window.location.href = `/watch?p=${obfuscateUrl(bp)}&ep=${encodeURIComponent(String(displayEpisode))}`
          }

          return (
            // Set consistent card width and height for uniform appearance
            <div key={`${bp}-${it.episode?.num}`} className="w-[120px] shrink-0 flex flex-col">
              <div onClick={handleClick} className="cursor-pointer">
                <div className="space-y-2">
                  <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                    <img
                      src={it.image || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
                      alt={it.title || "Anime"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                      <div className="text-xs text-white/90 font-medium">
                        Ep. {displayEpisode}
                        {it.positionSeconds && it.positionSeconds > 0 ? ` • ${resumeTime}` : ""}
                      </div>
                    </div>
                  </div>
                  {/* Fixed height for title container to prevent card size variations */}
                  <div className="h-8 flex items-start">
                    <div className="text-xs font-medium leading-tight line-clamp-2 text-center w-full">
                      {it.title || "Anime"}
                    </div>
                  </div>
                  <Button size="sm" className="w-full">
                    {it.positionSeconds && it.positionSeconds > 0 ? "Riprendi" : "Guarda"}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
