"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

type NewAdditionItem = {
  title: string
  href: string
  image: string
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
    <Card>
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          Nuove Aggiunte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 space-y-2 animate-pulse">
                <div className="aspect-[2/3] bg-neutral-200 rounded-lg"></div>
                <div className="h-4 bg-neutral-200 rounded mt-2"></div>
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
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 pb-2" style={{ width: `${Math.max(items.length * 140, 700)}px` }}>
              {items.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group flex-shrink-0 w-32"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900 w-full">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    {item.isDub && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          DUB
                        </Badge>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium mt-2 group-hover:text-primary transition-colors overflow-hidden">
                    <span className="line-clamp-2 break-words leading-tight">{item.title}</span>
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}