"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Play, Check, Pause, X, RotateCcw, BookOpen } from "lucide-react"
import { aniListManager } from "@/lib/anilist"
import { useAniList } from "@/contexts/anilist-context"

// Configuration for anime lists - mapped to AniList statuses
const ANIME_LIST_CONFIG = {
  PLANNING: { label: "Da guardare", icon: Plus, color: "bg-blue-500 hover:bg-blue-600" },
  CURRENT: { label: "In corso", icon: Play, color: "bg-green-500 hover:bg-green-600" },
  COMPLETED: { label: "Completati", icon: Check, color: "bg-purple-500 hover:bg-purple-600" },
  PAUSED: { label: "In pausa", icon: Pause, color: "bg-yellow-500 hover:bg-yellow-600" },
  DROPPED: { label: "Abbandonati", icon: X, color: "bg-red-500 hover:bg-red-600" },
  REPEATING: { label: "In revisione", icon: RotateCcw, color: "bg-indigo-500 hover:bg-indigo-600" },
}

// Configuration for manga lists - mapped to AniList statuses
const MANGA_LIST_CONFIG = {
  PLANNING: { label: "Da leggere", icon: Plus, color: "bg-blue-500 hover:bg-blue-600" },
  CURRENT: { label: "In corso", icon: Play, color: "bg-green-500 hover:bg-green-600" },
  COMPLETED: { label: "Completati", icon: Check, color: "bg-purple-500 hover:bg-purple-600" },
  PAUSED: { label: "In pausa", icon: Pause, color: "bg-yellow-500 hover:bg-yellow-600" },
  DROPPED: { label: "Abbandonati", icon: X, color: "bg-red-500 hover:bg-red-600" },
  REPEATING: { label: "In revisione", icon: RotateCcw, color: "bg-indigo-500 hover:bg-indigo-600" },
}

interface QuickListManagerProps {
  itemId: string
  itemTitle: string
  itemImage?: string
  anilistMediaId?: number // AniList media ID if available
}

export function QuickListManager({ itemId, itemTitle, itemImage, anilistMediaId }: QuickListManagerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAniList()

  // Auto-detect type
  let type: "anime" | "manga"
  if (pathname.startsWith("/manga/")) {
    type = "manga"
  } else {
    type = "anime"
  }

  const LIST_CONFIG = type === "anime" ? ANIME_LIST_CONFIG : MANGA_LIST_CONFIG

  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showProgressInput, setShowProgressInput] = useState(false)
  const [progressValue, setProgressValue] = useState("")
  const [mediaId, setMediaId] = useState<number | null>(anilistMediaId || null)

  // Search for AniList media ID if not provided
  useEffect(() => {
    if (!mediaId && user) {
      searchAniListMedia()
    }
  }, [user, itemTitle])

  const searchAniListMedia = async () => {
    try {
      const query = `
        query ($search: String, $type: MediaType) {
          Media(search: $search, type: $type) {
            id
          }
        }
      `

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: {
            search: itemTitle,
            type: type === "anime" ? "ANIME" : "MANGA",
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data?.Media?.id) {
          setMediaId(data.data.Media.id)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to search AniList media:", error)
    }
  }

  const updateStatus = async (targetStatus: string) => {
    if (!user || !mediaId) return

    if (targetStatus === "CURRENT" && currentStatus !== "CURRENT") {
      setShowProgressInput(true)
      return
    }

    await performStatusUpdate(targetStatus)
  }

  const performStatusUpdate = async (targetStatus: string, progress?: number) => {
    setLoading(true)
    try {
      const success =
        type === "anime"
          ? await aniListManager.updateAnimeEntry(mediaId!, targetStatus, progress)
          : await aniListManager.updateMangaEntry(mediaId!, targetStatus, progress)

      if (success) {
        setCurrentStatus(targetStatus === currentStatus ? null : targetStatus)
      }
    } catch (error) {
      console.error("[v0] Failed to update status:", error)
    } finally {
      setLoading(false)
      setShowProgressInput(false)
      setProgressValue("")
    }
  }

  const handleProgressSubmit = () => {
    const progress = progressValue.trim() ? Number.parseInt(progressValue.trim()) : 1
    performStatusUpdate("CURRENT", progress)
  }

  const handleProgressCancel = () => {
    setShowProgressInput(false)
    setProgressValue("")
  }

  // Render: Login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = "/")}
          className="flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <BookOpen className="h-4 w-4" />
          <span>Accedi con AniList per aggiungere alle liste</span>
        </Button>
      </div>
    )
  }

  // Render: Search for media ID
  if (!mediaId) {
    return (
      <div className="flex justify-center">
        <div className="text-sm text-muted-foreground">Ricerca su AniList...</div>
      </div>
    )
  }

  // Render: Loading state
  if (loading && !showProgressInput) {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  // Render: Progress input
  if (showProgressInput) {
    return (
      <div className="flex flex-col gap-2 p-3 border rounded-lg bg-background">
        <p className="text-sm font-medium">{type === "anime" ? "Episodio attuale:" : "Capitolo attuale:"}</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={type === "anime" ? "Es. 5" : "Es. 15"}
            value={progressValue}
            onChange={(e) => setProgressValue(e.target.value)}
            className="w-20"
            min="1"
          />
          <Button size="sm" onClick={handleProgressSubmit} className="bg-green-500 hover:bg-green-600">
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={handleProgressCancel}>
            Annulla
          </Button>
        </div>
      </div>
    )
  }

  // Render: List management buttons
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(LIST_CONFIG).map(([statusKey, config]) => {
        const Icon = config.icon
        const isActive = currentStatus === statusKey

        return (
          <Button
            key={statusKey}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => updateStatus(statusKey)}
            className={`gap-2 ${isActive ? config.color : ""}`}
            disabled={loading}
          >
            <Icon className="h-4 w-4" />
            {isActive && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                ✓
              </Badge>
            )}
            <span className="hidden sm:inline">{config.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
