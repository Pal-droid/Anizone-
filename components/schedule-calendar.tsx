"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Play, Clock, CalendarIcon, ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

  const handleAnimeClick = async (item: ScheduleItem, e: React.MouseEvent) => {
    e.preventDefault()

    try {
      // Fetch anime metadata first
      const metaResponse = await fetch(
        `/api/anime-meta?path=${encodeURIComponent(item.href)}`
      )
      const metaData = await metaResponse.json()

      if (metaData.ok && metaData.source) {
        // Extract the full anime ID, including suffix like `.IbmP5`
        const animeId = item.href.split("/").pop() || ""

        // Fetch episodes using the full ID
        const episodesResponse = await fetch(`/api/episodes?AW=${animeId}`)
        const episodesData = await episodesResponse.json()

        // Prepare sources for watch page
        const sources = [
          {
            name: "AnimeWorld",
            url: metaData.source,
            id: animeId,
            episodes: episodesData.episodes || [],
          },
        ]

        // Store sources in sessionStorage
        sessionStorage.setItem(
          `anizone:sources:${item.href}`,
          JSON.stringify(sources)
        )
      }
    } catch (error) {
      console.error(
        "[v1] Failed to fetch metadata or episodes for calendar anime:",
        error
      )
    }

    // Obfuscate path for watch page
    const obfuscatedPath = btoa(item.href).replace(/[+/=]/g, (m) => ({
      "+": "-",
      "/": "_",
      "=": "",
    }[m] || m))
    window.location.href = `/watch?p=${obfuscatedPath}`
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Date range skeleton */}
        <div className="flex items-center justify-center gap-2 py-3">
          <div className="h-5 w-48 bg-muted/50 rounded-lg skeleton"></div>
        </div>

        {/* Day cards skeleton */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-muted/50 rounded-xl skeleton"></div>
              <div className="h-7 w-32 bg-muted/50 rounded-lg skeleton"></div>
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-32 bg-muted/50 rounded-2xl skeleton"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {dateRange && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-3">
          <CalendarIcon className="w-4 h-4" />
          <span className="text-sm font-medium tracking-wide uppercase">{dateRange}</span>
        </div>
      )}

      <div className="space-y-10">
        {schedule.map((daySchedule) => (
          <div key={daySchedule.dayName} className="space-y-4">
            {/* Day header */}
            <div className="flex items-center gap-3 sticky top-[57px] bg-background/95 backdrop-blur-md py-3 z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{daySchedule.dayName}</h2>
                <p className="text-xs text-muted-foreground">{daySchedule.date}</p>
              </div>
            </div>

            {/* Episodes grid */}
            {daySchedule.items.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">Nessun episodio programmato</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Controlla più tardi per gli aggiornamenti</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {daySchedule.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => handleAnimeClick(item, e)}
                    className="group surface cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">{item.episode}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="font-mono text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.time}
                          </Badge>

                          <Button
                            size="sm"
                            className="rounded-full group-hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnimeClick(item, e)
                            }}
                          >
                            <Play className="w-3.5 h-3.5 mr-1" />
                            Guarda
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {schedule.length === 0 && !loading && (
        <div className="text-center py-24 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold mb-2">Nessun programma disponibile</h3>
          <p className="text-muted-foreground">Il calendario è attualmente vuoto. Riprova più tardi.</p>
        </div>
      )}
    </div>
  )
}
