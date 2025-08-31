import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
}

interface MangaCardProps {
  manga: MangaResult
}

export function MangaCard({ manga }: MangaCardProps) {
  // Extract manga ID from URL for routing
  const mangaId = manga.url.split("/").pop() || ""

  return (
    <Link href={`/manga/${mangaId}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg">
        <CardContent className="p-0">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg">
            <img
              src={manga.image || "/placeholder.svg"}
              alt={manga.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {manga.type}
              </Badge>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant={manga.status === "Finito" ? "default" : "outline"} className="text-xs">
                {manga.status}
              </Badge>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{manga.title}</h3>

            {manga.author && <p className="text-xs text-muted-foreground">di {manga.author}</p>}

            {manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
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

            {manga.story && <p className="text-xs text-muted-foreground line-clamp-2">{manga.story}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
