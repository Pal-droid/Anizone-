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
import Image from "next/image"

interface ImportExportProps {
  animeCollection: any
  mangaCollection: any
  user: any
  onImportComplete: () => void
}

// Status mapping from external sources to AniList
const STATUS_MAP_TO_ANILIST: Record<string, string> = {
  // AnimeWorld Italian
  "In corso": "CURRENT",
  Completati: "COMPLETED",
  "In pausa": "PAUSED",
  Droppati: "DROPPED",
  "Da guardare": "PLANNING",
  // AnimeUnity English
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

  // AnimeWorld state
  const [awSearchQuery, setAwSearchQuery] = useState("")
  const [awSearchResults, setAwSearchResults] = useState<AnimeWorldUser[]>([])
  const [awSearching, setAwSearching] = useState(false)
  const [awSelectedUser, setAwSelectedUser] = useState<AnimeWorldUser | null>(null)
  const [awLists, setAwLists] = useState<Record<string, any[]> | null>(null)
  const [awLoadingLists, setAwLoadingLists] = useState(false)

  // AnimeUnity state
  const [auUsername, setAuUsername] = useState("")
  const [auLoading, setAuLoading] = useState(false)
  const [auRecords, setAuRecords] = useState<any[]>([])

  // AniList JSON import state
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [jsonData, setJsonData] = useState<any>(null)

  // Import progress state
  const [importItems, setImportItems] = useState<ImportItem[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  // Get existing AniList IDs to skip duplicates
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

  // Export functionality
  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
      },
      anime: animeCollection,
      manga: mangaCollection,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
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

  // AnimeWorld search
  const handleAwSearch = async () => {
    if (!awSearchQuery.trim()) return

    setAwSearching(true)
    setAwSearchResults([])
    setAwSelectedUser(null)
    setAwLists(null)

    try {
      const response = await fetch(`/api/import/animeworld-search?username=${encodeURIComponent(awSearchQuery)}`)
      const data = await response.json()

      if (data.results) {
        setAwSearchResults(data.results)
      }
    } catch (error) {
      console.error("Error searching AnimeWorld users:", error)
    } finally {
      setAwSearching(false)
    }
  }

  // Load AnimeWorld user's lists
  const handleLoadAwLists = async (awUser: AnimeWorldUser) => {
    setAwSelectedUser(awUser)
    setAwLoadingLists(true)

    try {
      const response = await fetch(`/api/import/animeworld-lists?userId=${awUser.id}`)
      const data = await response.json()
      setAwLists(data)

      // Convert to import items
      const existingIds = getExistingAniListIds()
      const items: ImportItem[] = []

      Object.entries(data).forEach(([status, animeList]) => {
        if (Array.isArray(animeList)) {
          animeList.forEach((anime: any) => {
            // Extract AniList ID from URL
            let anilistId: number | null = null
            if (anime.anilist_link) {
              const match = anime.anilist_link.match(/anilist\.co\/anime\/(\d+)/)
              if (match) {
                anilistId = Number.parseInt(match[1])
              }
            }

            const isExisting = anilistId ? existingIds.has(anilistId) : false

            items.push({
              title: anime.jtitle || anime.title,
              anilistId,
              status: STATUS_MAP_TO_ANILIST[status] || "PLANNING",
              progress: anime.episodes || 0,
              score: anime.score || 0,
              image: anime.image,
              importing: false,
              imported: false,
              skipped: isExisting,
              error: anilistId ? null : "No AniList ID found",
            })
          })
        }
      })

      setImportItems(items)
    } catch (error) {
      console.error("Error loading AnimeWorld lists:", error)
    } finally {
      setAwLoadingLists(false)
    }
  }

  // AnimeUnity fetch
  const handleAuFetch = async () => {
    if (!auUsername.trim()) return

    setAuLoading(true)
    setAuRecords([])

    try {
      const response = await fetch(`/api/import/animeunity?username=${encodeURIComponent(auUsername)}`)
      const data = await response.json()

      if (data.records) {
        setAuRecords(data.records)

        // Convert to import items
        const existingIds = getExistingAniListIds()
        const items: ImportItem[] = data.records.map((record: any) => {
          const anilistId = record.anilist_id || null
          const isExisting = anilistId ? existingIds.has(anilistId) : false

          return {
            title: record.title_eng || record.title,
            anilistId,
            status: STATUS_MAP_TO_ANILIST[record.pivot?.status] || "PLANNING",
            progress: record.pivot?.progress || 0,
            score: record.pivot?.score ? record.pivot.score * 10 : 0, // Convert to AniList scale
            image: record.imageurl,
            importing: false,
            imported: false,
            skipped: isExisting,
            error: anilistId ? null : "No AniList ID found",
          }
        })

        setImportItems(items)
      }
    } catch (error) {
      console.error("Error fetching AnimeUnity list:", error)
    } finally {
      setAuLoading(false)
    }
  }

  // JSON file handling
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setJsonFile(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        setJsonData(data)

        // Convert to import items
        const existingIds = getExistingAniListIds()
        const items: ImportItem[] = []

        const collection = importType === "anime" ? data.anime : data.manga
        if (collection?.lists) {
          collection.lists.forEach((list: any) => {
            list.entries.forEach((entry: any) => {
              const anilistId = entry.media?.id || entry.mediaId
              const isExisting = anilistId ? existingIds.has(anilistId) : false

              items.push({
                title: entry.media?.title?.romaji || entry.title || "Unknown",
                anilistId,
                status: entry.status || list.status,
                progress: entry.progress || 0,
                score: entry.score || 0,
                image: entry.media?.coverImage?.large || entry.media?.coverImage?.medium || "",
                importing: false,
                imported: false,
                skipped: isExisting,
                error: anilistId ? null : "No AniList ID found",
              })
            })
          })
        }

        setImportItems(items)
      } catch (error) {
        console.error("Error parsing JSON file:", error)
        alert("File JSON non valido")
      }
    }
    reader.readAsText(file)
  }

  // Import to AniList
  const handleImport = async () => {
    setImporting(true)
    setImportProgress(0)

    const toImport = importItems.filter((item) => !item.skipped && item.anilistId && !item.imported)
    const total = toImport.length

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i]
      const itemIndex = importItems.findIndex((it) => it === item)

      // Update item status to importing
      setImportItems((prev) => prev.map((it, idx) => (idx === itemIndex ? { ...it, importing: true } : it)))

      try {
        const mutation = `
          mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
              id
              status
              progress
              score
            }
          }
        `

        const variables: any = {
          mediaId: item.anilistId,
          status: item.status,
        }

        if (item.progress > 0) variables.progress = item.progress
        if (item.score > 0) variables.score = item.score

        const response = await fetch("/api/anilist/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables }),
        })

        const data = await response.json()

        if (data.errors) {
          throw new Error(data.errors[0]?.message || "GraphQL error")
        }

        // Update item status to imported
        setImportItems((prev) =>
          prev.map((it, idx) => (idx === itemIndex ? { ...it, importing: false, imported: true } : it)),
        )
      } catch (error: any) {
        // Update item status with error
        setImportItems((prev) =>
          prev.map((it, idx) =>
            idx === itemIndex ? { ...it, importing: false, error: error.message || "Import failed" } : it,
          ),
        )
      }

      setImportProgress(Math.round(((i + 1) / total) * 100))

      // Rate limiting - wait 1 second between requests
      if (i < toImport.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    setImporting(false)
    onImportComplete()
  }

  // Reset import state
  const resetImportState = () => {
    setAwSearchQuery("")
    setAwSearchResults([])
    setAwSelectedUser(null)
    setAwLists(null)
    setAuUsername("")
    setAuRecords([])
    setJsonFile(null)
    setJsonData(null)
    setImportItems([])
    setImportProgress(0)
  }

  const importableCount = importItems.filter(
    (item) => !item.skipped && item.anilistId && !item.imported && !item.error,
  ).length

  const importedCount = importItems.filter((item) => item.imported).length
  const skippedCount = importItems.filter((item) => item.skipped).length

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setExportDialogOpen(true)}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Esporta</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
          onClick={() => {
            resetImportState()
            setImportDialogOpen(true)
          }}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Importa</span>
        </Button>
      </div>

      {/* Export Dialog */}
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

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  Anime: {animeCollection?.lists?.reduce((acc: number, list: any) => acc + list.entries.length, 0) || 0}
                </span>
                <span>
                  Manga: {mangaCollection?.lists?.reduce((acc: number, list: any) => acc + list.entries.length, 0) || 0}
                </span>
              </div>
            </Card>

            <Button className="w-full gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Scarica Backup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Importa Liste</DialogTitle>
            <DialogDescription>Importa le tue liste da altri servizi su AniList</DialogDescription>
          </DialogHeader>

          <Tabs
            value={importType}
            onValueChange={(v) => setImportType(v as "anime" | "manga")}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="anime">Anime</TabsTrigger>
              <TabsTrigger value="manga">Manga</TabsTrigger>
            </TabsList>

            <TabsContent value="anime" className="mt-0 flex-1 min-h-0 flex flex-col">
              <Tabs
                value={importSource}
                onValueChange={(v) => {
                  setImportSource(v as any)
                  setImportItems([])
                }}
                className="flex-1 min-h-0 flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="animeworld" className="gap-2 text-xs sm:text-sm">
                    <Image
                      src="https://static.animeworld.ac/assets/images/favicon-dark/android-icon-192x192.png?4"
                      alt="AnimeWorld"
                      width={16}
                      height={16}
                      className="rounded"
                    />
                    <span className="hidden sm:inline">AnimeWorld</span>
                    <span className="sm:hidden">AW</span>
                  </TabsTrigger>
                  <TabsTrigger value="anilist" className="gap-2 text-xs sm:text-sm">
                    <FileJson className="h-4 w-4" />
                    <span className="hidden sm:inline">AniList JSON</span>
                    <span className="sm:hidden">JSON</span>
                  </TabsTrigger>
                  <TabsTrigger value="animeunity" className="gap-2 text-xs sm:text-sm">
                    <img
                      src="https://www.animeunity.so/apple-touch-icon.png"
                      alt="AnimeUnity"
                      width="16"
                      height="16"
                      className="rounded"
                    />
                    <span className="hidden sm:inline">AnimeUnity</span>
                    <span className="sm:hidden">AU</span>
                  </TabsTrigger>
                </TabsList>

                {/* AnimeWorld Import */}
                <TabsContent value="animeworld" className="mt-0 flex-1 min-h-0 flex flex-col">
                  {!awSelectedUser ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Cerca utente AnimeWorld..."
                            value={awSearchQuery}
                            onChange={(e) => setAwSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAwSearch()}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <Button onClick={handleAwSearch} disabled={awSearching}>
                          {awSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
                        </Button>
                      </div>

                      {awSearchResults.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Risultati trovati: {awSearchResults.length}</p>
                          <div className="space-y-2 max-h-60 overflow-auto">
                            {awSearchResults.map((awUser) => (
                              <Card
                                key={awUser.id}
                                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleLoadAwLists(awUser)}
                              >
                                <Image
                                  src={awUser.pfp || "/placeholder.svg"}
                                  alt={awUser.username}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                                <span className="font-medium">{awUser.username}</span>
                                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Card className="p-3 flex items-center gap-3 mb-4 flex-shrink-0">
                        <Image
                          src={awSelectedUser.pfp || "/placeholder.svg"}
                          alt={awSelectedUser.username}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium">{awSelectedUser.username}</p>
                          <p className="text-sm text-muted-foreground">AnimeWorld</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            setAwSelectedUser(null)
                            setAwLists(null)
                            setImportItems([])
                          }}
                        >
                          Cambia
                        </Button>
                      </Card>

                      {awLoadingLists ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0">
                          <ImportItemsList
                            items={importItems}
                            importing={importing}
                            importProgress={importProgress}
                            importableCount={importableCount}
                            importedCount={importedCount}
                            skippedCount={skippedCount}
                            onImport={handleImport}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* AniList JSON Import */}
                <TabsContent value="anilist" className="mt-0 flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Card className="p-4 border-dashed mb-4 flex-shrink-0">
                      <label className="flex flex-col items-center gap-3 cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{jsonFile ? jsonFile.name : "Seleziona file JSON"}</p>
                          <p className="text-sm text-muted-foreground">Carica il file esportato in precedenza</p>
                        </div>
                        <input type="file" accept=".json" className="hidden" onChange={handleJsonFileChange} />
                      </label>
                    </Card>

                    {importItems.length > 0 && (
                      <div className="flex-1 min-h-0">
                        <ImportItemsList
                          items={importItems}
                          importing={importing}
                          importProgress={importProgress}
                          importableCount={importableCount}
                          importedCount={importedCount}
                          skippedCount={skippedCount}
                          onImport={handleImport}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* AnimeUnity Import */}
                <TabsContent value="animeunity" className="mt-0 flex-1 min-h-0 flex flex-col">
                  {auRecords.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Inserisci il tuo username AnimeUnity per importare la tua lista
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Username AnimeUnity"
                          value={auUsername}
                          onChange={(e) => setAuUsername(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAuFetch()}
                          className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <Button onClick={handleAuFetch} disabled={auLoading}>
                          {auLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carica"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Card className="p-3 flex items-center gap-3 mb-4 flex-shrink-0">
                        <img
                          src="https://www.animeunity.so/apple-touch-icon.png"
                          alt="AnimeUnity"
                          width="40"
                          height="40"
                          className="rounded"
                        />
                        <div>
                          <p className="font-medium" style={{ textAlign: "center" }} >{auUsername}</p>
                          <p className="text-sm text-muted-foreground">AnimeUnity</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            setAuRecords([])
                            setImportItems([])
                          }}
                        >
                          Cambia
                        </Button>
                      </Card>

                      <div className="flex-1 min-h-0">
                        <ImportItemsList
                          items={importItems}
                          importing={importing}
                          importProgress={importProgress}
                          importableCount={importableCount}
                          importedCount={importedCount}
                          skippedCount={skippedCount}
                          onImport={handleImport}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="manga" className="mt-0 flex-1 overflow-hidden flex flex-col">
              <Card className="p-8 text-center space-y-4 border-dashed">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Prossimamente...</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    L'importazione delle liste manga sarà disponibile a breve
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Import items list component
function ImportItemsList({
  items,
  importing,
  importProgress,
  importableCount,
  importedCount,
  skippedCount,
  onImport,
}: {
  items: ImportItem[]
  importing: boolean
  importProgress: number
  importableCount: number
  importedCount: number
  skippedCount: number
  onImport: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Importati: {importedCount}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          Saltati: {skippedCount}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          Da importare: {importableCount}
        </Badge>
      </div>

      {importing && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Importazione in corso...</span>
            <span>{importProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mb-4">
        {items.map((item, idx) => (
          <Card key={idx} className={`p-2 flex items-center gap-3 ${item.skipped ? "opacity-50" : ""}`}>
            {item.image && (
              <Image
                src={item.image || "/placeholder.svg"}
                alt={item.title}
                width={32}
                height={48}
                className="rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.status} • Ep. {item.progress}
                {item.score > 0 && ` • ⭐ ${item.score}`}
              </p>
            </div>
            <div className="shrink-0">
              {item.importing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : item.imported ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : item.skipped ? (
                <Badge variant="secondary" className="text-xs">
                  Già presente
                </Badge>
              ) : item.error ? (
                <XCircle className="h-4 w-4 text-red-500" title={item.error} />
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {importableCount > 0 && !importing && (
        <Button className="w-full gap-2" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Importa {importableCount} anime su AniList
        </Button>
      )}
    </div>
  )
}
