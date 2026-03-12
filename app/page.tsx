"use client"

import { useState, useEffect, useRef } from "react"
import { Home, List, Compass, Search, Menu, ChevronLeft, ChevronRight, Mic } from "lucide-react"
import Link from "next/link"
import { cn, obfuscateUrl } from "@/lib/utils"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { AnimatedLogo } from "@/components/animated-logo"
import { useIsDesktop } from "@/hooks/use-desktop"

type AnimeItem = {
  title: string
  href: string
  image: string
  isDub?: boolean
  dubLanguage?: string
  currentEpisode?: string
  totalEpisodes?: string
  season?: string
  timeAgo?: string
  sources?: Array<{ name: string; url: string; id: string }>
}

const GENRES = [
  { id: "all", label: "Tutti" },
  { id: "action", label: "Azione" },
  { id: "adventure", label: "Avventura" },
  { id: "comedy", label: "Commedia" },
  { id: "drama", label: "Drammatico" },
  { id: "fantasy", label: "Fantasy" },
  { id: "romance", label: "Romantico" },
  { id: "sci-fi", label: "Fantascienza" },
]

function TrendingAnimeCard({ item }: { item: AnimeItem }) {
  const animePath = (() => {
    try {
      const u = new URL(item.href, "https://dummy.local")
      return u.pathname
    } catch {
      return item.href
    }
  })()

  const handleClick = () => {
    try {
      const sources = item.sources || [
        { name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" },
      ]
      sessionStorage.setItem(`anizone:sources:${animePath}`, JSON.stringify(sources))
    } catch {}
  }

  return (
    <Link
      href={`/watch?p=${obfuscateUrl(animePath)}`}
      onClick={handleClick}
      className="group block"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-muted">
        <img
          src={item.image || "/placeholder.svg?height=450&width=300"}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Episode progress badge */}
        {item.currentEpisode && item.totalEpisodes && (
          <div className="absolute bottom-3 left-3 text-white font-bold text-sm">
            <span className="text-primary">{item.currentEpisode}</span>
            <span className="text-white/70">/{item.totalEpisodes}</span>
          </div>
        )}

        {/* Dub indicator */}
        {item.isDub && (
          <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center">
            <Mic size={16} className="text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Title and season */}
      <h3 className="mt-3 font-semibold text-sm text-foreground leading-tight line-clamp-2">
        {item.title}
      </h3>
      {item.season && (
        <p className="mt-1 text-xs text-muted-foreground">{item.season}</p>
      )}
    </Link>
  )
}

function RecentAnimeCard({ item }: { item: AnimeItem }) {
  const animePath = (() => {
    try {
      const u = new URL(item.href, "https://dummy.local")
      return u.pathname
    } catch {
      return item.href
    }
  })()

  const handleClick = () => {
    try {
      const sources = item.sources || [
        { name: "AnimeWorld", url: item.href, id: item.href.split("/").pop() || "" },
      ]
      sessionStorage.setItem(`anizone:sources:${animePath}`, JSON.stringify(sources))
    } catch {}
  }

  return (
    <Link
      href={`/watch?p=${obfuscateUrl(animePath)}`}
      onClick={handleClick}
      className="group flex-shrink-0 w-40"
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
        <img
          src={item.image || "/placeholder.svg?height=200&width=280"}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Episode + time badge */}
        {item.currentEpisode && (
          <div className="absolute bottom-2 right-2 text-right">
            <div className="text-white font-bold text-sm">
              <span className="text-primary">{item.currentEpisode}</span>
              {item.totalEpisodes && <span className="text-white/70">/{item.totalEpisodes}</span>}
            </div>
            {item.timeAgo && (
              <div className="text-[10px] text-white/60">{item.timeAgo}</div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-2xl bg-muted" />
      <div className="mt-3 h-4 w-3/4 bg-muted rounded" />
      <div className="mt-2 h-3 w-1/2 bg-muted rounded" />
    </div>
  )
}

function SkeletonRecentCard() {
  return (
    <div className="animate-pulse flex-shrink-0 w-40">
      <div className="aspect-[4/3] rounded-xl bg-muted" />
    </div>
  )
}

export default function HomePage() {
  const isDesktop = useIsDesktop()
  const [activeTab, setActiveTab] = useState<"anime" | "schedule" | "manga">("anime")
  const [activeGenre, setActiveGenre] = useState("all")
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([])
  const [recentAnime, setRecentAnime] = useState<AnimeItem[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  
  const recentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch trending anime (using ongoing-anime endpoint for now)
    const fetchTrending = async () => {
      try {
        const res = await fetch("/api/ongoing-anime")
        const data = await res.json()
        if (data.ok) {
          setTrendingAnime(
            data.items.map((item: any) => ({
              ...item,
              season: "Inverno 2026",
            }))
          )
        }
      } catch (e) {
        console.error("[v0] Error fetching trending:", e)
      } finally {
        setLoadingTrending(false)
      }
    }

    // Fetch recent episodes
    const fetchRecent = async () => {
      try {
        const res = await fetch("/api/latest-episodes")
        const data = await res.json()
        if (data.ok && data.episodes?.all) {
          setRecentAnime(
            data.episodes.all.slice(0, 10).map((item: any) => ({
              ...item,
              currentEpisode: item.episode,
              timeAgo: "di recente",
            }))
          )
        }
      } catch (e) {
        console.error("[v0] Error fetching recent:", e)
      } finally {
        setLoadingRecent(false)
      }
    }

    fetchTrending()
    fetchRecent()
  }, [])

  const scrollRecent = (direction: "left" | "right") => {
    if (recentScrollRef.current) {
      const scrollAmount = 200
      recentScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  // Desktop version (keeping similar to original but with revamped cards)
  if (isDesktop) {
    return (
      <main className="min-h-screen bg-background">
        {/* Desktop Header */}
        <header className="sticky top-0 z-[100] bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
            <div className="w-20" />
            <div className="animate-float">
              <AnimatedLogo />
            </div>
            <SlideOutMenu currentPath="/" />
          </div>
        </header>

        <section className="px-8 py-8 max-w-[1400px] mx-auto">
          {/* Top Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-muted/50 rounded-full p-1">
              {[
                { id: "anime", label: "Anime", href: "/" },
                { id: "schedule", label: "Calendario", href: "/calendar" },
                { id: "manga", label: "Manga", href: "/manga" },
              ].map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-sm font-medium transition-all",
                    tab.id === "anime"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Trending Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-6">Di Tendenza</h2>
            
            {/* Genre Chips */}
            <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2">
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setActiveGenre(genre.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    activeGenre === genre.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {genre.label}
                </button>
              ))}
            </div>

            {/* Anime Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {loadingTrending
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
                : trendingAnime.slice(0, 12).map((item, i) => (
                    <TrendingAnimeCard key={`${item.href}-${i}`} item={item} />
                  ))}
            </div>
          </section>

          {/* Recent Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-foreground">Usciti di Recente</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => scrollRecent("left")}
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => scrollRecent("right")}
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div
              ref={recentScrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
            >
              {loadingRecent
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRecentCard key={i} />)
                : recentAnime.map((item, i) => (
                    <RecentAnimeCard key={`${item.href}-${i}`} item={item} />
                  ))}
            </div>
          </section>
        </section>
      </main>
    )
  }

  // Mobile version - matches the screenshot design
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Top Tabs */}
      <div className="sticky top-0 z-50 bg-background pt-4 pb-2 px-4">
        <div className="flex justify-center">
          <div className="inline-flex bg-muted/50 rounded-full p-1">
            {[
              { id: "anime", label: "Anime", href: "/" },
              { id: "schedule", label: "Calendario", href: "/calendar" },
              { id: "manga", label: "Manga", href: "/manga" },
            ].map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all",
                  tab.id === "anime"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Trending Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Di Tendenza</h2>
          
          {/* Genre Chips */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setActiveGenre(genre.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeGenre === genre.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {genre.label}
              </button>
            ))}
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {loadingTrending
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : trendingAnime.slice(0, 6).map((item, i) => (
                  <TrendingAnimeCard key={`${item.href}-${i}`} item={item} />
                ))}
          </div>
        </section>

        {/* Recent Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Usciti di Recente</h2>
            <div className="flex gap-2">
              <button
                onClick={() => scrollRecent("left")}
                className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollRecent("right")}
                className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div
            ref={recentScrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
          >
            {loadingRecent
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRecentCard key={i} />)
              : recentAnime.map((item, i) => (
                  <RecentAnimeCard key={`${item.href}-${i}`} item={item} />
                ))}
          </div>
        </section>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border">
        <div className="flex items-center justify-around py-2 pb-safe">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-2 px-4 text-foreground"
          >
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/lists"
            className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <List size={22} />
            <span className="text-[10px] font-medium">Le mie Liste</span>
          </Link>

          <Link
            href="/search"
            className="flex flex-col items-center gap-1 py-2 px-4"
          >
            <div className="w-12 h-12 -mt-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Compass size={24} className="text-primary-foreground" />
            </div>
            <span className="text-[10px] font-medium text-primary">Scopri</span>
          </Link>

          <Link
            href="/search"
            className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search size={22} />
            <span className="text-[10px] font-medium">Cerca</span>
          </Link>

          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Slide Out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm">
            <SlideOutMenu currentPath="/" onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </main>
  )
}
