"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSeconds } from "@/lib/time"

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
  const mountedRef = useRef(false)

  const load = useMemo(
    () => async () => {
      try {
        const r = await fetch("/api/user-state", { cache: "no-store" })
        const j = await r.json()
        if (j.ok) {
          const cw = Object.values((j.data as UserState).continueWatching || {}) as ContinueEntry[]
          // hydrate meta
          const enriched = await Promise.all(
            cw.map(async (it) => {
              const meta = await getMeta(it.seriesPath || it.seriesKey)
              return { ...it, title: meta.title || it.title, image: meta.image }
            }),
          )
          enriched.sort((a, b) => b.updatedAt - a.updatedAt)
          setItems(enriched)
        }
      } catch {
        // ignore
      }
    },
    [],
  )

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

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Continua a guardare</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3 overflow-x-auto no-scrollbar">
        {items.map((it) => {
          const resumeTime = formatSeconds(it.positionSeconds)
          const bp = basePath(it.seriesPath || it.seriesKey)
          return (
            <div key={`${bp}-${it.episode?.num}`} className="min-w-[220px] shrink-0 space-y-2">
              <div className="relative aspect-[16/9] w-full rounded overflow-hidden bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.image || "/placeholder.svg?height=180&width=320&query=anime%20thumbnail"}
                  alt={it.title || "Anime"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="text-xs text-white/90">
                    E{it.episode?.num ?? "?"}
                    {it.positionSeconds && it.positionSeconds > 0 ? ` • ${resumeTime}` : ""}
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium line-clamp-2">{it.title || "Anime"}</div>
              <div>
                <Link
                  href={`/watch?path=${encodeURIComponent(bp)}&ep=${encodeURIComponent(String(it.episode?.num ?? ""))}`}
                >
                  <Button size="sm">Riprendi</Button>
                </Link>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
