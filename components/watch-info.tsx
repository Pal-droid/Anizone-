"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimeCard } from "@/components/anime-card"

type Meta = {
  title: string
  jtitle?: string
  image?: string
  rating?: string
  votesCount?: string
  audio?: string
  releaseDate?: string
  season?: string
  studio?: string
  duration?: string
  episodesCount?: string
  status?: string
  views?: string
  genres: { name: string; href?: string }[]
  description?: string
}

export function WatchInfo({ seriesPath }: { seriesPath: string }) {
  const path = useMemo(() => {
    try {
      const u = new URL(seriesPath, "https://dummy.local")
      const parts = u.pathname.split("/").filter(Boolean)
      return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : u.pathname
    } catch {
      const parts = seriesPath.split("/").filter(Boolean)
      return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : seriesPath
    }
  }, [seriesPath])

  const [meta, setMeta] = useState<Meta | null>(null)
  const [similar, setSimilar] = useState<Array<{ title: string; href: string; image?: string }>>([])
  const [related, setRelated] = useState<Array<{ title: string; href: string; image?: string }>>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        console.log("[v0] WatchInfo fetching metadata for path:", path)

        let metaPath = path
        try {
          const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
          if (storedSources) {
            const parsedSources = JSON.parse(storedSources)
            const asSource = parsedSources.find((s: any) => s.name === "AnimeSaturn")
            if (asSource && asSource.url) {
              console.log("[v0] Found AnimeSaturn source in sessionStorage:", asSource.url)
              metaPath = asSource.url
            }
          }
        } catch (e) {
          console.log("[v0] Could not get sources from sessionStorage:", e)
        }

        const [m, s, r] = await Promise.all([
          fetch(`/api/anime-meta?path=${encodeURIComponent(metaPath)}`)
            .then((x) => x.json())
            .catch(() => null),
          fetch(`/api/anime-similar?path=${encodeURIComponent(path)}`)
            .then((x) => x.json())
            .catch(() => null),
          fetch(`/api/anime-related?path=${encodeURIComponent(path)}`)
            .then((x) => x.json())
            .catch(() => null),
        ])
        if (!alive) return
        console.log("[v0] Metadata fetch result:", m)
        if (m?.ok) setMeta(m.meta)
        if (s?.ok) setSimilar(s.items || [])
        if (r?.ok) setRelated(r.items || [])
      } catch (e) {
        console.log("[v0] WatchInfo error:", e)
      }
    })()
    return () => {
      alive = false
    }
  }, [path])

  return (
    <div className="grid gap-4">
      {meta ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-[100vw] overflow-x-hidden">
              <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[130px_1fr] gap-4 min-w-0">
                <div className="sm:justify-self-start flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meta.image || "/placeholder.svg?height=195&width=130&query=anime%20poster"}
                    alt={meta.title}
                    className="sm:w-[130px] w-[120px] sm:h-[195px] h-[180px] object-cover rounded max-w-full"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex flex-col justify-start">
                  <div className="text-lg font-semibold">{meta.title}</div>
                  {meta.jtitle ? <div className="text-sm text-muted-foreground mb-3">{meta.jtitle}</div> : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {meta.rating ? (
                      <div>
                        Voto: <span className="font-medium text-foreground">{meta.rating}</span>
                        {meta.votesCount ? <span className="ml-1">({meta.votesCount})</span> : null}
                      </div>
                    ) : null}
                    {meta.audio ? (
                      <div>
                        Audio: <span className="text-foreground">{meta.audio}</span>
                      </div>
                    ) : null}
                    {meta.duration ? (
                      <div>
                        Durata: <span className="text-foreground">{meta.duration}</span>
                      </div>
                    ) : null}
                    {meta.episodesCount ? (
                      <div>
                        Episodi: <span className="text-foreground">{meta.episodesCount}</span>
                      </div>
                    ) : null}
                    {meta.status ? (
                      <div>
                        Stato: <span className="text-foreground">{meta.status}</span>
                      </div>
                    ) : null}
                    {meta.releaseDate ? (
                      <div>
                        Uscita: <span className="text-foreground">{meta.releaseDate}</span>
                      </div>
                    ) : null}
                    {meta.studio ? (
                      <div>
                        Studio: <span className="text-foreground">{meta.studio}</span>
                      </div>
                    ) : null}
                    {meta.views ? (
                      <div>
                        Visualizzazioni: <span className="text-foreground">{meta.views}</span>
                      </div>
                    ) : null}
                  </div>
                  {meta.genres?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {meta.genres.map((g) => (
                        <span key={g.name} className="inline-flex text-xs border rounded px-2 py-0.5">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {meta.description ? (
                <div className="mt-4 text-sm text-muted-foreground break-words">
                  <div className="font-medium text-foreground mb-2">Trama:</div>
                  {meta.description}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {similar?.length ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Serie simili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative -mx-6 sm:mx-0">
              <div className="px-6 sm:px-0 w-full max-w-[100vw] min-w-0 overflow-x-auto no-scrollbar overscroll-x-contain">
                <div className="flex gap-3 min-w-0">
                  {similar.map((it) => (
                    <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                      <AnimeCard title={it.title} href={it.href} image={it.image || ""} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {related?.length ? (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Correlati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative -mx-6 sm:mx-0">
              <div className="px-6 sm:px-0 w-full max-w-[100vw] min-w-0 overflow-x-auto no-scrollbar overscroll-x-contain">
                <div className="flex gap-3 min-w-0">
                  {related.map((it) => (
                    <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                      <AnimeCard title={it.title} href={it.href} image={it.image || ""} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
