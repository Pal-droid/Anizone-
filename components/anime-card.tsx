"use client"

import { Card, CardContent } from "@/components/ui/card"
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
      const u = new URL(href)
      return u.pathname
    } catch {
      return href
    }
  })()

  const hasAnimeWorld = sources?.some((s) => s.name === "AnimeWorld")
  const hasAnimeSaturn = sources?.some((s) => s.name === "AnimeSaturn")
  const showBadges = sources && sources.length > 0 && (hasAnimeWorld || hasAnimeSaturn)

  // Store sources in sessionStorage for the watch page
  const handleClick = () => {
    if (sources && sources.length > 0) {
      try {
        sessionStorage.setItem(`anizone:sources:${path}`, JSON.stringify(sources))
      } catch {}
    }
  }

  const obfuscatedPath = obfuscateUrl(path)

  return (
    <Link href={`/watch?p=${obfuscatedPath}`} className={cn("block", className)} onClick={handleClick}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="relative aspect-[2/3] w-full bg-neutral-100 overflow-hidden">
          <img
            src={image || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Source badges */}
          {showBadges && (
            <div className="absolute top-2 left-2 flex gap-1">
              {hasAnimeWorld && (
                <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/90 p-0.5 shadow-sm">
                  <img
                    src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animeworld.ac&size=256"
                    alt="AnimeWorld"
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
              )}
              {hasAnimeSaturn && (
                <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/90 p-0.5 shadow-sm">
                  <img
                    src="https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animesaturn.cx"
                    alt="AnimeSaturn"
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          {isDub ? (
            <div className="absolute top-2 right-2 rounded bg-neutral-900/85 text-white text-xs px-2 py-0.5">DUB</div>
          ) : null}
        </div>
        <CardContent className="p-3 flex flex-col h-[60px]">
          <div className="text-sm font-medium flex-1 flex items-start justify-start leading-tight overflow-hidden">
            <span className="line-clamp-2 text-ellipsis">{title}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
