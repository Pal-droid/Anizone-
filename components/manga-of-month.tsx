import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { obfuscateId } from "@/lib/utils"

interface MangaRanking {
  rank: number
  id: string
  title: string
  image: string
  type: string
  status: string
  views: string
  url: string
}

const monthlyRankingData: MangaRanking[] = [
  {
    rank: 1,
    id: "1708",
    title: "One Piece",
    image: "https://cdn.mangaworld.cx/mangas/5fa0c9e2c9f2201ee55d3bd4.jpg?1756877501929",
    type: "Manga",
    status: "In corso",
    views: "63781 volte",
    url: "/manga/1708/one-piece",
  },
  {
    rank: 2,
    id: "1972",
    title: "Martial Peak",
    image: "https://cdn.mangaworld.cx/mangas/5fa8afef25d77b716a36c9be.png?1756877490144",
    type: "Manhua",
    status: "In corso",
    views: "46507 volte",
    url: "/manga/1972/martial-peak",
  },
  {
    rank: 3,
    id: "1929",
    title: "Tales of Demons and Gods",
    image: "https://cdn.mangaworld.cx/mangas/5fa7972225d77b716a367c3a.png?1756877477106",
    type: "Manhua",
    status: "In corso",
    views: "39883 volte",
    url: "/manga/1929/tales-of-demons-and-gods",
  },
  {
    rank: 4,
    id: "2668",
    title: "Gachiakuta",
    image: "https://cdn.mangaworld.cx/mangas/6224d243d419c234059a49e5.jpg?1756877484863",
    type: "Manga",
    status: "In corso",
    views: "38729 volte",
    url: "/manga/2668/gachiakuta",
  },
  {
    rank: 5,
    id: "1738",
    title: "Solo Leveling",
    image: "https://cdn.mangaworld.cx/mangas/5fa2239690f9bf1e6af01d46.jpg?1756877505392",
    type: "Manhwa",
    status: "Finito",
    views: "35615 volte",
    url: "/manga/1738/solo-leveling",
  },
  {
    rank: 6,
    id: "3701",
    title: "Solo Leveling: Ragnarok",
    image: "https://cdn.mangaworld.cx/mangas/66bcb31f22999d3337b1971a.png?1756877504020",
    type: "Manhwa",
    status: "In corso",
    views: "34418 volte",
    url: "/manga/3701/solo-leveling-ragnarok",
  },
  {
    rank: 7,
    id: "2278",
    title: "Berserk",
    image: "https://cdn.mangaworld.cx/mangas/5fb842b84c29e1099b62b0dd.jpg?1756877506028",
    type: "Manga",
    status: "In corso",
    views: "32905 volte",
    url: "/manga/2278/berserk",
  },
  {
    rank: 8,
    id: "1848",
    title: "Blue Lock",
    image: "https://cdn.mangaworld.cx/mangas/5fa4b8dda9cc8717e089349e.jpg?1756877505227",
    type: "Manga",
    status: "In corso",
    views: "31484 volte",
    url: "/manga/1848/blue-lock",
  },
]

export function MangaOfMonth() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star size={20} className="text-yellow-500" />
        <h2 className="text-lg font-semibold">Manga del mese</h2>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {monthlyRankingData.map((manga) => (
            <div key={manga.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {manga.rank}
              </div>

              <div className="flex-shrink-0">
                <img
                  src={manga.image || "/placeholder.svg"}
                  alt={manga.title}
                  className="w-12 h-16 object-cover rounded"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-1">
                  <Link href={`/manga/${obfuscateId(manga.id)}`} className="hover:text-primary transition-colors">
                    {manga.title}
                  </Link>
                </h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {manga.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {manga.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Letto: {manga.views}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
