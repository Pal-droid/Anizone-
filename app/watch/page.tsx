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
    if (obfuscatedPath) {
      return deobfuscateUrl(obfuscatedPath)
    }
    return legacyPath
  }, [obfuscatedPath, legacyPath])

  const [title, setTitle] = useState<string>("")
  const [sources, setSources] = useState<Source[]>([])

  useEffect(() => {
    if (!path) return
    const slug = path.split("/").pop() || ""
    const namePart = path.split("/").at(2) || slug
    const name = namePart.replace(/\.([A-Za-z0-9_-]+)$/, "").replace(/-/g, " ")
    const capitalizedName = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
    setTitle(capitalizedName ? capitalizedName : "Anime")

    // Try to get sources from sessionStorage (set by search page)
    try {
      const stored = sessionStorage.getItem(`anizone:sources:${path}`)
      if (stored) {
        const parsedSources = JSON.parse(stored) as Source[]
        setSources(parsedSources)
      }
    } catch {}
  }, [path])

  const seriesKey = useMemo(() => {
    if (!path) return ""
    // Use the full path for seriesKey instead of truncating to first two parts
    return path
  }, [path])

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
        <EpisodePlayer path={path} seriesTitle={title} sources={sources} />
        <div className="flex justify-center">
          <QuickListManager itemId={seriesKey} itemTitle={title || "Anime"} type="anime" itemPath={path} />
        </div>
        <WatchInfo seriesPath={path} />
      </section>
    </main>
  )
}
