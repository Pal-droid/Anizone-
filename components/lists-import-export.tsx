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
    setAwSearchResults([])
    setAwSelectedUser(null)
    try {
      const response = await fetch(`/api/import/animeworld-search?username=${encodeURIComponent(awSearchQuery)}`)
      const data = await response.json()
      if (data.results) setAwSearchResults(data.results)
    } catch (error) {
      console.error("Error AW search:", error)
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
      console.error("Error AU fetch:", error)
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
        const mutation = `mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) { id }
          }`
        const variables = { mediaId: item.anilistId, status: item.status, progress: item.progress, score: item.score > 0 ? item.score : undefined }
        const response = await fetch("/api/anilist/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables }),
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
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">Esporta</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => { resetImportState(); setImportDialogOpen(true); }}>
          <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importa</span>
        </Button>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esporta Liste</DialogTitle>
            <DialogDescription>Scarica un backup completo delle tue liste anime e manga</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileJson className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Backup JSON</p>
                  <p className="text-sm text-muted-foreground">Include anime e manga</p>
                </div>
              </div>
            </Card>
            <Button className="w-full gap-2" onClick={handleExport}><Download className="h-4 w-4" /> Scarica Backup</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Importa Liste</DialogTitle>
            <DialogDescription>Importa le tue liste da altri servizi su AniList</DialogDescription>
          </DialogHeader>

          <Tabs value={importType} onValueChange={(v) => setImportType(v as any)} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="anime">Anime</TabsTrigger>
              <TabsTrigger value="manga">Manga</TabsTrigger>
            </TabsList>

            <TabsContent value="anime" className="mt-0 flex-1 min-h-0 flex flex-col">
              <Tabs value={importSource} onValueChange={(v) => { setImportSource(v as any); setImportItems([]); }} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="animeworld" className="gap-2 text-xs sm:text-sm">
                    <img src="https://static.animeworld.ac/assets/images/favicon-dark/android-icon-192x192.png?4" className="w-4 h-4 rounded" alt="" />
                    <span className="hidden sm:inline">AnimeWorld</span><span className="sm:hidden">AW</span>
                  </TabsTrigger>
                  <TabsTrigger value="anilist" className="gap-2 text-xs sm:text-sm">
                    <FileJson className="h-4 w-4" /><span className="hidden sm:inline">AniList JSON</span><span className="sm:hidden">JSON</span>
                  </TabsTrigger>
                  <TabsTrigger value="animeunity" className="gap-2 text-xs sm:text-sm">
                    <img src="https://www.animeunity.so/apple-touch-icon.png" className="w-4 h-4 rounded" alt="" />
                    <span className="hidden sm:inline">AnimeUnity</span><span className="sm:hidden">AU</span>
                  </TabsTrigger>
                </TabsList>

                {/* AW Content */}
                <TabsContent value="animeworld" className="mt-0 flex-1 min-h-0 flex flex-col">
                  {!awSelectedUser ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input type="text" placeholder="Cerca utente AnimeWorld..." value={awSearchQuery} onChange={(e) => setAwSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAwSearch()} className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background" />
                        </div>
                        <Button onClick={handleAwSearch} disabled={awSearching}>{awSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}</Button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-auto">
                        {awSearchResults.map((u) => (
                          <Card key={u.id} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleLoadAwLists(u)}>
                            <img src={u.pfp || "/placeholder.svg"} className="rounded-full w-10 h-10" alt="" />
                            <span className="font-medium">{u.username}</span>
                            <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Card className="p-3 flex items-center gap-3 mb-4 flex-shrink-0">
                        <img src={awSelectedUser.pfp || "/placeholder.svg"} className="rounded-full w-10 h-10" alt="" />
                        <div><p className="font-medium">{awSelectedUser.username}</p><p className="text-sm text-muted-foreground">AnimeWorld</p></div>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAwSelectedUser(null)}>Cambia</Button>
                      </Card>
                      {awLoadingLists ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div> : <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />}
                    </div>
                  )}
                </TabsContent>

                {/* JSON Content */}
                <TabsContent value="anilist" className="mt-0 flex-1 min-h-0 flex flex-col">
                  <Card className="p-4 border-dashed mb-4 flex-shrink-0">
                    <label className="flex flex-col items-center gap-3 cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Upload className="h-6 w-6 text-primary" /></div>
                      <div className="text-center">
                        <p className="font-medium">{jsonFile ? jsonFile.name : "Seleziona file JSON"}</p>
                        <p className="text-sm text-muted-foreground">Carica il file esportato</p>
                      </div>
                      <input type="file" accept=".json" className="hidden" onChange={handleJsonFileChange} />
                    </label>
                  </Card>
                  {importItems.length > 0 && <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />}
                </TabsContent>

                {/* AU Content */}
                <TabsContent value="animeunity" className="mt-0 flex-1 min-h-0 flex flex-col">
                  {auRecords.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Inserisci username AnimeUnity</p>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Username AnimeUnity" value={auUsername} onChange={(e) => setAuUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuFetch()} className="flex-1 px-4 py-2 rounded-lg border bg-background" />
                        <Button onClick={handleAuFetch} disabled={auLoading}>{auLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carica"}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Card className="p-3 flex items-center gap-3 mb-4 flex-shrink-0">
                        <img src="https://www.animeunity.so/apple-touch-icon.png" className="w-10 h-10 rounded" alt="" />
                        <div><p className="font-medium">{auUsername}</p><p className="text-sm text-muted-foreground">AnimeUnity</p></div>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAuRecords([])}>Cambia</Button>
                      </Card>
                      <ImportItemsList items={importItems} importing={importing} importProgress={importProgress} importableCount={importableCount} importedCount={importedCount} skippedCount={skippedCount} onImport={handleImport} />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="manga" className="mt-0 flex-1 flex flex-col">
              <Card className="p-8 text-center space-y-4 border-dashed">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
                <div><h3 className="text-xl font-semibold">Prossimamente...</h3><p className="text-muted-foreground">L'importazione manga sarà disponibile a breve</p></div>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ImportItemsList({ items, importing, importProgress, importableCount, importedCount, skippedCount, onImport }: any) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Importati: {importedCount}</Badge>
        <Badge variant="secondary">Saltati: {skippedCount}</Badge>
        <Badge variant="secondary">Da fare: {importableCount}</Badge>
      </div>
      {importing && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs"><span>Importazione...</span><span>{importProgress}%</span></div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mb-4 pr-1">
        {items.map((item: any, idx: number) => (
          <Card key={idx} className={`p-2 flex items-center gap-3 ${item.skipped ? "opacity-50" : ""}`}>
            <img src={item.image || "/placeholder.svg"} className="w-8 h-12 rounded object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.status} • Ep. {item.progress} {item.score > 0 && `• ⭐ ${item.score}`}</p>
            </div>
            <div className="shrink-0">
              {item.importing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : item.imported ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : item.skipped ? <Badge variant="secondary" className="text-[10px]">Già presente</Badge> : item.error ? <XCircle className="h-4 w-4 text-red-500" title={item.error} /> : null}
            </div>
          </Card>
        ))}
      </div>
      {importableCount > 0 && !importing && <Button className="w-full gap-2" onClick={onImport}><Upload className="h-4 w-4" /> Importa {importableCount} anime su AniList</Button>}
    </div>
  )
}
