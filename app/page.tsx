import Link from "next/link"
import { Search, List, Film, BookOpen, Calendar, Sparkles } from "lucide-react"
import HeroSearch from "@/components/hero-search"
import { TopAnime } from "@/components/top-anime"
import { ContinueWatching } from "@/components/continue-watching"
import { DiscoverSections } from "@/components/discover"
import { AnimeContentSections } from "@/components/anime-content-sections"
import { AnimatedLogo } from "@/components/animated-logo"
import { NewAdditions } from "@/components/new-additions"

export default function HomePage() {
  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass-strong border-b border-border/30">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="animate-float">
            <AnimatedLogo />
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/lists"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
            >
              <List size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Liste</span>
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
            >
              <Search size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Cerca</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl glass p-8 glow-strong animate-pulse-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-accent animate-pulse" size={24} />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent font-[var(--font-playfair)]">
                Guarda anime in italiano
              </h1>
            </div>
            <p className="text-muted-foreground mb-6 text-lg font-[var(--font-source-sans)]">
              Trova episodi sub/dub ITA e riproducili direttamente nella migliore qualità.
            </p>
            <div className="relative">
              <HeroSearch />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass rounded-xl p-6 transition-smooth hover:glow">
            <ContinueWatching />
          </div>

          <div className="glass rounded-xl p-6 transition-smooth hover:glow">
            <AnimeContentSections />
          </div>

          <div className="glass rounded-xl p-6 transition-smooth hover:glow">
            <NewAdditions />
          </div>

          <div className="glass rounded-xl p-6 transition-smooth hover:glow">
            <DiscoverSections />
          </div>

          <div className="glass rounded-xl p-6 transition-smooth hover:glow">
            <TopAnime />
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/30">
        <div className="flex items-center justify-around py-3 px-4 max-w-md mx-auto">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 p-3 text-xs text-primary transition-smooth hover:glow group"
          >
            <Film size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Anime</span>
          </Link>
          <Link
            href="/manga"
            className="flex flex-col items-center gap-1 p-3 text-xs text-muted-foreground hover:text-primary transition-smooth hover:glow group"
          >
            <BookOpen size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Manga</span>
          </Link>
          <Link
            href="/search"
            className="flex flex-col items-center gap-1 p-3 text-xs text-muted-foreground hover:text-primary transition-smooth hover:glow group"
          >
            <Search size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Cerca</span>
          </Link>
          <Link
            href="/lists"
            className="flex flex-col items-center gap-1 p-3 text-xs text-muted-foreground hover:text-primary transition-smooth hover:glow group"
          >
            <List size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Liste</span>
          </Link>
          <Link
            href="/schedule"
            className="flex flex-col items-center gap-1 p-3 text-xs text-muted-foreground hover:text-primary transition-smooth hover:glow group"
          >
            <Calendar size={22} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Calendario</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
