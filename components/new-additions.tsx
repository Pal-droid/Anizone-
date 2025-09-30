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
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[128px] space-y-2 animate-pulse">
                <div className="aspect-[2/3] bg-neutral-200 rounded-lg" />
                <div className="h-4 w-3/4 bg-neutral-200 rounded" />
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
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2">
            {items.map((item, index) => (
              <div
                key={`${item.href}-${index}`}
                className="shrink-0 w-[128px] sm:w-[140px] snap-start relative group"
              >
                {/* Enhanced AnimeCard to match AnimeContentSections */}
                <AnimeCard
                  title={item.title}
                  href={item.href}
                  image={item.image}
                  className="rounded-lg overflow-hidden bg-neutral-900 transition-transform duration-200 group-hover:scale-105 aspect-[2/3]"
                />
                {/* Status badge */}
                {item.status && (
                  <div className="absolute top-2 right-2 px-1 py-0 rounded text-xs bg-secondary text-secondary-foreground shadow z-10">
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