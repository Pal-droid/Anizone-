"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, obfuscateUrl } from "@/lib/utils"
import Link from "next/link"

type Source = {
  name: string
  url: string
  id: string
}

type Props = {
  title: string
  href: string
  image: string
  isDub?: boolean
  className?: string
  sources?: Source[]
  has_multi_servers?: boolean
}

export function AnimeCard({ title, href, image, isDub, className, sources, has_multi_servers }: Props) {
  const path = (() => {
    try {
      // Handle full URLs like https://www.animeworld.ac/play/fly-me-to-the-moon.cGPnE
      const u = new URL(href, "https://dummy.local")
      const parts = u.pathname.split("/").filter(Boolean)
      // Extract just /play/anime-id format
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return u.pathname
    } catch {
      const parts = href.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      return href.startsWith("/") ? href : `/${href}`
    }
  })()

  console.log("[v0] AnimeCard - href:", href, "extracted path:", path, "sources:", sources)

  const hasAnimeWorld = sources?.some((s) => s.name === "AnimeWorld")
  const hasAnimeSaturn = sources?.some((s) => s.name === "AnimeSaturn")
  const hasAnimePahe = sources?.some((s) => s.name === "AnimePahe")
  const showBadges = sources && sources.length > 0 && (hasAnimeWorld || hasAnimeSaturn || hasAnimePahe)

  const isAnimePaheImage = image.includes("animepahe.si") || image.includes("animepahe.com")
  const displayImage = isAnimePaheImage ? `/api/animepahe-image-proxy?url=${encodeURIComponent(image)}` : image

  const handleClick = () => {
    console.log("[v0] AnimeCard - Clicked, storing sources for path:", path)
    if (sources && sources.length > 0) {
      try {
        const storageKey = `anizone:sources:${path}`
        console.log("[v0] AnimeCard - Storing to sessionStorage with key:", storageKey)
        sessionStorage.setItem(storageKey, JSON.stringify(sources))
      } catch (e) {
        console.error("[v0] AnimeCard - Failed to store sources:", e)
      }
    }
  }

  const obfuscatedPath = obfuscateUrl(path)
  console.log("[v0] AnimeCard - obfuscated path:", obfuscatedPath)

  return (
    <Link href={`/watch?p=${obfuscatedPath}`} className={cn("block", className)} onClick={handleClick}>
      <Card className="group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg h-full">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
            <img
              src={displayImage || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
              loading="lazy"
            />

            {showBadges && (
              <div className="absolute top-2 left-2 flex gap-1.5">
                {hasAnimeWorld && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/95 p-1 shadow-md backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animeworld.ac&size=48"
                      alt="AnimeWorld"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                {hasAnimeSaturn && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/95 p-1 shadow-md backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animesaturn.cx&size=48"
                      alt="AnimeSaturn"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                {hasAnimePahe && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/95 p-1 shadow-md backdrop-blur-sm">
                    <img
                      src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animepahe.si&size=48"
                      alt="AnimePahe"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {isDub && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  DUB
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 space-y-2 flex-1 flex flex-col min-h-[80px]">
            <h3 className="font-semibold text-sm leading-tight flex-1 overflow-hidden">
              <span className="line-clamp-2 break-words">{title}</span>
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
