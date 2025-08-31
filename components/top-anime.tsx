"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnimeCard } from "./anime-card"
import { useEffect, useState } from "react"

type TopItem = {
  rank: number
  title: string
  href: string
  image: string
  views?: string
  rating?: string
}

type TopData = {
  day: TopItem[]
  week: TopItem[]
  month: TopItem[]
}

export function TopAnime() {
  const [data, setData] = useState<TopData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch("/api/top")
        const ct = r.headers.get("content-type") || ""
        if (!ct.includes("application/json")) {
          const txt = await r.text()
          throw new Error(txt.slice(0, 200))
        }
        const j = await r.json()
        if (j.ok) setData(j.data)
        else setError(j.error || "Errore nel caricamento")
      } catch (e: any) {
        setError(e?.message || "Errore nel caricamento")
      }
    })()
  }, [])

  const renderRow = (items: TopItem[]) => {
    if (!items || items.length === 0) {
      return <div className="text-sm text-muted-foreground">Nessun elemento trovato.</div>
    }
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((it) => (
          <div key={`${it.rank}-${it.href}`} className="relative shrink-0 w-[150px]">
            <AnimeCard title={it.title} href={it.href} image={it.image} className="w-[150px]" />
            <div className="absolute top-2 left-2 py-0.5 px-2 rounded bg-neutral-900/80 text-white text-xs">
              #{it.rank}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Top Anime</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {!data ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[150px] space-y-2">
                <div className="aspect-[2/3] bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-neutral-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="day" className="w-full">
            <TabsList className="mb-3 w-full grid grid-cols-3">
              <TabsTrigger value="day">Giorno</TabsTrigger>
              <TabsTrigger value="week">Settimana</TabsTrigger>
              <TabsTrigger value="month">Mese</TabsTrigger>
            </TabsList>
            <TabsContent value="day">{renderRow(data.day)}</TabsContent>
            <TabsContent value="week">{renderRow(data.week)}</TabsContent>
            <TabsContent value="month">{renderRow(data.month)}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default TopAnime
