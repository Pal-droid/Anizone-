"use client"

import Link from "next/link"
import { Search, List, BookOpen, Calendar, Sparkles, Bug } from "lucide-react"
import HeroSearch from "@/components/hero-search"
import { TopAnime } from "@/components/top-anime"
import { DiscoverSections } from "@/components/discover"
import { AnimeContentSections } from "@/components/anime-content-sections"
import { AnimatedLogo } from "@/components/animated-logo"
import { NewAdditions } from "@/components/new-additions"
import { OngoingAnime } from "@/components/ongoing-anime"
import UpcomingFall2025 from "@/components/upcoming-fall-2025"
import { LazySection } from "@/components/lazy-section"
import { useIsDesktop } from "@/hooks/use-desktop"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { useState } from "react"

export default function HomePage() {
  const isDesktop = useIsDesktop()
  const [showBugReport, setShowBugReport] = useState(false)

  if (isDesktop) {
    return (
      <main className="min-h-screen pb-20">
        <header className="sticky top-0 z-50 glass-strong border-b border-border/30">
          <div className="px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
            <div className="animate-float">
              <AnimatedLogo />
            </div>
            <nav className="flex items-center gap-8">
              <Link
                href="/lists"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
              >
                <List size={18} className="group-hover:scale-110 transition-transform" />
                <span>Le mie liste</span>
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
              >
                <Search size={18} className="group-hover:scale-110 transition-transform" />
                <span>Cerca anime</span>
              </Link>
              <Link
                href="/manga"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
              >
                <BookOpen size={18} className="group-hover:scale-110 transition-transform" />
                <span>Manga</span>
              </Link>
              <Link
                href="/schedule"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
              >
                <Calendar size={18} className="group-hover:scale-110 transition-transform" />
                <span>Calendario</span>
              </Link>
              <button
                onClick={() => setShowBugReport(true)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:glow group"
              >
                <Bug size={18} className="group-hover:scale-110 transition-transform" />
                <span>Segnala Bug</span>
              </button>
            </nav>
          </div>
        </header>

        <section className="px-8 py-12 max-w-[1400px] mx-auto">
          <div className="relative overflow-hidden rounded-3xl glass p-12 mb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent"></div>
            <div className="relative z-10 max-w-4xl">
              <div className="flex items-center gap-4 mb-6">
                <Sparkles className="text-accent animate-pulse" size={32} />
                <h1 className="text-5xl font-bold text-white font-[var(--font-playfair)]">Guarda anime in italiano</h1>
              </div>
              <div className="relative max-w-2xl">
                <HeroSearch />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-8">
              <LazySection className="glass rounded-xl p-8 transition-smooth hover:glow">
                <AnimeContentSections />
              </LazySection>

              <LazySection className="glass rounded-xl p-8 transition-smooth hover:glow">
                <TopAnime />
              </LazySection>
            </div>

            <div className="col-span-4 space-y-8">
              <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
                <NewAdditions />
              </LazySection>

              <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
                <OngoingAnime />
              </LazySection>

              <LazySection>
                <UpcomingFall2025 />
              </LazySection>

              <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
                <DiscoverSections />
              </LazySection>
            </div>
          </div>
        </section>
        <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
      </main>
    )
  }

  // Mobile layout
  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/" />

      <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
        <div className="px-6 py-4 flex items-center justify-center max-w-7xl mx-auto">
          <div className="animate-float">
            <AnimatedLogo />
          </div>
        </div>
      </header>

      <section className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl glass p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-accent animate-pulse" size={24} />
              <h1 className="text-3xl font-bold text-white font-[var(--font-playfair)]">Guarda anime in italiano</h1>
            </div>
            <div className="relative">
              <HeroSearch />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
            <AnimeContentSections />
          </LazySection>

          <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
            <NewAdditions />
          </LazySection>

          <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
            <OngoingAnime />
          </LazySection>

          <LazySection>
            <UpcomingFall2025 />
          </LazySection>

          <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
            <DiscoverSections />
          </LazySection>

          <LazySection className="glass rounded-xl p-6 transition-smooth hover:glow">
            <TopAnime />
          </LazySection>
        </div>
      </section>
    </main>
  )
}
