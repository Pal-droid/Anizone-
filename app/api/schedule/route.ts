import { type NextRequest, NextResponse } from "next/server"
import { fetchScheduleForDate, extractScheduleDateRange } from "@/lib/animeworld"

type ScheduleItem = {
  id: string
  time: string
  title: string
  episode: string
  href: string
  image?: string
}

type DaySchedule = {
  date: string
  dayName: string
  items: ScheduleItem[]
}

async function fetchScheduleHtml(): Promise<string> {
  const res = await fetch("https://animeworld.ac/schedule", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 3600 },
  })
  return res.text()
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Schedule API called")
    let schedule: DaySchedule[] = []
    let dateRange = ""

    try {
      console.log("[v0] Fetching schedule data...")

      const html = await fetchScheduleHtml()
      dateRange = extractScheduleDateRange(html)
      console.log("[v0] Scraped date range:", dateRange)

      schedule = await fetchScheduleForDate()
      console.log("[v0] Schedule fetched, items:", schedule.length)

      if (!dateRange) {
        // Fallback to current week
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

        const formatDate = (date: Date) => {
          const months = [
            "gennaio",
            "febbraio",
            "marzo",
            "aprile",
            "maggio",
            "giugno",
            "luglio",
            "agosto",
            "settembre",
            "ottobre",
            "novembre",
            "dicembre",
          ]
          return `${date.getDate()} ${months[date.getMonth()]}`
        }

        dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
      }
    } catch (error) {
      console.error("[v0] Failed to fetch real schedule data:", error)
      // Keep empty schedule and default date range
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const formatDate = (date: Date) => {
        const months = [
          "gennaio",
          "febbraio",
          "marzo",
          "aprile",
          "maggio",
          "giugno",
          "luglio",
          "agosto",
          "settembre",
          "ottobre",
          "novembre",
          "dicembre",
        ]
        return `${date.getDate()} ${months[date.getMonth()]}`
      }

      dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
    }

    console.log("[v0] Returning schedule response with", schedule.length, "days")
    return NextResponse.json({
      ok: true,
      schedule,
      dateRange,
    })
  } catch (error) {
    console.error("[v0] Schedule API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch schedule" }, { status: 500 })
  }
}
