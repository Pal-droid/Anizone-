import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { obfuscateId } from "@/lib/utils"

interface LatestAddition {
  id: string
  title: string
  image: string
  type: string
  status: string
  date: string
  url: string
}

const latestAdditionsData: LatestAddition[] = [
  {
    id: "4251",
    title: "My Husband, My Sister, and I",
    image: "https://cdn.mangaworld.cx/mangas/68b71cae4ef314218e653725.jpg?1756891903068",
    type: "Manhwa",
    status: "In corso",
    date: "02 Settembre 2025",
    url: "/manga/4251/my-husband-my-sister-and-i",
  },
  {
    id: "4249",
    title: "Godeath - Megami no Ketsumyaku",
    image: "https://cdn.mangaworld.cx/mangas/68b5c63e2cbfb420fc97f759.jpg?1756891871299",
    type: "Manga",
    status: "Finito",
    date: "01 Settembre 2025",
    url: "/manga/4249/godeath-megami-no-ketsumyaku",
  },
  {
    id: "4247",
    title: "Masamune-kun no Re ○○○",
    image: "https://cdn.mangaworld.cx/mangas/68b59dc81f7420213483a4d3.jpg?1756891819819",
    type: "Manga",
    status: "In corso",
    date: "01 Settembre 2025",
    url: "/manga/4247/masamune-kun-no-re",
  },
  {
    id: "4246",
    title: "Red Cage",
    image: "https://cdn.mangaworld.cx/mangas/68b59ceb69ee4420ebc92f73.jpg?1756891788083",
    type: "Manhwa",
    status: "In corso",
    date: "01 Settembre 2025",
    url: "/manga/4246/red-cage",
  },
  {
    id: "4245",
    title: "The Blue Eye of Horus: The Story of a Queen Dressed as a Man",
    image: "https://cdn.mangaworld.cx/mangas/68b4836fbc23c521c42b7e2e.jpg?1756891898128",
    type: "Manga",
    status: "Finito",
    date: "31 Agosto 2025",
    url: "/manga/4245/the-blue-eye-of-horus-the-story-of-a-queen-dressed-as-a-man",
  },
]

export function LatestMangaAdditions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus size={20} className="text-green-500" />
        <h2 className="text-lg font-semibold">Ultime aggiunte</h2>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {latestAdditionsData.map((manga) => (
            <Link key={manga.id} href={`/manga/${obfuscateId(manga.id)}`} className="block">
              <div className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                  <img
                    src={manga.image || "/placeholder.svg"}
                    alt={manga.title}
                    className="w-16 h-20 object-cover rounded"
                    loading="lazy"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 hover:text-primary transition-colors">
                    {manga.title}
                  </h3>

                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="font-semibold">Tipo: </span>
                      <Badge variant="secondary" className="text-xs">
                        {manga.type}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Stato: </span>
                      <Badge variant="outline" className="text-xs">
                        {manga.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold">Data: </span>
                      <span className="text-muted-foreground">{manga.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
