"use client"
import { Sparkles } from "lucide-react"
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

  // ---------- DESKTOP VERSION ----------
  if (isDesktop) {
    return (
      <main className="min-h-screen pb-20">
        <header className="sticky top-0 z-[100] bg-background border-b border-border shadow-sm">
          {/* Relative container allows the logo to center itself based on the whole bar */}
          <div className="px-8 py-4 flex items-center justify-end max-w-[1400px] mx-auto relative h-20">
            
            {/* LOGO: Absolutely centered within the header */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="animate-float">
                <AnimatedLogo />
              </div>
            </div>

            {/* MENU: Placed in the normal flow on the right */}
            <div className="relative z-10">
              <SlideOutMenu currentPath="/" />
            </div>
          </div>
        </header>

        <section className="px-8 py-8 max-w-[1400px] mx-auto">
          {/* ---------- HERO SECTION ---------- */}
          <div className="relative overflow-hidden rounded-3xl bg-card p-10 mb-10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />

            <div className="relative z-10 w-full max-w-[900px] mx-auto text-center">
              <div className="flex items-center gap-3 mb-5 justify-center">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="text-primary" size={22} />
                </div>
                <h1 className="text-4xl font-bold text-foreground">Guarda anime in italiano</h1>
              </div>

              <div className="relative w-full max-w-[900px] mx-auto">
                <HeroSearch />
              </div>
            </div>
          </div>

          {/* ---------- MAIN CONTENT ---------- */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-6">
              <LazySection className="surface-elevated p-6">
                <AnimeContentSections />
              </LazySection>

              <LazySection className="surface-elevated p-6">
                <TopAnime />
              </LazySection>
            </div>

            <div className="col-span-4 space-y-6">
              <LazySection className="surface-elevated p-5">
                <NewAdditions />
              </LazySection>

              <LazySection className="surface-elevated p-5">
                <OngoingAnime />
              </LazySection>

              <LazySection>
                <UpcomingFall2025 />
              </LazySection>

              <LazySection className="surface-elevated p-5">
                <DiscoverSections />
              </LazySection>
            </div>
          </div>
        </section>

        <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
      </main>
    )
  }

  // ---------- MOBILE VERSION ----------
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-[100] bg-background border-b border-border shadow-sm">
        <div className="px-6 py-4 flex items-center justify-end relative h-16">
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-float">
              <AnimatedLogo />
            </div>
          </div>

          <SlideOutMenu currentPath="/" />
        </div>
      </header>

      <section className="px-4 py-6 space-y-5">
        <div className="relative overflow-hidden rounded-3xl bg-card p-6 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="text-primary" size={18} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Guarda anime in italiano</h1>
            </div>

            <HeroSearch />
          </div>
        </div>

        <LazySection className="surface-elevated p-5">
          <AnimeContentSections />
        </LazySection>
        <LazySection className="surface-elevated p-5">
          <NewAdditions />
        </LazySection>
        <LazySection className="surface-elevated p-5">
          <OngoingAnime />
        </LazySection>
        <LazySection>
          <UpcomingFall2025 />
        </LazySection>
        <LazySection className="surface-elevated p-5">
          <DiscoverSections />
        </LazySection>
        <LazySection className="surface-elevated p-5">
          <TopAnime />
        </LazySection>
      </section>
    </main>
  )
}
