"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { EpisodePlayer } from "@/components/episode-player"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { QuickListManager } from "@/components/quick-list-manager"
import { WatchInfo } from "@/components/watch-info"
import { deobfuscateUrl } from "@/lib/utils"

type Source = { name: string; url: string; id: string }

export default function WatchPage() {
  const sp = useSearchParams()
  const obfuscatedPath = sp.get("p")
  const legacyPath = sp.get("path")

  const path = useMemo(() => {
    if (obfuscatedPath) return deobfuscateUrl(obfuscatedPath).trim()
    return legacyPath?.trim()
  }, [obfuscatedPath, legacyPath])

  const [title, setTitle] = useState<string>("Anime")
  const [sources, setSources] = useState<Source[]>([])
  const [nextEpisodeDate, setNextEpisodeDate] = useState<string>()
  const [nextEpisodeTime, setNextEpisodeTime] = useState<string>()
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingSources, setLoadingSources] = useState(true)

  useEffect(() => {
    if (!path) return

    // Reset state for new anime
    setTitle("Anime")
    setSources([])
    setNextEpisodeDate(undefined)
    setNextEpisodeTime(undefined)
    setLoadingMeta(true)
    setLoadingSources(true)
    window.scrollTo({ top: 0, behavior: "smooth" })

    // Fallback title from slug
    const slug = path.split("/").pop() || ""
    const namePart = path.split("/").at(2) || slug
    const name = namePart.replace(/\.([A-Za-z0-9_-]+)$/, "").replace(/-/g, " ")
    const capitalizedName = name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    setTitle(capitalizedName || "Anime")

    // Fetch sources (first episode) from AW/AUS API
    const fetchSources = async () => {
      try {
        let mappedSources: Source[] = []

        // Legacy sessionStorage
        const stored = sessionStorage.getItem(`anizone:sources:${path}`)
        if (stored) {
          mappedSources = JSON.parse(stored)
        } else {
          // Fetch first episode
          const response = await fetch(`https://aw-au-as-api.vercel.app/api/episodes?AW=${encodeURIComponent(path)}`)
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              const firstEpisode = data[0]
              Object.entries(firstEpisode.sources).forEach(([name, info]: any) => {
                if (info.available && info.url && info.id) {
                  mappedSources.push({
                    name,
                    url: info.url,
                    id: info.id,
                  })
                }
              })
            }
          }
        }

        setSources(mappedSources)
      } catch (err) {
        console.log("[WatchPage] Error fetching sources:", err)
      } finally {
        setLoadingSources(false)
      }
    }

    fetchSources()

    // Fetch metadata
    const fetchMeta = async () => {
      try {
        const response = await fetch(`/api/anime-meta?path=${encodeURIComponent(path)}`)
        if (!response.ok) return
        const data = await response.json()
        if (data.ok && data.meta) {
          if (data.meta.title) setTitle(data.meta.title)
          if (data.meta.nextEpisodeDate && data.meta.nextEpisodeTime) {
            setNextEpisodeDate(data.meta.nextEpisodeDate)
            setNextEpisodeTime(data.meta.nextEpisodeTime)
          }
        }
      } catch (err) {
        console.log("[WatchPage] Error fetching meta:", err)
      } finally {
        setLoadingMeta(false)
      }
    }

    fetchMeta()
  }, [path])

  const seriesKey = useMemo(() => (path ? path : ""), [path])

  if (!path) {
    return (
      <main className="px-4 py-8 overflow-x-hidden">
        <div className="text-sm text-red-600">Parametro "path" mancante.</div>
        <div className="mt-4">
          <Link href="/" className="underline">
            Torna alla home
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
          <div className="text-center text-red-600">Nessuna fonte disponibile per questo anime.</div>
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
            <WatchInfo seriesPath={path} />
          </>
        )}
      </section>
    </main>
  )
}
