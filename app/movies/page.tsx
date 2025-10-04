"use client"

import type React from "react"

import { useState } from "react"
import { Search, Film, Tv } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MovieCard } from "@/components/movie-card"
import { AnimatedLogo } from "@/components/animated-logo"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { useIsDesktop } from "@/hooks/use-desktop"
import Link from "next/link"

export default function MoviesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"movie" | "series">("movie")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const isDesktop = useIsDesktop()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/movies-search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`)
      const data = await response.json()

      if (data.ok) {
        setResults(data.results)
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isDesktop) {
    return (
      <main className="min-h-screen">
        <SlideOutMenu currentPath="/movies" />

        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="px-6 py-4 flex items-center justify-center max-w-7xl mx-auto">
            <Link href="/">
              <AnimatedLogo />
            </Link>
          </div>
        </header>

        <section className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6">
            <h1 className="text-3xl font-bold mb-6 font-[var(--font-playfair)] flex items-center gap-3">
              <Film className="text-accent" />
              Film e Serie TV
            </h1>

            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "movie" | "series")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="movie">Film</TabsTrigger>
                <TabsTrigger value="series">Serie TV</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder={searchType === "movie" ? "Cerca film..." : "Cerca serie TV..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Search size={18} />
              </Button>
            </form>
          </div>

          {loading && (
            <div className="glass rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Ricerca in corso...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {results.map((item, idx) => (
                <MovieCard key={idx} item={item} />
              ))}
            </div>
          )}

          {!loading && results.length === 0 && searchQuery && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-muted-foreground">Nessun risultato trovato</p>
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass-strong border-b border-border/30">
        <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <Link href="/">
            <AnimatedLogo />
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Anime
            </Link>
            <Link
              href="/manga"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
            >
              Manga
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-8 py-12 max-w-[1400px] mx-auto">
        <div className="glass rounded-3xl p-12 mb-12">
          <h1 className="text-5xl font-bold mb-8 font-[var(--font-playfair)] flex items-center gap-4">
            <Film className="text-accent" size={48} />
            Film e Serie TV
          </h1>

          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "movie" | "series")} className="mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="movie" className="flex items-center gap-2">
                <Film size={18} />
                Film
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2">
                <Tv size={18} />
                Serie TV
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl">
            <Input
              type="text"
              placeholder={searchType === "movie" ? "Cerca film..." : "Cerca serie TV..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 text-lg"
            />
            <Button type="submit" disabled={loading} size="lg" className="px-8">
              <Search size={20} className="mr-2" />
              Cerca
            </Button>
          </form>
        </div>

        {loading && (
          <div className="glass rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="mt-6 text-lg text-muted-foreground">Ricerca in corso...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((item, idx) => (
              <MovieCard key={idx} item={item} />
            ))}
          </div>
        )}

        {!loading && results.length === 0 && searchQuery && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-lg text-muted-foreground">Nessun risultato trovato per "{searchQuery}"</p>
          </div>
        )}
      </section>
    </main>
  )
}
