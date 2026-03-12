"use client"

import { useState, useRef } from "react"
import { Home, List, Compass, Search, Menu } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { AnimatedLogo } from "@/components/animated-logo"
import { useIsDesktop } from "@/hooks/use-desktop"
import { AnimeContentSections } from "@/components/anime-content-sections"
import { NewAdditions } from "@/components/new-additions"
import { OngoingAnime } from "@/components/ongoing-anime"

export default function HomePage() {
  const isDesktop = useIsDesktop()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<{ open: () => void; close: () => void }>(null)

  // Desktop version - original layout with slight styling refresh
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
          {/* Top Pill Tabs */}
          <div className="flex justify-center mb-8">
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

          {/* Original content sections with updated styling */}
          <div className="space-y-6">
            <OngoingAnime />
            <AnimeContentSections />
            <NewAdditions />
          </div>
        </section>
      </main>
    )
  }

  // Mobile version - screenshot-inspired layout with original content
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Top Pill Tabs - sticky */}
      <div className="sticky top-0 z-50 bg-background pt-4 pb-3 px-4">
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

      {/* Main Content */}
      <div className="px-4 pt-4 space-y-6">
        <OngoingAnime />
        <AnimeContentSections />
        <NewAdditions />
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
