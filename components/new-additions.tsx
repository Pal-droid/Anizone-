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

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus size={16} />
            Nuove Aggiunte
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
            <Plus size={16} />
            Nuove Aggiunte
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
            <Plus size={16} />
            Nuove Aggiunte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Plus size={48} className="mx-auto mb-2 opacity-50" />
            <p>Nessuna nuova aggiunta disponibile</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus size={16} />
          Nuove Aggiunte
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
                sources={[{ name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" }]}
              />
              {item.status && (
                <div className="absolute top-2 right-2 py-0.5 px-1.5 rounded bg-green-600/90 text-white text-xs">
                  {item.status}
                </div>
              )}
              {item.releaseDate && (
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1 py-0.5 px-1.5 rounded bg-black/70 text-white text-xs">
                    <Clock size={10} />
                    <span className="truncate text-ellipsis overflow-hidden">{item.releaseDate}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
