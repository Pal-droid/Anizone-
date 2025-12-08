import Link from "next/link"
import { ScheduleCalendar } from "@/components/schedule-calendar"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Calendar } from "lucide-react"

export default function SchedulePage() {
  return (
    <main className="min-h-screen bg-background">
      <SlideOutMenu currentPath="/schedule" />

      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight hover:opacity-80 transition-opacity">
            Anizone
          </Link>
        </div>
      </header>

      <section className="px-4 pt-12 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-balance">Calendario Anime</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl text-pretty leading-relaxed">
            Scopri quando escono i nuovi episodi dei tuoi anime preferiti. Programmazione settimanale aggiornata.
          </p>
        </div>
      </section>

      <section className="px-4 pb-12">
        <div className="max-w-5xl mx-auto">
          <ScheduleCalendar />
        </div>
      </section>
    </main>
  )
}
