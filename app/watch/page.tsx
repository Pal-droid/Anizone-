"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { EpisodePlayer } from "@/components/episode-player"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { QuickListManager } from "@/components/quick-list-manager"
import { WatchInfo } from "@/components/watch-info"
import { deobfuscateUrl } from "@/lib/utils"
import { FavoriteButton } from "@/components/favorite-button"

type Source = { name: string; url: string; id: string }

export default function WatchPage() {
  const sp = useSearchParams()
  const obfuscatedPath = sp.get("p")
  const legacyPath = sp.get("path")

  const path = useMemo(() => {
    console.log("[v0] WatchPage - obfuscatedPath:", obfuscatedPath, "legacyPath:", legacyPath)

    if (obfuscatedPath) {
      const decoded = deobfuscateUrl(obfuscatedPath)
      console.log("[v0] WatchPage - decoded path:", decoded)
      return decoded?.trim() || null
    }
    if (legacyPath) {
      console.log("[v0] WatchPage - using legacy path:", legacyPath)
      return legacyPath.trim()
    }
    return null
  }, [obfuscatedPath, legacyPath])

  const [title, setTitle] = useState<string>("Anime")
  const [sources, setSources] = useState<Source[]>([])
  const [nextEpisodeDate, setNextEpisodeDate] = useState<string>()
  const [nextEpisodeTime, setNextEpisodeTime] = useState<string>()
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingSources, setLoadingSources] = useState(true)
  const [anilistId, setAnilistId] = useState<number | undefined>()

  useEffect(() => {
    if (!path) {
      console.log("[v0] WatchPage - No path available")
      setLoadingMeta(false)
      setLoadingSources(false)
      return
    }

    console.log("[v0] WatchPage - Loading with path:", path)

    setTitle("Anime")
    setSources([])
    setNextEpisodeDate(undefined)
    setNextEpisodeTime(undefined)
    setAnilistId(undefined)
    setLoadingMeta(true)
    setLoadingSources(true)
    window.scrollTo({ top: 0, behavior: "smooth" })

    const slug = path.split("/").pop() || ""
    const namePart = path.split("/").at(2) || slug
    const name = namePart.replace(/\.([A-Za-z0-9_-]+)$/, "").replace(/-/g, " ")
    const capitalizedName = name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    setTitle(capitalizedName || "Anime")

    const fetchData = async () => {
      try {
        // First, fetch sources
        let mappedSources: Source[] = []

        const storageKey = `anizone:sources:${path}`
        console.log("[v0] WatchPage - Looking for sources with key:", storageKey)

        const stored = sessionStorage.getItem(storageKey)
        console.log("[v0] WatchPage - sessionStorage stored:", stored)

        if (stored) {
          const parsedSources = JSON.parse(stored)
          console.log("[v0] WatchPage - Parsed sources:", parsedSources)
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            mappedSources = parsedSources.map((s) => {
              if (s.name === "AnimeWorld" && s.id) {
                // Keep the ID as-is, including trailing hyphens which are part of valid AnimeWorld IDs
                return {
                  ...s,
                  url: s.url || `https://www.animeworld.ac/play/${s.id}`,
                }
              }
              return s
            })
            console.log("[v0] WatchPage - Using normalized sources:", mappedSources)
          }
        }

        if (mappedSources.length === 0) {
          console.log("[v0] WatchPage - No sources in sessionStorage - user should navigate from search")
        }

        setSources(mappedSources)
        setLoadingSources(false)

        try {
          // Define priority order for metadata fetching
          const priorityOrder = ["AnimeWorld", "AnimeSaturn", "AnimeUnity", "AnimePahe"]

          let metaUrl = ""

          // Find the highest priority source available
          for (const sourceName of priorityOrder) {
            const source = mappedSources.find((s) => s.name === sourceName)
            if (source) {
              console.log(`[v0] WatchPage - Using ${sourceName} for metadata (priority match)`)

              if (sourceName === "AnimeWorld") {
                metaUrl = `/api/anime-meta?path=${encodeURIComponent(source.url || `/play/${source.id}`)}`
              } else if (sourceName === "AnimeSaturn") {
                metaUrl = `/api/anime-meta?path=${encodeURIComponent(source.url || source.id)}`
              } else if (sourceName === "AnimeUnity") {
                metaUrl = `/api/anime-meta?unityId=${encodeURIComponent(source.id)}`
              } else if (sourceName === "AnimePahe") {
                metaUrl = `/api/anime-meta?animepaheId=${encodeURIComponent(source.id)}`
              }

              break
            }
          }

          if (!metaUrl) {
            console.log("[v0] WatchPage - No sources available for metadata")
            setLoadingMeta(false)
            return
          }

          console.log("[v0] WatchPage - Fetching metadata from:", metaUrl)
          const response = await fetch(metaUrl)
          if (!response.ok) {
            console.log("[v0] WatchPage - Metadata fetch failed with status:", response.status)
            setLoadingMeta(false)
            return
          }
          const data = await response.json()
          console.log("[v0] WatchPage - Metadata response:", data)
          if (data.ok && data.meta) {
            if (data.meta.title) setTitle(data.meta.title)
            if (data.meta.nextEpisodeDate && data.meta.nextEpisodeTime) {
              setNextEpisodeDate(data.meta.nextEpisodeDate)
              setNextEpisodeTime(data.meta.nextEpisodeTime)
            }
            if (data.meta.anilistId) {
              setAnilistId(data.meta.anilistId)
              const metaKey = `anizone:meta:${path}`
              sessionStorage.setItem(metaKey, JSON.stringify({ anilistId: data.meta.anilistId }))
              console.log("[v0] Stored AniList ID in sessionStorage:", data.meta.anilistId)
            }
          }
        } catch (err) {
          console.log("[v0] WatchPage - Error fetching meta:", err)
        } finally {
          setLoadingMeta(false)
        }
      } catch (err) {
        console.log("[v0] WatchPage - Error fetching sources:", err)
        setLoadingSources(false)
        setLoadingMeta(false)
      }
    }

    fetchData()
  }, [path])

  const seriesKey = useMemo(() => (path ? path : ""), [path])

  if (!path) {
    return (
      <main className="px-4 py-8 overflow-x-hidden">
        <div className="text-sm text-red-600">Parametro "path" mancante.</div>
        <div className="text-xs text-muted-foreground mt-2">
          Debug: p={obfuscatedPath || "null"}, path={legacyPath || "null"}
        </div>
        <div className="mt-4">
          <Link href="/search" className="underline">
            Vai alla ricerca
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/search" className="p-1 -ml-1 shrink-0" aria-label="Indietro">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold truncate">{title}</h1>
          </div>
          {anilistId && <FavoriteButton mediaId={anilistId} itemTitle={title} itemPath={path} size="md" />}
        </div>
      </header>
      <section className="px-4 py-4 md:py-6 space-y-6 overflow-x-hidden max-w-7xl mx-auto">
        {loadingMeta || loadingSources ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-48 md:h-96 bg-gray-300 rounded-md w-full" />
            <div className="h-10 bg-gray-300 rounded-md w-1/2 mx-auto" />
            <div className="h-20 bg-gray-300 rounded-md w-full" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="text-red-600">Nessuna fonte disponibile per questo anime.</div>
            <p className="text-muted-foreground text-sm">
              Per favore cerca l'anime dalla pagina di ricerca per ottenere le fonti corrette.
            </p>
            <Link href="/search" className="inline-block underline text-primary">
              Vai alla ricerca
            </Link>
          </div>
        ) : (
          <>
            <div className="w-full max-w-5xl mx-auto">
              <EpisodePlayer
                key={path}
                path={path}
                seriesTitle={title}
                sources={sources}
                nextEpisodeDate={nextEpisodeDate}
                nextEpisodeTime={nextEpisodeTime}
              />
            </div>
            <div className="flex justify-center">
              <QuickListManager itemId={seriesKey} itemTitle={title} itemPath={path} />
            </div>
            <WatchInfo seriesPath={path} sources={sources} />
          </>
        )}
      </section>
    </main>
  )
}
