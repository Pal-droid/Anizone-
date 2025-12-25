"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Download,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  FileJson,
  ExternalLink,
  BookOpen,
} from "lucide-react"

interface ImportExportProps {
  animeCollection: any
  mangaCollection: any
  user: any
  onImportComplete: () => void
}

// Status mapping from external sources to AniList
const STATUS_MAP_TO_ANILIST: Record<string, string> = {
  "In corso": "CURRENT",
  Completati: "COMPLETED",
  "In pausa": "PAUSED",
  Droppati: "DROPPED",
  "Da guardare": "PLANNING",
  Watching: "CURRENT",
  Completed: "COMPLETED",
  "On Hold": "PAUSED",
  Dropped: "DROPPED",
  "Plan To Watch": "PLANNING",
}

interface AnimeWorldUser {
  id: number
  username: string
  pfp: string
}

interface ImportItem {
  title: string
  anilistId: number | null
  status: string
  progress: number
  score: number
  image: string
  importing: boolean
  imported: boolean
  skipped: boolean
  error: string | null
}

export function ListsImportExport({ animeCollection, mangaCollection, user, onImportComplete }: ImportExportProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importSource, setImportSource] = useState<"animeworld" | "anilist" | "animeunity">("animeworld")
  const [importType, setImportType] = useState<"anime" | "manga">("anime")

  const [awSearchQuery, setAwSearchQuery] = useState("")
  const [awSearchResults, setAwSearchResults] = useState<AnimeWorldUser[]>([])
  const [awSearching, setAwSearching] = useState(false)
  const [awSelectedUser, setAwSelectedUser] = useState<AnimeWorldUser | null>(null)
  const [awLoadingLists, setAwLoadingLists] = useState(false)

  const [auUsername, setAuUsername] = useState("")
  const [auLoading, setAuLoading] = useState(false)
  const [auRecords, setAuRecords] = useState<any[]>([])

  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [importItems, setImportItems] = useState<ImportItem[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  const getExistingAniListIds = (): Set<number> => {
    const ids = new Set<number>()
    if (animeCollection?.lists) {
      animeCollection.lists.forEach((list: any) => {
        list.entries.forEach((entry: any) => {
          ids.add(entry.media.id)
        })
      })
    }
    return ids
  }

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { id: user.id, name: user.name },
      anime: animeCollection,
      manga: mangaCollection,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `anilist-backup-${user.name}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExportDialogOpen(false)
  }

  const handleAwSearch = async () => {
    if (!awSearchQuery.trim()) return
    setAwSearching(true)
    try {
      const response = await fetch(`/api/import/animeworld-search?username=${encodeURIComponent(awSearchQuery)}`)
      const data = await response.json()
      if (data.results) setAwSearchResults(data.results)
    } catch (error) {
      console.error("Error searching AW:", error)
    } finally {
      setAwSearching(false)
    }
  }

  const handleLoadAwLists = async (awUser: AnimeWorldUser) => {
    setAwSelectedUser(awUser)
    setAwLoadingLists(true)
    try {
      const response = await fetch(`/api/import/animeworld-lists?userId=${awUser.id}`)
      const data = await response.json()
      const existingIds = getExistingAniListIds()
      const items: ImportItem[] = []

      Object.entries(data).forEach(([status, animeList]) => {
        if (Array.isArray(animeList)) {
          animeList.forEach((anime: any) => {
            let anilistId: number | null = null
            if (anime.anilist_link) {
              const match = anime.anilist_link.match(/anilist\.co\/anime\/(\d+)/)
              if (match) anilistId = Number.parseInt(match[1])
            }
            items.push({
              title: anime.jtitle || anime.title,
              anilistId,
              status: STATUS_MAP_TO_ANILIST[status] || "PLANNING",
              progress: anime.episodes || 0,
              score: anime.score || 0,
              image: anime.image,
              importing: false,
              imported: false,
              skipped: anilistId ? existingIds.has(anilistId) : false,
              error: anilistId ? null : "No AniList ID found",
            })
          })
        }
      })
      setImportItems(items)
    } catch (error) {
      console.error("Error loading AW lists:", error)
    } finally {
      setAwLoadingLists(false)
    }
  }

  const handleAuFetch = async () => {
    if (!auUsername.trim()) return
    setAuLoading(true)
    try {
      const response = await fetch(`/api/import/animeunity?username=${encodeURIComponent(auUsername)}`)
      const data = await response.json()
      if (data.records) {
        setAuRecords(data.records)
        const existingIds = getExistingAniListIds()
        const items: ImportItem[] = data.records.map((record: any) => {
          const anilistId = record.anilist_id || null
          return {
            title: record.title_eng || record.title,
            anilistId,
            status: STATUS_MAP_TO_ANILIST[record.pivot?.status] || "PLANNING",
            progress: record.pivot?.progress || 0,
            score: record.pivot?.score ? record.pivot.score * 10 : 0,
            image: record.imageurl,
            importing: false,
            imported: false,
            skipped: anilistId ? existingIds.has(anilistId) : false,
            error: anilistId ? null : "No AniList ID found",
          }
        })
        setImportItems(items)
      }
    } catch (error) {
      console.error("Error fetching AU list:", error)
    } finally {
      setAuLoading(false)
    }
  }

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setJsonFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        const existingIds = getExistingAniListIds()
        const items: ImportItem[] = []
        const collection = importType === "anime" ? data.anime : data.manga
        if (collection?.lists) {
          collection.lists.forEach((list: any) => {
            list.entries.forEach((entry: any) => {
              const anilistId = entry.media?.id || entry.mediaId
              items.push({
                title: entry.media?.title?.romaji || entry.title || "Unknown",
                anilistId,
                status: entry.status || list.status,
                progress: entry.progress || 0,
                score: entry.score || 0,
                image: entry.media?.coverImage?.large || entry.media?.coverImage?.medium || "",
                importing: false,
                imported: false,
                skipped: anilistId ? existingIds.has(anilistId) : false,
                error: anilistId ? null : "No AniList ID found",
              })
            })
          })
        }
        setImportItems(items)
      } catch (err) {
        alert("File JSON non valido")
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    setImporting(true)
    const toImport = importItems.filter((i) => !i.skipped && i.anilistId && !i.imported)
    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i]
      const itemIndex = importItems.findIndex((it) => it === item)
      setImportItems((prev) => prev.map((it, idx) => (idx === itemIndex ? { ...it, importing: true } : it)))
      try {
        const response = await fetch("/api/anilist/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
              SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) { id }
            }`,
            variables: { mediaId: item.anilistId, status: item.status, progress: item.progress, score: item.score }
          }),
        })
        const res = await response.json()
        if (res.errors) throw new Error(res.errors[0].message)
        setImportItems((prev) => prev.map((it, idx) => (idx === itemIndex ? { ...it, importing: false, imported: true } : it)))
      } catch (error: any) {
        setImportItems((prev) => prev.map((it, idx) => (idx === itemIndex ? { ...it, importing: false, error: error.message } : it)))
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100))
      if (i < toImport.length - 1) await new Promise((r) => setTimeout(r, 1000))
    }
    setImporting(false)
    onImportComplete()
  }

  const resetImportState = () => {
    setAwSearchQuery(""); setAwSearchResults([]); setAwSelectedUser(null);
    setAuUsername(""); setAuRecords([]); setJsonFile(null); setImportItems([]);
    setImportProgress(0)
  }

  const importableCount = importItems.filter(i => !i.skipped && i.anilistId && !i.imported && !i.error).length
  const importedCount = importItems.filter(i => i.imported).length
  const skippedCount = importItems.filter(i => i.skipped).length

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setExportDialogOpen(true)}>
          <Download className="h-4 w-4" /> Esporta
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => { resetImportState(); setImportDialogOpen(true); }}>
          <Upload className="h-4 w-4" /> Importa
        </Button>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esporta Liste</DialogTitle>
            <DialogDescription>Scarica un backup JSON delle tue liste</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="p-4 flex items-center gap-3">
              <FileJson className="h-8 w-8 text-primary" />
              <div><p className="font-medium">Backup Completo</p></div>
            </Card>
            <Button className="w-full" onClick={handleExport}>Scarica</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Importa Liste</DialogTitle></DialogHeader>
          <Tabs value={importType} onValueChange={(v) => setImportType(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="anime">Anime</TabsTrigger>
              <TabsTrigger value="manga">Manga</TabsTrigger>
            </TabsList>
            
            <TabsContent value="anime" className="flex-1 flex flex-col min-h-0">
              <Tabs value={importSource} onValueChange={(v) => { setImportSource(v as any); setImportItems([]); }} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="animeworld" className="gap-2">
                    <img src="https://static.animeworld.ac/assets/images/favicon-dark/android-icon-192x192.png?4" className="w-4 h-4 rounded" alt="AW" />
                    AW
                  </TabsTrigger>
                  <TabsTrigger value="anilist" className="gap-2"><FileJson className="h-4 w-4" /> JSON</TabsTrigger>
                  <TabsTrigger value="animeunity" className="gap-2">
                    <img src="https://www.animeunity.so/apple-touch-icon.png" className="w-4 h-4 rounded" alt="AU" />
                    AU
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="animeworld" className="flex-1 flex flex-col min-h-0">
                  {!awSelectedUser ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input className="flex-1 border p-2 rounded" placeholder="User AW..." value={awSearchQuery} onChange={e => setAwSearchQuery(e.target.value)} />
                        <Button onClick={handleAwSearch}>{awSearching ? <Loader2 className="animate-spin h-4 w-4" /> : "Cerca"}</Button>
                      </div>
                      {awSearchResults.map(u => (
                        <Card key={u.id} className="p-2 flex gap-3 items-center cursor-pointer" onClick={() => handleLoadAwLists(u)}>
                          <img src={u.pfp} className="w-8 h-8 rounded-full" alt="" /> {u.username}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />
                  )}
                </TabsContent>

                <TabsContent value="anilist" className="flex-1 flex flex-col min-h-0">
                  <input type="file" accept=".json" onChange={handleJsonFileChange} className="mb-4" />
                  {importItems.length > 0 && <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />}
                </TabsContent>

                <TabsContent value="animeunity" className="flex-1 flex flex-col min-h-0">
                  {auRecords.length === 0 ? (
                    <div className="flex gap-2">
                      <input className="flex-1 border p-2 rounded" placeholder="User AU..." value={auUsername} onChange={e => setAuUsername(e.target.value)} />
                      <Button onClick={handleAuFetch}>{auLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Carica"}</Button>
                    </div>
                  ) : (
                    <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="manga" className="text-center p-8"><BookOpen className="mx-auto h-8 w-8 mb-2" /> Coming Soon</TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ImportItemsList({ items, importing, importProgress, importableCount, importedCount, skippedCount, onImport }: any) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-2 mb-4">
        <Badge variant="secondary">Importati: {importedCount}</Badge>
        <Badge variant="secondary">Saltati: {skippedCount}</Badge>
        <Badge variant="secondary">Da fare: {importableCount}</Badge>
      </div>
      {importing && (
        <div className="w-full bg-muted h-2 rounded mb-4 overflow-hidden">
          <div className="bg-primary h-full transition-all" style={{ width: `${importProgress}%` }} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {items.map((item: any, i: number) => (
          <Card key={i} className={`p-2 flex items-center gap-3 ${item.skipped ? "opacity-50" : ""}`}>
            <img src={item.image || "/placeholder.svg"} className="w-8 h-12 object-cover rounded" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.status} • Ep. {item.progress}</p>
            </div>
            {item.importing ? <Loader2 className="h-4 w-4 animate-spin" /> : item.imported ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : item.error ? <XCircle className="h-4 w-4 text-red-500" /> : null}
          </Card>
        ))}
      </div>
      {importableCount > 0 && !importing && <Button onClick={onImport} className="w-full">Importa su AniList</Button>}
    </div>
  )
}
