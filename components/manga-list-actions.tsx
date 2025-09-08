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
import { ChapterProgressDialog } from "./chapter-progress-dialog"

type Props = {
  mangaId: string
  mangaUrl: string
  title: string
  image?: string
  volumes: Array<{
    name: string
    chapters: Array<{
      title: string
      url: string
      date: string
    }>
  }>
}

type ListKey = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

const LISTS: { key: ListKey; label: string }[] = [
  { key: "planning", label: "Da leggere" },
  { key: "current", label: "In corso" },
  { key: "completed", label: "Completati" },
  { key: "paused", label: "In pausa" },
  { key: "dropped", label: "Abbandonati" },
  { key: "repeating", label: "In rilettura" },
]

export function MangaListActions({ mangaId, mangaUrl, title, image, volumes }: Props) {
  const [done, setDone] = useState<ListKey | null>(null)
  const [currentLists, setCurrentLists] = useState<Set<ListKey>>(new Set())
  const [showChapterDialog, setShowChapterDialog] = useState(false)

  const seriesKey = `/manga/${mangaId}`
  const seriesPath = mangaUrl || seriesKey

  console.log("[v0] MangaListActions initialized with:", { seriesKey, seriesPath, title })

  useEffect(() => {
    async function checkListStatus() {
      try {
        console.log("[v0] Checking list status for manga:", seriesKey)
        const response = await fetch("/api/user-state")
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.lists) {
            const listsContainingManga = new Set<ListKey>()
            for (const [listKey, listItems] of Object.entries(data.data.lists)) {
              if (listItems && typeof listItems === "object" && seriesKey in listItems) {
                listsContainingManga.add(listKey as ListKey)
              }
            }
            setCurrentLists(listsContainingManga)
            console.log("[v0] Found manga in lists:", Array.from(listsContainingManga))
          }
        }
      } catch (error) {
        console.error("[v0] Failed to check list status:", error)
      }
    }

    if (seriesKey) {
      checkListStatus()
    }
  }, [seriesKey])

  async function add(list: ListKey) {
    console.log("[v0] Adding manga to list:", list, { seriesKey, title })

    if (list === "current") {
      setShowChapterDialog(true)
      return
    }

    setDone(null)
    try {
      const response = await fetch("/api/user-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "list-add",
          list,
          seriesKey,
          seriesPath,
          title,
          image,
        }),
      })

      if (response.ok) {
        setCurrentLists((prev) => new Set([...prev, list]))
        setDone(list)
        setTimeout(() => setDone(null), 1500)
        console.log("[v0] Successfully added manga to list:", list)
      } else {
        console.error("[v0] Failed to add manga to list:", await response.text())
      }
    } catch (error) {
      console.error("[v0] Error adding manga to list:", error)
    }
  }

  async function addWithChapter(chapterTitle: string, chapterUrl: string) {
    console.log("[v0] Adding manga to current list with chapter:", { chapterTitle, chapterUrl })
    setDone(null)

    try {
      // Add to current list
      const listResponse = await fetch("/api/user-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "list-add",
          list: "current",
          seriesKey,
          seriesPath,
          title,
          image,
        }),
      })

      // Add to continue reading with chapter progress
      const continueResponse = await fetch("/api/user-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "continue",
          seriesKey,
          seriesPath,
          title,
          episode: { num: 1, href: chapterUrl || seriesPath },
          position_seconds: 0,
        }),
      })

      if (listResponse.ok && continueResponse.ok) {
        setCurrentLists((prev) => new Set([...prev, "current"]))
        setDone("current")
        setTimeout(() => setDone(null), 1500)
        console.log("[v0] Successfully added manga to current list with chapter")
      } else {
        console.error("[v0] Failed to add manga with chapter:", {
          listOk: listResponse.ok,
          continueOk: continueResponse.ok,
        })
      }
    } catch (error) {
      console.error("[v0] Error adding manga with chapter:", error)
    }
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

      <ChapterProgressDialog
        isOpen={showChapterDialog}
        onClose={() => setShowChapterDialog(false)}
        onConfirm={addWithChapter}
        mangaId={mangaId}
        mangaTitle={title}
        volumes={volumes}
      />
    </>
  )
}
