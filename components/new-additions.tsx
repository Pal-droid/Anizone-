"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnimeCard } from "./anime-card"
import { useEffect, useState } from "react"
import { Plus } from "lucide-react"

type NewAdditionItem = {
  title: string
  href: string
  image: string
  status?: string
}

export function NewAdditions() {
  const [items, setItems] = useState<NewAdditionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/new-additions")
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

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          Nuove Aggiunte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[140px] space-y-2 animate-pulse">
                <div className="aspect-[3/4] bg-neutral-200 rounded-xl shadow-sm" />
                <div className="h-3 w-3/4 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-sm text-red-600 py-6 text-center">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Plus size={42} className="opacity-40 mb-2" />
            <p className="text-sm">Nessuna nuova aggiunta disponibile</p>
          </div>
        )}

        {/* Items */}
        {!loading && !error && items.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-2">
            {items.map((item, index) => (
              <div
                key={`${item.href}-${index}`}
                className="shrink-0 w-[140px] sm:w-[160px] snap-start relative group"
              >
                {/* Enhanced AnimeCard with Netflix-like aspect ratio and zoom */}
                <AnimeCard
                  title={item.title}
                  href={item.href}
                  image={item.image}
                  className="rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group-hover:scale-105 aspect-[3/4]"
                />

                {/* Status badge */}
                {item.status && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full backdrop-blur-md bg-green-500/80 text-white text-xs shadow z-10">
                    {item.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}