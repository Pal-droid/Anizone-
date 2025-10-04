"use client"

import { useState } from "react"
import { Film, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoviePlayerDialog } from "@/components/movie-player-dialog"

interface MovieCardProps {
  item: {
    title: string
    url: string
    image: string
    rating: string
    isHD: boolean
    type: "movie" | "series"
  }
}

export function MovieCard({ item }: MovieCardProps) {
  const [showPlayer, setShowPlayer] = useState(false)

  return (
    <>
      <Card
        className="group cursor-pointer overflow-hidden transition-smooth hover:glow hover:scale-105"
        onClick={() => setShowPlayer(true)}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={item.image || "/placeholder.svg?height=400&width=300"}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2 text-white">
                <Film size={20} />
                <span className="text-sm font-medium">Guarda ora</span>
              </div>
            </div>
          </div>
          {item.isHD && <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">HD</Badge>}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2">{item.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
            <span>{item.rating}</span>
          </div>
        </div>
      </Card>

      <MoviePlayerDialog
        isOpen={showPlayer}
        onClose={() => setShowPlayer(false)}
        movieUrl={item.url}
        title={item.title}
        type={item.type}
      />
    </>
  )
}
