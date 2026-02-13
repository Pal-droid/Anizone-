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
  anilistId?: number
  related?: Array<{
    title: string
    url?: string | null
    image?: string
    unityId?: string
    info?: string
  }>
  similar?: Array<{
    title: string
    url?: string
    image?: string
    unityId?: string
    type?: string
    year?: string
    status?: string
  }>
}

type AnimeItem = {
  title: string
  href: string
  image?: string
  sources?: Array<{ name: string; url: string; id: string }>
  has_multi_servers?: boolean
}

export function WatchInfo({
  seriesPath,
  sources,
}: { seriesPath: string; sources?: Array<{ name: string; id: string }> }) {
  const path = useMemo(() => {
    try {
      // Handle full URLs
      if (seriesPath.startsWith("http")) {
        const u = new URL(seriesPath)
        const parts = u.pathname.split("/").filter(Boolean)
        if (parts.length >= 2 && parts[0] === "play") {
          return `/${parts[0]}/${parts[1]}`
        }
        return u.pathname
      }

      // Handle paths
      const parts = seriesPath.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return seriesPath.startsWith("/") ? seriesPath : `/${seriesPath}`
    } catch {
      const parts = seriesPath.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return seriesPath.startsWith("/") ? seriesPath : `/${seriesPath}`
    }
  }, [seriesPath])

  const unityId = useMemo(() => {
    // First check passed sources prop
    if (sources) {
      const unitySource = sources.find((s) => s.name === "Unity")
      if (unitySource?.id) {
        return unitySource.id
      }
    }
    // Fallback to sessionStorage
    try {
      const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
      if (storedSources) {
        const parsedSources = JSON.parse(storedSources)
        const unitySource = parsedSources.find((s: any) => s.name === "Unity")
        if (unitySource?.id) {
          return unitySource.id
        }
      }
    } catch (e) {
      // Ignore
    }
    return null
  }, [sources, path])

  const animeWorldPath = useMemo(() => {
    try {
      const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
      if (storedSources) {
        const parsedSources = JSON.parse(storedSources)
        const awSource = parsedSources.find((s: any) => s.name === "AnimeWorld")
        if (awSource && awSource.id) {
          return `/play/${awSource.id}`
        }
      }
    } catch (e) {
      // Ignore
    }
    return path
  }, [path])

  const animepaheId = useMemo(() => {
    if (sources) {
      const animepaheSource = sources.find((s) => s.name === "AnimePahe")
      if (animepaheSource?.id) {
        return animepaheSource.id
      }
    }
    try {
      const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
      if (storedSources) {
        const parsedSources = JSON.parse(storedSources)
        const animepaheSource = parsedSources.find((s: any) => s.name === "AnimePahe")
        if (animepaheSource?.id) {
          return animepaheSource.id
        }
      }
    } catch (e) {
      // Ignore
    }
    return null
  }, [sources, path])

  const [meta, setMeta] = useState<Meta | null>(null)
  const [similar, setSimilar] = useState<AnimeItem[]>([])
  const [related, setRelated] = useState<AnimeItem[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [loadingRelated, setLoadingRelated] = useState(true)
  const [usedUnityFallback, setUsedUnityFallback] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let metaPath = path
        try {
          const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
          if (storedSources) {
            const parsedSources = JSON.parse(storedSources)
            const asSource = parsedSources.find((s: any) => s.name === "AnimeSaturn")
            if (asSource && asSource.url) {
              metaPath = asSource.url
            }
          }
        } catch (e) {
          // Ignore sessionStorage errors
        }

        let metaUrl = ""
        let isHNimeMeta = false

        try {
          const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
          if (storedSources) {
            const parsedSources = JSON.parse(storedSources)

            // Check for HNime source first (English server)
            const hnSource = parsedSources.find((s: any) => s.name === "HNime")
            if (hnSource && hnSource.url) {
              metaUrl = `/api/en/metadata?url=${encodeURIComponent(hnSource.url)}`
              isHNimeMeta = true
              console.log("[v0] WatchInfo - Using HNime metadata endpoint for:", hnSource.url)
            } else {
              // Define priority order for Italian sources
              const priorityOrder = [
                { name: "AnimeWorld", param: "path", transform: (s: any) => s.url || `/play/${s.id}` },
                { name: "AnimeSaturn", param: "path", transform: (s: any) => s.url || s.id },
                { name: "AnimeUnity", param: "unityId", transform: (s: any) => s.id },
                { name: "AnimePahe", param: "animepaheId", transform: (s: any) => s.id },
              ]

              // Find first available source in priority order
              for (const priority of priorityOrder) {
                const source = parsedSources.find((s: any) => s.name === priority.name)
                if (source && (source.url || source.id)) {
                  const value = priority.transform(source)
                  metaUrl = `/api/anime-meta?${priority.param}=${encodeURIComponent(value)}`
                  console.log(
                    `[v0] WatchInfo - Using ${priority.name} for metadata (priority: ${priorityOrder.indexOf(priority) + 1})`,
                  )
                  break
                }
              }
            }
          }
        } catch (e) {
          console.error("[v0] WatchInfo - Error reading sources from sessionStorage:", e)
        }

        // Fallback to default path if no priority source found
        if (!metaUrl) {
          metaUrl = `/api/anime-meta?path=${encodeURIComponent(path)}`
          console.log("[v0] WatchInfo - Using fallback path for metadata")
        }

        // Add supplementary IDs if available
        if (animepaheId && !metaUrl.includes("animepaheId")) {
          metaUrl += `&animepaheId=${encodeURIComponent(animepaheId)}`
          console.log("[v0] WatchInfo - Including AnimePahe ID:", animepaheId)
        }
        if (unityId && !metaUrl.includes("unityId")) {
          metaUrl += `&unityId=${encodeURIComponent(unityId)}`
          console.log("[v0] WatchInfo - Including Unity ID:", unityId)
        }

        console.log("[v0] WatchInfo - Fetching metadata from:", metaUrl)
        const metaResponse = await fetch(metaUrl)
        const metaData = await metaResponse.json()

        if (!alive) return

        if (metaData?.ok) {
          setMeta(metaData.meta)

          if (metaData.meta?.anilistId) {
            const metaKey = `anizone:meta:${path}`
            try {
              sessionStorage.setItem(metaKey, JSON.stringify({ anilistId: metaData.meta.anilistId }))
              console.log("[v0] Stored AniList ID in sessionStorage:", metaData.meta.anilistId)
            } catch (e) {
              console.error("[v0] Failed to store AniList ID:", e)
            }
          }

          // For HNime, skip related/similar sections entirely for now
          if (isHNimeMeta) {
            setLoadingRelated(false)
            setLoadingSimilar(false)
          }

          if (metaData.fallback && metaData.meta?.related?.length) {
            const unityRelated: AnimeItem[] = metaData.meta.related
              .filter((r: any) => r.url)
              .map((r: any) => ({
                title: r.title,
                href: r.url,
                image: r.image,
                sources: r.unityId ? [{ name: "Unity", url: r.url, id: r.unityId }] : undefined,
                has_multi_servers: false,
              }))
            setRelated(unityRelated)
            setLoadingRelated(false)
            setUsedUnityFallback(true)
          }

          if (metaData.fallback && metaData.meta?.similar?.length) {
            const unitySimilar: AnimeItem[] = metaData.meta.similar.map((s: any) => ({
              title: s.title,
              href: s.url,
              image: s.image,
              sources: s.unityId ? [{ name: "Unity", url: s.url, id: s.unityId }] : undefined,
              has_multi_servers: false,
            }))
            setSimilar(unitySimilar)
            setLoadingSimilar(false)
            setUsedUnityFallback(true)
          }
        }

        // Skip fetching from anime-similar/anime-related for HNime paths (not applicable)
        if (!metaData?.fallback && !isHNimeMeta) {
          fetch(`/api/anime-similar?path=${encodeURIComponent(animeWorldPath)}`)
            .then((x) => x.json())
            .then((s) => {
              if (alive) {
                if (s?.ok && s.items) {
                  setSimilar(s.items)
                }
                setLoadingSimilar(false)
              }
            })
            .catch((err) => {
              console.error("[v0] WatchInfo similar error:", err)
              if (alive) setLoadingSimilar(false)
            })

          fetch(`/api/anime-related?path=${encodeURIComponent(animeWorldPath)}`)
            .then((x) => x.json())
            .then((r) => {
              if (alive) {
                if (r?.ok && r.items) {
                  setRelated(r.items)
                }
                setLoadingRelated(false)
              }
            })
            .catch((err) => {
              console.error("[v0] WatchInfo related error:", err)
              if (alive) setLoadingRelated(false)
            })
        }
      } catch (e) {
        console.error("[v0] WatchInfo error:", e)
        if (alive) {
          setLoadingSimilar(false)
          setLoadingRelated(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [path, animeWorldPath, unityId, animepaheId])

  return (
    <div className="grid gap-4 w-full overflow-hidden">
      {meta ? (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-hidden">
              <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[130px_1fr] gap-4 min-w-0">
                <div className="sm:justify-self-start flex items-center">
                  <img
                    src={
                      meta.image?.includes("animepahe")
                        ? `/api/animepahe-image-proxy?url=${encodeURIComponent(meta.image)}`
                        : meta.image || "/anime-poster.png"
                    }
                    alt={meta.title}
                    className="sm:w-[130px] w-[120px] sm:h-[195px] h-[180px] object-cover rounded max-w-full"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex flex-col justify-start overflow-hidden">
                  <div className="text-lg font-semibold truncate">{meta.title}</div>
                  {meta.jtitle ? (
                    <div className="text-sm text-muted-foreground mb-3 truncate">{meta.jtitle}</div>
                  ) : null}
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
                  {meta.anilistId ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex text-xs border rounded px-2 py-0.5">
                        AniList ID: {meta.anilistId}
                      </span>
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

      {loadingSimilar ? (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Serie simili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 w-[150px] h-[260px] bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : similar?.length ? (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Serie simili</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="w-full overflow-x-auto no-scrollbar overscroll-x-contain">
              <div className="flex gap-3 px-6">
                {similar.map((it) => (
                  <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                    <AnimeCard
                      title={it.title}
                      href={it.href}
                      image={it.image || ""}
                      sources={it.sources}
                      has_multi_servers={it.has_multi_servers}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loadingRelated ? (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Correlati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 w-[150px] h-[260px] bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : related?.length ? (
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Correlati</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="w-full overflow-x-auto no-scrollbar overscroll-x-contain">
              <div className="flex gap-3 px-6">
                {related.map((it) => (
                  <div key={it.href} className="shrink-0 w-[150px] min-w-[150px]">
                    <AnimeCard
                      title={it.title}
                      href={it.href}
                      image={it.image || ""}
                      sources={it.sources}
                      has_multi_servers={it.has_multi_servers}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
