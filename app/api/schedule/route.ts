import { type NextRequest, NextResponse } from "next/server"
import { fetchScheduleForDate } from "@/lib/animeworld"

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

export async function GET(request: NextRequest) {
  try {
    let schedule: DaySchedule[] = []

    try {
      schedule = await fetchScheduleForDate()
    } catch (error) {
      console.error("Failed to fetch real schedule data:", error)
    }

    return NextResponse.json({
      ok: true,
      schedule,
      dateRange: "1 settembre - 8 settembre", // This would be parsed from the HTML
    })
  } catch (error) {
    console.error("Schedule API error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch schedule" }, { status: 500 })
  }
}
