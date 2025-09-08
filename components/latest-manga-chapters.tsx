import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { obfuscateId } from "@/lib/utils"

interface MangaChapter {
  id: string
  title: string
  image: string
  type: string
  status: string
  chapters: {
    title: string
    url: string
    isNew?: boolean
    date?: string
  }[]
}

const latestMangaData: MangaChapter[] = [
  {
    id: "2237",
    title: "Baby Steps",
    image: "https://cdn.mangaworld.cx/volumes/68a47884d5b1a421154b703e.png?1755609318469",
    type: "Manga",
    status: "In corso",
    chapters: [
      { title: "Vol. 41 - Capitolo 387", url: "#", isNew: true },
      { title: "Vol. 41 - Capitolo 386", url: "#", date: "19 Agosto" },
      { title: "Vol. 40 - Capitolo 385", url: "#", date: "19 Marzo" },
    ],
  },
  {
    id: "4033",
    title: "Ordeal",
    image: "https://cdn.mangaworld.cx/mangas/67febeee39a7a8508e3a7044.png?1756209876850",
    type: "Manhwa",
    status: "In corso",
    chapters: [
      { title: "Capitolo 50", url: "#", isNew: true },
      { title: "Capitolo 49", url: "#", isNew: true },
      { title: "Capitolo 48", url: "#", date: "13 Agosto" },
    ],
  },
  {
    id: "1972",
    title: "Martial Peak",
    image: "https://cdn.mangaworld.cx/mangas/5fa8afef25d77b716a36c9be.png?1756209893177",
    type: "Manhua",
    status: "In corso",
    chapters: [
      { title: "Capitolo 1770", url: "#", isNew: true },
      { title: "Capitolo 1769", url: "#", isNew: true },
      { title: "Capitolo 1768", url: "#", isNew: true },
    ],
  },
  {
    id: "2682",
    title: "SubZero",
    image: "https://cdn.mangaworld.cx/mangas/623b47879b0e4263cd18da7a.jpg?1756209886806",
    type: "Manhwa",
    status: "In corso",
    chapters: [
      { title: "Capitolo 176", url: "#", isNew: true },
      { title: "Capitolo 175", url: "#", date: "12 Agosto" },
      { title: "Capitolo 174", url: "#", date: "05 Agosto" },
    ],
  },
  {
    id: "3995",
    title: "Melt Bless You",
    image: "https://cdn.mangaworld.cx/mangas/67c6fc7ad309492689ae160a.jpg?1756209278008",
    type: "Manhwa",
    status: "In corso",
    chapters: [
      { title: "Capitolo 13", url: "#", isNew: true },
      { title: "Capitolo 12", url: "#", date: "12 Agosto" },
      { title: "Capitolo 11", url: "#", date: "29 Luglio" },
    ],
  },
  {
    id: "3475",
    title: "Holiday Love - Fuufukan Renai",
    image: "https://cdn.mangaworld.cx/volumes/68239b9ddec93350a6bd2232.jpg?1747164105489",
    type: "Manga",
    status: "In corso",
    chapters: [
      { title: "Vol. 07 - Capitolo 91", url: "#", isNew: true },
      { title: "Vol. 07 - Capitolo 90", url: "#", date: "12 Agosto" },
      { title: "Vol. 07 - Capitolo 89", url: "#", date: "29 Luglio" },
    ],
  },
]

export function LatestMangaChapters() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ultimi Capitoli Aggiunti</h2>
      </div>

      <div className="grid gap-4">
        {latestMangaData.map((manga) => (
          <Card key={manga.id} className="p-4 h-full">
            <div className="flex gap-3 h-full">
              <div className="flex-shrink-0">
                <img
                  src={manga.image || "/placeholder.svg"}
                  alt={manga.title}
                  className="w-16 h-20 object-cover rounded flex-shrink-0"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-shrink-0">
                    <Link href={`/manga/${obfuscateId(manga.id)}`} className="hover:text-primary">
                      {manga.title}
                    </Link>
                  </h3>
                </div>

                <div className="flex gap-2 mb-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {manga.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {manga.status}
                  </Badge>
                </div>

                <div className="space-y-1 flex-1">
                  {manga.chapters.map((chapter, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <Link href={chapter.url} className="text-primary hover:underline flex items-center gap-1">
                        {chapter.title}
                        {chapter.isNew && <span className="bg-red-500 text-white px-1 rounded text-[10px]">NUOVO</span>}
                      </Link>
                      {chapter.date && <span className="text-muted-foreground">{chapter.date}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
