"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Check, Pause, X, RotateCcw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
  className?: string
}

type ListKey = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

const LIST_ACTIONS = [
  {
    key: "planning" as ListKey,
    icon: Plus,
    label: "Da guardare",
    color: "text-blue-500",
    bg: "bg-blue-500",
  },
  {
    key: "current" as ListKey,
    icon: Play,
    label: "In corso",
    color: "text-green-500",
    bg: "bg-green-500",
  },
  {
    key: "completed" as ListKey,
    icon: Check,
    label: "Completato",
    color: "text-emerald-500",
    bg: "bg-emerald-500",
  },
  {
    key: "paused" as ListKey,
    icon: Pause,
    label: "In pausa",
    color: "text-yellow-500",
    bg: "bg-yellow-500",
  },
  {
    key: "dropped" as ListKey,
    icon: X,
    label: "Abbandonato",
    color: "text-red-500",
    bg: "bg-red-500",
  },
  {
    key: "repeating" as ListKey,
    icon: RotateCcw,
    label: "In revisione",
    color: "text-purple-500",
    bg: "bg-purple-500",
  },
]

function normalizeSeriesKey(path: string): string {
  try {
    const url = new URL(path, "https://dummy.local")
    return url.pathname
  } catch {
    return path.startsWith("/") ? path : `/${path}`
  }
}

export function QuickListActions({ seriesKey, seriesPath, title, image, className }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [currentList, setCurrentList] = useState<ListKey | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // ✅ determine type + key
  let type: "manga" | "anime"
  let keyToUse: string

  if (pathname.startsWith("/manga/")) {
    type = "manga"
    keyToUse = normalizeSeriesKey(seriesKey)
  } else if (pathname.startsWith("/watch")) {
    type = "anime"
    const queryPath = searchParams.get("path")
    keyToUse = queryPath ? normalizeSeriesKey(decodeURIComponent(queryPath)) : normalizeSeriesKey(seriesKey)
  } else {
    type = "anime" // fallback
    keyToUse = normalizeSeriesKey(seriesKey)
  }

  const normalizedSeriesKey = keyToUse
  const normalizedSeriesPath = normalizeSeriesKey(seriesPath)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    async function checkListStatus() {
      try {
        const response = await fetch("/api/user-state")
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.lists) {
            for (const [listKey, listItems] of Object.entries(data.data.lists)) {
              if (
                listItems &&
                typeof listItems === "object" &&
                listItems[type] &&
                normalizedSeriesKey in listItems[type]
              ) {
                setCurrentList(listKey as ListKey)
                break
              }
            }
          }
        }
      } catch (error) {
        console.error("[QuickListActions] Failed to check list status:", error)
      }
    }

    if (normalizedSeriesKey && isHydrated) {
      checkListStatus()
    }
  }, [normalizedSeriesKey, isHydrated, type])

  async function toggleList(listKey: ListKey) {
    if (isLoading) return
    setIsLoading(true)

    try {
      if (currentList === listKey) {
        const response = await fetch("/api/user-state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "list-remove",
            list: listKey,
            seriesKey: normalizedSeriesKey,
            type,
          }),
        })

        if (response.ok) setCurrentList(null)
      } else {
        if (currentList) {
          await fetch("/api/user-state", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op: "list-remove",
              list: currentList,
              seriesKey: normalizedSeriesKey,
              type,
            }),
          })
        }

        const response = await fetch("/api/user-state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "list-add",
            list: listKey,
            seriesKey: normalizedSeriesKey,
            seriesPath: normalizedSeriesPath,
            title,
            image,
            type,
          }),
        })

        if (response.ok) setCurrentList(listKey)
      }
    } catch (error) {
      console.error("[QuickListActions] Error toggling list:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isHydrated) {
    return (
      <div className={cn("flex gap-2", className)}>
        {LIST_ACTIONS.slice(0, 3).map((action) => {
          const Icon = action.icon
          return (
            <Button key={action.key} variant="ghost" size="sm" disabled className="h-9 w-9 rounded-lg p-0 opacity-50">
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 backdrop-blur-sm", className)}>
      {LIST_ACTIONS.map((action) => {
        const Icon = action.icon
        const isActive = currentList === action.key

        return (
          <Button
            key={action.key}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleList(action.key)
            }}
            disabled={isLoading}
            className={cn(
              "h-9 w-9 rounded-lg p-0 transition-all duration-200 hover:scale-105",
              !isActive && ["hover:bg-background/80 hover:shadow-sm", action.color],
              isActive && [action.bg, "text-white shadow-md hover:shadow-lg"],
              isLoading && "opacity-50 cursor-not-allowed",
            )}
            title={action.label}
          >
            <Icon className={cn("h-4 w-4 transition-all", isActive && "fill-white scale-110")} />
          </Button>
        )
      })}
    </div>
  )
}
