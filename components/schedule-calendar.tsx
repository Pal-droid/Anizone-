"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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

export function ScheduleCalendar() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [dateRange, setDateRange] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const loadSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/schedule")
      const data = await response.json()
      if (data.ok) {
        setSchedule(data.schedule)
        setDateRange(data.dateRange || "")
      }
    } catch (error) {
      console.error("Error loading schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-16 bg-neutral-200 rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-neutral-200 rounded w-32"></div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-20 bg-neutral-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dateRange && (
        <Card>
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg font-bold">{dateRange}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {schedule.map((daySchedule) => (
        <Card key={daySchedule.dayName}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <CardTitle className="text-base uppercase font-bold">{daySchedule.dayName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {daySchedule.items.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>Nessun episodio programmato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {daySchedule.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {item.image && (
                      <div className="relative w-16 h-20 flex-shrink-0 rounded overflow-hidden">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mb-1">{item.episode}</p>
                      <p className="text-xs text-primary font-mono">Trasmesso alle {item.time}</p>
                    </div>

                    <Link href={item.href}>
                      <Button size="sm" variant="outline" className="flex-shrink-0 bg-transparent">
                        <Play size={14} className="mr-1" />
                        Guarda
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {schedule.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Clock size={48} className="mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">Nessun programma disponibile</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
