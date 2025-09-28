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
    if (obfuscatedPath) return deobfuscateUrl(obfuscatedPath)
    return legacyPath
  }, [obfuscatedPath, legacyPath])

  const [title, setTitle] = useState<string>("Anime")
  const [sources, setSources] = useState<Source[]>([])
  const [nextEpisodeDate, setNextEpisodeDate] = useState<string>()
  const [nextEpisodeTime, setNextEpisodeTime] = useState<string>()
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    if (!path) return

    // --- Fallback title from slug ---
    const slug = path.split("/").pop() || ""
    const namePart = path.split("/").at(2) || slug
    const name = namePart.replace(/\.([A-Za-z0-9_-]+)$/, "").replace(/-/g, " ")
    const capitalizedName = name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
    setTitle(capitalizedName || "Anime")

    // --- Load sources from sessionStorage ---
    try {
      const stored = sessionStorage.getItem(`anizone:sources:${path}`)
      if (stored) setSources(JSON.parse(stored) as Source[])
    } catch {}

    // --- Fetch meta data (title + next episode) ---
    const fetchMeta = async () => {
      setLoadingMeta(true)
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
          <Link href="/" className="underline">Torna alla home</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/search" className="p-1 -ml-1 shrink-0" aria-label="Indietro">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold truncate">{title}</h1>
          </div>
        </div>
      </header>
      <section className="px-4 py-4 space-y-6 overflow-x-hidden">
        {loadingMeta ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-gray-300 rounded-md w-full" />
            <div className="h-10 bg-gray-300 rounded-md w-1/2 mx-auto" />
            <div className="h-20 bg-gray-300 rounded-md w-full" />
          </div>
        ) : (
          <>
            <EpisodePlayer
              path={path}
              seriesTitle={title}
              sources={sources}
              nextEpisodeDate={nextEpisodeDate}
              nextEpisodeTime={nextEpisodeTime}
            />
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