"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { useState, useEffect } from "react"
import { obfuscateId } from "@/lib/utils"

interface TrendingChapter {
  id: string
  title: string
  image: string
  chapter: string
  url: string
}

export function TrendingChapters() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trendingData, setTrendingData] = useState<TrendingChapter[]>([])
  const [loading, setLoading] = useState(true)
  const itemsPerPage = 1

  useEffect(() => {
    const fetchTrendingChapters = async () => {
      try {
        const response = await fetch("/api/trending-chapters")
        const data = await response.json()
        if (data.ok && data.chapters) {
          setTrendingData(data.chapters)
        }
      } catch (error) {
        console.error("[TrendingChapters] Error fetching trending chapters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingChapters()
  }, [])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + itemsPerPage >= trendingData.length ? 0 : prev + itemsPerPage))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, trendingData.length - itemsPerPage) : Math.max(0, prev - itemsPerPage),
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-500" />
          <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
        </div>
        <div className="animate-pulse">
          <Card className="w-[280px] h-[380px] bg-neutral-200"></Card>
        </div>
      </div>
    )
  }

  if (trendingData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-500" />
          <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
        </div>
        <Card className="p-4 text-center text-muted-foreground">
          <p>Nessun capitolo di tendenza disponibile</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Flame size={20} className="text-orange-500" />
        <h2 className="text-lg font-semibold">Capitoli di tendenza</h2>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (280 + 16)}px)` }}
        >
          {trendingData.map((item) => (
            <Card key={item.id} className="flex-shrink-0 w-[280px] p-3">
              <Link href={`/manga/${obfuscateId(item.id)}`} className="block group">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg shadow-md transition-transform duration-300 transform group-hover:scale-105">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b">
                    {item.chapter}
                  </div>
                </div>
                <h3 className="mt-2 font-medium text-sm line-clamp-2 text-center group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
              </Link>
            </Card>
          ))}
        </div>

        {trendingData.length > itemsPerPage && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={16} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 backdrop-blur-sm"
              onClick={nextSlide}
              disabled={currentIndex + itemsPerPage >= trendingData.length}
            >
              <ChevronRight size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}