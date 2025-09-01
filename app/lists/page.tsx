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
    if (j.ok) setState(j.data as UserState)
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

  const renderList = (name: ListName, contentType: ContentType) => {
    const allItems = state ? Object.values(state.lists[name] || {}) : []
    // Filter items by content type based on series path or explicit contentType
    const items = allItems.filter((item) => {
      const itemContentType = item.contentType || getContentType(item.seriesPath)
      return itemContentType === contentType
    })

    if (items.length === 0) return <div className="text-sm text-muted-foreground">Nessun elemento.</div>

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={`${name}-${it.seriesKey}`} className="border rounded p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium line-clamp-2">{it.title}</div>
              <div className="text-xs text-muted-foreground">{it.seriesPath}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={it.seriesPath.startsWith("/watch") ? it.seriesPath : it.seriesPath}>
                <Button size="sm">Apri</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => remove(name, it.seriesKey)}>
                Rimuovi
              </Button>
            </div>
          </div>
        ))}
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
