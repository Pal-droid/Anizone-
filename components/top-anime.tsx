"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AnimeCard } from "./anime-card"
import { useEffect, useState } from "react"
import { Eye, Star } from "lucide-react"
import Link from "next/link"

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
  const [activeTab, setActiveTab] = useState("day")

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

  const renderRankingList = (items: TopItem[]) => {
    if (!items || items.length === 0) {
      return <div className="text-sm text-muted-foreground">Nessun elemento trovato.</div>
    }

    const [featured, ...rest] = items.slice(0, 6)

    return (
      <div className="space-y-4">
        {/* Featured #1 item */}
        {featured && (
          <div className="flex gap-3 p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border">
            <div className="relative shrink-0">
              <img
                src={featured.image || "/placeholder.svg"}
                alt={featured.title}
                className="w-16 h-24 object-cover rounded"
                loading="lazy"
              />
              <div className="absolute -top-1 -left-1 w-6 h-6 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                1
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/watch?path=${encodeURIComponent(
                  (() => {
                    try {
                      const u = new URL(featured.href)
                      return u.pathname
                    } catch {
                      return featured.href
                    }
                  })(),
                )}`}
                className="hover:text-primary transition-colors"
                onClick={() => {
                  try {
                    const path = (() => {
                      try {
                        const u = new URL(featured.href)
                        return u.pathname
                      } catch {
                        return featured.href
                      }
                    })()
                    const sources = [
                      { name: "AnimeWorld", url: featured.href, id: featured.href.split("/").pop() || "" },
                    ]
                    sessionStorage.setItem(`anizone:sources:${path}`, JSON.stringify(sources))
                  } catch {}
                }}
              >
                <h3 className="font-semibold text-sm mb-1 overflow-hidden">
                  <span className="line-clamp-2 break-words">{featured.title}</span>
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {featured.views && (
                  <div className="flex items-center gap-1">
                    <Eye size={12} />
                    <span>{featured.views}</span>
                  </div>
                )}
                {featured.rating && (
                  <div className="flex items-center gap-1">
                    <Star size={12} />
                    <span>{featured.rating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rest of the rankings */}
        <div className="space-y-2">
          {rest.map((item) => (
            <div
              key={`${item.rank}-${item.href}`}
              className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground text-xs font-medium rounded">
                {item.rank}
              </div>
              <div className="relative shrink-0">
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  className="w-10 h-14 object-cover rounded"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/watch?path=${encodeURIComponent(
                    (() => {
                      try {
                        const u = new URL(item.href)
                        return u.pathname
                      } catch {
                        return item.href
                      }
                    })(),
                  )}`}
                  className="hover:text-primary transition-colors"
                  onClick={() => {
                    try {
                      const path = (() => {
                        try {
                          const u = new URL(item.href)
                          return u.pathname
                        } catch {
                          return item.href
                        }
                      })()
                      const sources = [{ name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" }]
                      sessionStorage.setItem(`anizone:sources:${path}`, JSON.stringify(sources))
                    } catch {}
                  }}
                >
                  <h4 className="font-medium text-sm mb-1 overflow-hidden">
                    <span className="line-clamp-1 break-words">{item.title}</span>
                  </h4>
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.views && (
                    <div className="flex items-center gap-1">
                      <Eye size={10} />
                      <span>{item.views}</span>
                    </div>
                  )}
                  {item.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={10} />
                      <span>{item.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderRow = (items: TopItem[]) => {
    if (!items || items.length === 0) {
      return <div className="text-sm text-muted-foreground">Nessun elemento trovato.</div>
    }
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((it) => (
          <div key={`${it.rank}-${it.href}`} className="relative shrink-0 w-[150px]">
            <AnimeCard
              title={it.title}
              href={it.href}
              image={it.image}
              className="w-[150px]"
              sources={[{ name: "AnimeWorld", url: it.href, id: it.href.split("/").pop() || "" }]}
            />
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
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-6 h-6 bg-neutral-200 rounded animate-pulse" />
                <div className="w-10 h-14 bg-neutral-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-neutral-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="day" className="w-full" onValueChange={setActiveTab}>
            <div className="relative mb-3">
              <TabsList className="w-full grid grid-cols-3 relative">
                <TabsTrigger value="day">Giorno</TabsTrigger>
                <TabsTrigger value="week">Settimana</TabsTrigger>
                <TabsTrigger value="month">Mese</TabsTrigger>
              </TabsList>
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-primary transition-transform duration-300 ease-in-out"
                style={{
                  width: "33.333%",
                  transform: `translateX(${activeTab === "day" ? 0 : activeTab === "week" ? 100 : 200}%)`,
                }}
              />
            </div>

            <div className="relative overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${activeTab === "day" ? 0 : activeTab === "week" ? 100 : 200}%)`,
                }}
              >
                <div className="w-full flex-shrink-0">{renderRankingList(data.day)}</div>
                <div className="w-full flex-shrink-0">{renderRankingList(data.week)}</div>
                <div className="w-full flex-shrink-0">{renderRankingList(data.month)}</div>
              </div>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default TopAnime
