"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { useState } from "react"
import { obfuscateId } from "@/lib/utils"

interface TrendingChapter {
  id: string
  title: string
  image: string
  chapter: string
  url: string
}

const trendingData: TrendingChapter[] = [
  {
    id: "1637",
    title: "Chainsaw Man",
    image: "https://cdn.mangaworld.cx/mangas/5f9cbdf01eeb781e533159ec.png?1756877508269",
    chapter: "Capitolo 213",
    url: "/manga/1637/chainsaw-man",
  },
  {
    id: "3701",
    title: "Solo Leveling: Ragnarok",
    image: "https://cdn.mangaworld.cx/mangas/66bcb31f22999d3337b1971a.png?1756877504020",
    chapter: "Capitolo 48",
    url: "/manga/3701/solo-leveling-ragnarok",
  },
  {
    id: "3701-2",
    title: "Solo Leveling: Ragnarok",
    image: "https://cdn.mangaworld.cx/mangas/66bcb31f22999d3337b1971a.png?1756877504020",
    chapter: "Capitolo 49",
    url: "/manga/3701/solo-leveling-ragnarok",
  },
  {
    id: "3701-3",
    title: "Solo Leveling: Ragnarok",
    image: "https://cdn.mangaworld.cx/mangas/66bcb31f22999d3337b1971a.png?1756877504020",
    chapter: "Capitolo 50",
    url: "/manga/3701/solo-leveling-ragnarok",
  },
  {
    id: "1848",
    title: "Blue Lock",
    image: "https://cdn.mangaworld.cx/mangas/5fa4b8dda9cc8717e089349e.jpg?1756877505227",
    chapter: "Capitolo 314.5",
    url: "/manga/1848/blue-lock",
  },
  {
    id: "3965",
    title: "Star-Embracing Swordmaster",
    image: "https://cdn.mangaworld.cx/mangas/67a6cbfff6369d0d1b4afc6e.png?1756877488284",
    chapter: "Capitolo 35",
    url: "/manga/3965/the-stellar-swordmaster",
  },
  {
    id: "1972",
    title: "Martial Peak",
    image: "https://cdn.mangaworld.cx/mangas/5fa8afef25d77b716a36c9be.png?1756877507530",
    chapter: "Capitolo 1779",
    url: "/manga/1972/martial-peak",
  },
]

export function TrendingChapters() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 1

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + itemsPerPage >= trendingData.length ? 0 : prev + itemsPerPage))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, trendingData.length - itemsPerPage) : Math.max(0, prev - itemsPerPage),
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
              <Link href={`/manga/${obfuscateId(item.id)}`} className="block">
                <div className="flex gap-3">
                  <div className="relative">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-16 h-20 object-cover rounded"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b">
                      {item.chapter}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

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
      </div>
    </div>
  )
}
