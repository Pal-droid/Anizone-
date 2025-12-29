"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { obfuscateId } from "@/lib/utils"
import { FavoriteButton } from "@/components/favorite-button"
import { ListEditButton } from "@/components/list-edit-button"
import { useState } from "react"

interface MangaResult {
  title: string
  url: string
  image: string
  type: string
  status: string
  author: string
  artist: string
  genres: string[]
  story: string
  mangaId?: string
  mangaSlug?: string
  sources?: Array<{
    name: string
    slug: string
    id: string
    hash_id?: string
  }>
}

interface MangaCardProps {
  manga: MangaResult
}

export function MangaCard({ manga }: MangaCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  let mangaId = manga.mangaId || ""

  if (!mangaId && manga.url) {
    const urlParts = manga.url.split("/")
    const mangaIndex = urlParts.findIndex((part) => part === "manga")
    if (mangaIndex !== -1 && mangaIndex + 1 < urlParts.length) {
      const idPart = urlParts[mangaIndex + 1]
      mangaId = idPart.match(/^\d+/) ? idPart.match(/^\d+/)![0] : idPart
    } else {
      mangaId = urlParts.pop() || ""
    }
  }

  const obfuscatedId = obfuscateId(mangaId)

  let detailUrl = `/manga/${obfuscatedId}`
  if (manga.sources && manga.sources.length > 0) {
    const params = new URLSearchParams()

    const comixSource = manga.sources.find((s) => s.name === "Comix")
    const worldSource = manga.sources.find((s) => s.name === "World")

    if (comixSource) {
      if (comixSource.hash_id) params.append("comix_hash_id", comixSource.hash_id)
      if (comixSource.slug) params.append("comix_slug", comixSource.slug)
    }

    if (worldSource) {
      if (worldSource.id) params.append("world_id", worldSource.id)
      if (worldSource.slug) params.append("world_slug", worldSource.slug)
    }

    if (params.toString()) {
      detailUrl += `?${params.toString()}`
    }
  }

  return (
    <Link href={detailUrl} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Card className="group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg h-full">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg">
            <img
              src={manga.image || "/placeholder.svg"}
              alt={manga.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
              loading="lazy"
            />

            {isHovered && (
              <div className="absolute top-2 right-2 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <FavoriteButton itemTitle={manga.title} itemPath={detailUrl} size="sm" />
                <ListEditButton
                  itemId={mangaId}
                  itemTitle={manga.title}
                  itemImage={manga.image}
                  itemPath={detailUrl}
                  size="sm"
                />
              </div>
            )}

            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {manga.type}
              </Badge>
            </div>
            <div className="absolute bottom-2 right-2">
              <Badge variant={manga.status === "Finito" ? "default" : "outline"} className="text-xs">
                {manga.status}
              </Badge>
            </div>
          </div>

          <div className="p-3 space-y-2 flex-1 flex flex-col h-[120px]">
            <h3 className="font-semibold text-sm leading-tight flex-shrink-0 overflow-hidden">
              <span className="line-clamp-2 break-words">{manga.title}</span>
            </h3>

            {manga.author && <p className="text-xs text-muted-foreground flex-shrink-0">di {manga.author}</p>}

            {manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 flex-shrink-0">
                {manga.genres.slice(0, 2).map((genre, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                    {genre}
                  </Badge>
                ))}
                {manga.genres.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{manga.genres.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {manga.story && (
              <p className="text-xs text-muted-foreground flex-1 overflow-hidden">
                <span className="line-clamp-2 break-words">{manga.story}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
