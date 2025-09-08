"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AuthPanel } from "@/components/auth-panel"
import { Film, BookOpen, Book, Search, List, Calendar } from "lucide-react"

type ListName = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"
type ContentType = "anime" | "manga" | "light-novel"

type ListItem = {
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
  addedAt: number
  contentType?: ContentType
}

type UserState = {
  lists: Record<ListName, Record<string, ListItem>>
}

const metaCache = new Map<string, { title: string; image?: string; ts: number }>()
const TTL = 1000 * 60 * 30 // 30 minutes

async function getMeta(path: string) {
  const key = basePath(path)
  const cached = metaCache.get(key)
  const now = Date.now()
  if (cached && now - cached.ts < TTL) return cached
  try {
    const r = await fetch(`/api/anime-meta?path=${encodeURIComponent(key)}`)
    const j = await r.json()
    if (j.ok) {
      const entry = { title: j.meta?.title || key, image: j.meta?.image, ts: now }
      metaCache.set(key, entry)
      try {
        localStorage.setItem(`anizone:meta:${key}`, JSON.stringify(entry))
      } catch {}
      return entry
    }
  } catch {}
  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(`anizone:meta:${key}`)
    if (raw) {
      const entry = JSON.parse(raw)
      metaCache.set(key, entry)
      return entry
    }
  } catch {}
  return { title: key, image: undefined, ts: now }
}

function basePath(p: string) {
  try {
    const u = new URL(p, "https://dummy.local")
    const parts = u.pathname.split("/").filter(Boolean)
    return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : u.pathname
  } catch {
    const parts = p.split("/").filter(Boolean)
    return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : p
  }
}

const ORDER: { key: ListName; title: string }[] = [
  { key: "planning", title: "Da guardare" },
  { key: "current", title: "In corso" },
  { key: "completed", title: "Completati" },
  { key: "paused", title: "In pausa" },
  { key: "dropped", title: "Abbandonati" },
  { key: "repeating", title: "In revisione" },
]

const CONTENT_TYPES: { key: ContentType; title: string; icon: any }[] = [
  { key: "anime", title: "Anime", icon: Film },
  { key: "manga", title: "Manga", icon: BookOpen },
  { key: "light-novel", title: "Romanzi", icon: Book },
]

export default function ListsPage() {
  const [state, setState] = useState<UserState | null>(null)
  const [activeContentType, setActiveContentType] = useState<ContentType>("anime")

  async function load() {
    const r = await fetch("/api/user-state", { cache: "no-store" })
    const j = await r.json()
    if (j.ok) {
      const userData = j.data as UserState

      const enrichedLists: Record<ListName, Record<string, ListItem>> = {}

      for (const [listName, listItems] of Object.entries(userData.lists || {})) {
        enrichedLists[listName as ListName] = {}

        for (const [key, item] of Object.entries(listItems || {})) {
          const contentType = item.contentType || getContentType(item.seriesPath)

          if (contentType === "anime") {
            // Fetch metadata for anime items
            try {
              const meta = await getMeta(item.seriesPath || item.seriesKey)
              enrichedLists[listName as ListName][key] = {
                ...item,
                title: meta.title || item.title,
                image: meta.image || item.image,
              }
            } catch {
              enrichedLists[listName as ListName][key] = item
            }
          } else {
            enrichedLists[listName as ListName][key] = item
          }
        }
      }

      setState({ ...userData, lists: enrichedLists })
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(list: ListName, seriesKey: string) {
    await fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "list-remove", list, seriesKey }),
    })
    load()
  }

  const getContentType = (seriesPath: string): ContentType => {
    if (seriesPath.includes("/manga/") || seriesPath.includes("manga")) {
      return "manga"
    }
    if (seriesPath.includes("/light-novel/") || seriesPath.includes("romanzi") || seriesPath.includes("novel")) {
      return "light-novel"
    }
    return "anime"
  }

  const getUniqueItems = (items: ListItem[]): ListItem[] => {
    const seen = new Set<string>()
    const uniqueItems: ListItem[] = []

    // Sort by addedAt to keep the most recent entry
    const sortedItems = [...items].sort((a, b) => b.addedAt - a.addedAt)

    for (const item of sortedItems) {
      // Create a normalized key for comparison
      const normalizedKey = item.seriesKey.replace(/^\/+/, "").toLowerCase()
      const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, "")
      const uniqueKey = `${normalizedKey}-${titleKey}`

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey)
        uniqueItems.push(item)
      }
    }

    return uniqueItems
  }

  const renderList = (name: ListName, contentType: ContentType) => {
    const allItems = state ? Object.values(state.lists[name] || {}) : []
    // Filter items by content type and remove duplicates
    const filteredItems = allItems.filter((item) => {
      const itemContentType = item.contentType || getContentType(item.seriesPath)
      return itemContentType === contentType
    })

    const uniqueItems = getUniqueItems(filteredItems)

    if (uniqueItems.length === 0) return <div className="text-sm text-muted-foreground">Nessun elemento.</div>

    return (
      <div className="grid grid-cols-1 gap-3">
        {uniqueItems.map((it) => {
          const getWatchUrl = (seriesPath: string) => {
            // For manga, redirect to manga detail page
            if (seriesPath.includes("/manga/")) {
              const mangaId = seriesPath.split("/manga/")[1] || seriesPath.split("/").pop()
              return `/manga/${mangaId}`
            }

            // For anime, ensure proper path format for watch page
            try {
              const url = new URL(seriesPath, "https://dummy.local")
              let path = url.pathname

              // Ensure path starts with /play/ for anime
              if (!path.startsWith("/play/") && !path.includes("/manga/")) {
                const parts = path.split("/").filter(Boolean)
                if (parts.length >= 1) {
                  path = `/play/${parts[parts.length - 1]}`
                }
              }

              return `/watch?path=${encodeURIComponent(path)}`
            } catch {
              // Handle relative paths
              let path = seriesPath
              if (!path.startsWith("/play/") && !path.includes("/manga/")) {
                const parts = path.split("/").filter(Boolean)
                if (parts.length >= 1) {
                  path = `/play/${parts[parts.length - 1]}`
                }
              }
              return `/watch?path=${encodeURIComponent(path)}`
            }
          }

          return (
            <div
              key={`${name}-${it.seriesKey}-${it.addedAt}`}
              className="glass-card rounded-xl p-4 flex items-center gap-4 hover:glow transition-all duration-300"
            >
              <div className="shrink-0">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted">
                  {it.image ? (
                    <img src={it.image || "/placeholder.svg"} alt={it.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Film size={20} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{it.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {contentType === "anime" ? "Anime" : contentType === "manga" ? "Manga" : "Romanzo"}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <Link href={getWatchUrl(it.seriesPath)}>
                  <Button size="sm" className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                    Apri
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove(name, it.seriesKey)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Rimuovi
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">Le mie liste</h1>
        </div>
      </header>
      <section className="px-4 py-4 space-y-6">
        <AuthPanel />

        <Tabs
          value={activeContentType}
          onValueChange={(value) => setActiveContentType(value as ContentType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="hidden sm:inline">{type.title}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {CONTENT_TYPES.map((type) => (
            <TabsContent key={type.key} value={type.key} className="space-y-6">
              {ORDER.map((sec) => (
                <Card key={sec.key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(sec.key, type.key)}</CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-20">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors">
            <Film size={20} />
            <span>Anime</span>
          </Link>
          <Link
            href="/manga"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <BookOpen size={20} />
            <span>Manga</span>
          </Link>
          <Link
            href="/search"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <Search size={20} />
            <span>Cerca</span>
          </Link>
          <Link href="/lists" className="flex flex-col items-center gap-1 p-2 text-xs text-primary">
            <List size={20} />
            <span>Liste</span>
          </Link>
          <Link
            href="/schedule"
            className="flex flex-col items-center gap-1 p-2 text-xs hover:text-primary transition-colors"
          >
            <Calendar size={20} />
            <span>Calendario</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
