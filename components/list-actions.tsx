"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Check, ListPlus } from "lucide-react"
import { EpisodeProgressDialog } from "./episode-progress-dialog"

type Props = {
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
}

type ListKey = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

const LISTS: { key: ListKey; label: string }[] = [
  { key: "planning", label: "Da guardare" },
  { key: "current", label: "In corso" },
  { key: "completed", label: "Completati" },
  { key: "paused", label: "In pausa" },
  { key: "dropped", label: "Abbandonati" },
  { key: "repeating", label: "In revisione" },
]

function normalizeSeriesKey(path: string): string {
  try {
    const url = new URL(path, "https://dummy.local")
    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) {
      return `/${parts[0]}/${parts[1]}`
    }
    return url.pathname
  } catch {
    const parts = path.split("/").filter(Boolean)
    if (parts.length >= 2) {
      return `/${parts[0]}/${parts[1]}`
    }
    return path.startsWith("/") ? path : `/${path}`
  }
}

export function ListActions({ seriesKey, seriesPath, title, image }: Props) {
  const [done, setDone] = useState<ListKey | null>(null)
  const [currentLists, setCurrentLists] = useState<Set<ListKey>>(new Set())
  const [showEpisodeDialog, setShowEpisodeDialog] = useState(false)

  const normalizedSeriesKey = normalizeSeriesKey(seriesKey)
  const normalizedSeriesPath = normalizeSeriesKey(seriesPath)

  useEffect(() => {
    async function checkListStatus() {
      try {
        const response = await fetch("/api/user-state")
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.lists) {
            const listsContainingAnime = new Set<ListKey>()
            for (const [listKey, listItems] of Object.entries(data.data.lists)) {
              if (listItems && typeof listItems === "object" && normalizedSeriesKey in listItems) {
                listsContainingAnime.add(listKey as ListKey)
              }
            }
            setCurrentLists(listsContainingAnime)
          }
        }
      } catch (error) {
        console.error("Failed to check list status:", error)
      }
    }

    if (normalizedSeriesKey) {
      checkListStatus()
    }
  }, [normalizedSeriesKey])

  async function add(list: ListKey) {
    if (list === "current") {
      setShowEpisodeDialog(true)
      return
    }

    setDone(null)
    await fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "list-add",
        list,
        seriesKey: normalizedSeriesKey,
        seriesPath: normalizedSeriesPath,
        title,
        image,
      }),
    })
    setCurrentLists((prev) => new Set([...prev, list]))
    setDone(list)
    setTimeout(() => setDone(null), 1500)
  }

  async function addWithEpisode(episodeNum: number) {
    setDone(null)

    // Add to current list
    await fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "list-add",
        list: "current",
        seriesKey: normalizedSeriesKey,
        seriesPath: normalizedSeriesPath,
        title,
        image,
      }),
    })

    // Add to continue watching with episode progress
    await fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "continue",
        seriesKey: normalizedSeriesKey,
        seriesPath: normalizedSeriesPath,
        title,
        episode: { num: episodeNum, href: normalizedSeriesPath },
        position_seconds: 0,
      }),
    })

    setCurrentLists((prev) => new Set([...prev, "current"]))
    setDone("current")
    setTimeout(() => setDone(null), 1500)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ListPlus className="h-4 w-4 mr-2" />
            Aggiungi a lista
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Liste</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LISTS.map((l) => (
            <DropdownMenuItem key={l.key} onClick={() => add(l.key)}>
              {done === l.key || currentLists.has(l.key) ? <Check className="h-4 w-4 mr-2" /> : null}
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <EpisodeProgressDialog
        isOpen={showEpisodeDialog}
        onClose={() => setShowEpisodeDialog(false)}
        onConfirm={addWithEpisode}
        seriesPath={normalizedSeriesPath}
        seriesTitle={title}
      />
    </>
  )
}
