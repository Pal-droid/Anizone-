import Link from "next/link"
import { Search, List, Film, BookOpen } from "lucide-react"
import HeroSearch from "@/components/hero-search"
import { TopAnime } from "@/components/top-anime"
import { ContinueWatching } from "@/components/continue-watching"
import { DiscoverSections } from "@/components/discover"
import { AnimeContentSections } from "@/components/anime-content-sections"

export default function HomePage() {
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
        <div className="rounded-lg bg-neutral-950 text-white p-5">
          <h1 className="text-xl font-bold">Guarda anime in italiano</h1>
          <p className="text-xs text-neutral-300 mt-1">Trova episodi sub/dub ITA e riproducili direttamente.</p>
          <div className="mt-3">
            <HeroSearch />
          </div>
        </div>

        <ContinueWatching />
        <AnimeContentSections />
        <DiscoverSections />
        <TopAnime />
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-20">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors">
            <Film size={20} />
            <span>Anime</span>
          </Link>
          <Link
            href="/manga"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
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
