"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnimeCard } from "./anime-card"
import { useEffect, useState } from "react"
import { Play } from "lucide-react"

type OngoingAnimeItem = {
  title: string
  href: string
  image: string
  currentEpisode: string
  totalEpisodes: string
  isDub?: boolean
  isONA?: boolean
  sources?: Array<{ name: string; url: string; id: string }>
}

export function OngoingAnime() {
  const [items, setItems] = useState<OngoingAnimeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/ongoing-anime")
        const ct = r.headers.get("content-type") || ""
        if (!ct.includes("application/json")) {
          const txt = await r.text()
          throw new Error(txt.slice(0, 200))
        }
        const j = await r.json()
        if (j.ok) setItems(j.items)
        else setError(j.error || "Errore nel caricamento")
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play size={16} />
            Anime in Corso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[120px] space-y-2">
                <div className="aspect-[2/3] bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-neutral-200 rounded animate-pulse" />
                <div className="h-2 w-1/2 bg-neutral-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play size={16} />
            Anime in Corso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play size={16} />
            Anime in Corso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Play size={48} className="mx-auto mb-2 opacity-50" />
            <p>Nessun anime in corso disponibile</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play size={16} />
          Anime in Corso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {items.map((item, index) => (
            <div key={`${item.href}-${index}`} className="relative shrink-0 w-[120px]">
              <AnimeCard
                title={item.title}
                href={item.href}
                image={item.image}
                isDub={item.isDub}
                sources={item.sources || [{ name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" }]}
              />

              {/* Episode progress indicator */}
              <div className="absolute top-2 left-2 py-0.5 px-1.5 rounded bg-blue-600/90 text-white text-xs font-medium">
                {item.currentEpisode}/{item.totalEpisodes}
              </div>

              {/* ONA indicator */}
              {item.isONA && (
                <div className="absolute top-8 right-2 py-0.5 px-1.5 rounded bg-purple-600/90 text-white text-xs font-medium">
                  ONA
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}