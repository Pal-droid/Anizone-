"use client"

import { useState } from "react"
import { AnimeEpisodePlayer } from "@/components/anime-episode-player"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const exampleAnime = {
  title: "Attack on Titan",
  description:
    "L'umanità vive all'interno di enormi mura per proteggersi dai Titani, creature gigantesche che divorano gli esseri umani. Quando un Titane Colossale rompe la muraglia esterna, inizia una battaglia per la sopravvivenza.",
  genre: ["Azione", "Drama", "Fantasy", "Shounen"],
  year: 2013,
  status: "Completato",
}

const exampleEpisodes = [
  {
    id: "ep1",
    number: 1,
    title: "A te, tra 2000 anni",
    m3u8Url: "https://example-animesaturn.com/aot/ep1/playlist.m3u8",
    duration: "24:30",
  },
  {
    id: "ep2",
    number: 2,
    title: "Quel giorno",
    m3u8Url: "https://example-animesaturn.com/aot/ep2/playlist.m3u8",
    duration: "24:15",
  },
  {
    id: "ep3",
    number: 3,
    title: "Una fioca luce nell'oscurità della disperazione",
    m3u8Url: "https://example-animesaturn.com/aot/ep3/playlist.m3u8",
    duration: "24:45",
  },
  {
    id: "ep4",
    number: 4,
    title: "La notte della cerimonia di chiusura",
    m3u8Url: "https://example-animesaturn.com/aot/ep4/playlist.m3u8",
    duration: "24:20",
  },
]

export default function AnimePage({ params }: { params: { id: string } }) {
  const [currentEpisode, setCurrentEpisode] = useState(exampleEpisodes[0])

  const handleEpisodeChange = (episode: (typeof exampleEpisodes)[0]) => {
    setCurrentEpisode(episode)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="glass bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground">Anime / {exampleAnime.title}</div>
        </div>

        <AnimeEpisodePlayer
          anime={exampleAnime}
          episode={currentEpisode}
          episodes={exampleEpisodes}
          onEpisodeChange={handleEpisodeChange}
        />
      </div>
    </main>
  )
}
