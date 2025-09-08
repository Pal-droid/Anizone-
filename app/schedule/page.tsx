import Link from "next/link"
import { Search, List, Film, BookOpen, Calendar, ArrowLeft } from "lucide-react"
import { ScheduleCalendar } from "@/components/schedule-calendar"

export default function SchedulePage() {
  return (
    <main className="min-h-screen pb-16">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
          <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      <section className="px-4 py-4 space-y-6">
        <div className="rounded-lg bg-neutral-950 text-white p-5">
          <h1 className="text-xl font-bold">Calendario Anime</h1>
          <p className="text-xs text-neutral-300 mt-1">
            Scopri quando escono i nuovi episodi dei tuoi anime preferiti.
          </p>
        </div>

        <ScheduleCalendar />
      </section>

      {/* Bottom navigation */}
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
          <Link href="/schedule" className="flex flex-col items-center gap-1 p-2 text-xs text-primary">
            <Calendar size={20} />
            <span>Calendario</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
