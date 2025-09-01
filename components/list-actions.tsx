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

export function ListActions({ seriesKey, seriesPath, title, image }: Props) {
  const [done, setDone] = useState<ListKey | null>(null)
  const [currentLists, setCurrentLists] = useState<Set<ListKey>>(new Set())

  useEffect(() => {
    async function checkListStatus() {
      try {
        const response = await fetch("/api/user-state")
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.data?.lists) {
            const listsContainingAnime = new Set<ListKey>()
            for (const [listKey, listItems] of Object.entries(data.data.lists)) {
              if (listItems && typeof listItems === "object" && seriesKey in listItems) {
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

    if (seriesKey) {
      checkListStatus()
    }
  }, [seriesKey])

  async function add(list: ListKey) {
    setDone(null)
    await fetch("/api/user-state", {
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
    setCurrentLists((prev) => new Set([...prev, list]))
    setDone(list)
    setTimeout(() => setDone(null), 1500)
  }

  return (
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
  )
}
