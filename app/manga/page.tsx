import Link from "next/link"
import { Search, List, Film, BookOpen } from "lucide-react"
import { MangaHero } from "@/components/manga-hero"
import { LatestMangaChapters } from "@/components/latest-manga-chapters"
import { MangaGenres } from "@/components/manga-genres"

export default function MangaPage() {
  console.log("[v0] Manga homepage is loading")

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
          <nav className="text-sm flex items-center gap-4">
            <Link href="/lists" className="flex items-center gap-1 hover:text-primary transition-colors">
              <List size={16} />
              <span className="hidden sm:inline">Liste</span>
            </Link>
            <Link href="/search" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Search size={16} />
              <span className="hidden sm:inline">Cerca</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <MangaHero />

        <LatestMangaChapters />

        <MangaGenres />
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-20">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors">
            <Film size={20} />
            <span>Anime</span>
          </Link>
          <Link href="/manga" className="flex flex-col items-center gap-1 p-2 text-xs text-primary">
            <BookOpen size={20} />
            <span>Manga</span>
          </Link>
          <Link
            href="/search"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <Search size={20} />
            <span>Cerca</span>
          </Link>
          <Link
            href="/lists"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <List size={20} />
            <span>Liste</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
