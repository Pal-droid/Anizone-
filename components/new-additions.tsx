"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnimeCard } from "./anime-card"
import { useEffect, useState } from "react"
import { Plus, Clock } from "lucide-react"

type NewAdditionItem = {
  title: string
  href: string
  image: string
  releaseDate?: string
  status?: string
  isDub?: boolean
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
    <Card className="shadow-sm">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          Nuove Aggiunte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[120px] space-y-2 animate-pulse">
                <div className="aspect-[2/3] bg-neutral-200 rounded-xl shadow-sm" />
                <div className="h-3 w-3/4 bg-neutral-200 rounded" />
                <div className="h-2 w-1/2 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-600 py-6 text-center">{error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Plus size={42} className="opacity-40 mb-2" />
            <p className="text-sm">Nessuna nuova aggiunta disponibile</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1">
            {items.map((item, index) => (
              <div
                key={`${item.href}-${index}`}
                className="relative shrink-0 w-[120px] snap-start transition-transform hover:scale-105 hover:shadow-md"
              >
                <AnimeCard
                  title={item.title}
                  href={item.href}
                  image={item.image}
                  isDub={item.isDub}
                  sources={[{ name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" }]}
                />
                {item.status && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-600 text-white text-xs shadow">
                    {item.status}
                  </div>
                )}
                {item.releaseDate && (
                  <div className="absolute bottom-2 left-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-xs">
                      <Clock size={10} />
                      <span className="truncate">{item.releaseDate}</span>
                    </div>
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