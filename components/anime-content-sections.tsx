"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

type AnimeItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
}

export function AnimeContentSections() {
  const [activeTab, setActiveTab] = useState("all")
  const [episodes, setEpisodes] = useState<{ [key: string]: AnimeItem[] }>({
    all: [],
    sub: [],
    dub: [],
    trending: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLatestEpisodes = async () => {
      try {
        const response = await fetch("/api/latest-episodes")
        const data = await response.json()

        if (data.ok) {
          setEpisodes(data.episodes)
        }
      } catch (error) {
        console.error("[v0] Error fetching latest episodes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestEpisodes()
  }, [])

  function AnimeGrid({ items }: { items: AnimeItem[] }) {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-neutral-200 rounded-lg"></div>
              <div className="h-4 bg-neutral-200 rounded mt-2"></div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-2" style={{ width: `${Math.max(items.length * 140, 700)}px` }}>
          {items.map((item, index) => (
            <Link key={index} href={item.href} className="group flex-shrink-0 w-32">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <h3 className="text-sm font-medium mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Ultimi Episodi</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              Tutti
            </TabsTrigger>
            <TabsTrigger value="sub" className="text-xs">
              Sub ITA
            </TabsTrigger>
            <TabsTrigger value="dub" className="text-xs">
              Dub ITA
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <AnimeGrid items={episodes.all} />
          </TabsContent>

          <TabsContent value="sub" className="mt-0">
            <AnimeGrid items={episodes.sub} />
          </TabsContent>

          <TabsContent value="dub" className="mt-0">
            <AnimeGrid items={episodes.dub} />
          </TabsContent>

          <TabsContent value="trending" className="mt-0">
            <AnimeGrid items={episodes.trending} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
