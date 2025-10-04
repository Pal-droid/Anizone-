"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MoviePlayerDialogProps {
  isOpen: boolean
  onClose: () => void
  movieUrl: string
  title: string
  type: "movie" | "series"
}

export function MoviePlayerDialog({ isOpen, onClose, movieUrl, title, type }: MoviePlayerDialogProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [selectedServer, setSelectedServer] = useState<string>("")
  const [selectedSeason, setSelectedSeason] = useState<number>(1)

  useEffect(() => {
    if (isOpen && movieUrl) {
      fetchMovieDetails()
    }
  }, [isOpen, movieUrl])

  const fetchMovieDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/movie-details?url=${encodeURIComponent(movieUrl)}`)
      const result = await response.json()

      if (result.ok) {
        setData(result)
        // Auto-select dropload server if available
        if (result.type === "movie") {
          const droploadServer = result.servers.find((s: any) => s.name.toLowerCase().includes("dropload"))
          setSelectedServer(droploadServer?.url || result.servers[0]?.url || "")
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch movie details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEpisodeSelect = (serverUrl: string) => {
    setSelectedServer(serverUrl)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-[var(--font-playfair)]">{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
          </div>
        ) : data?.type === "movie" ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-black">
              {selectedServer && (
                <iframe
                  src={selectedServer}
                  className="w-full h-full"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              )}
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-3">Server disponibili:</h3>
              <div className="flex gap-2">
                {data.servers.map((server: any, idx: number) => (
                  <Button
                    key={idx}
                    variant={selectedServer === server.url ? "default" : "outline"}
                    onClick={() => setSelectedServer(server.url)}
                  >
                    {server.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 h-full p-6 pt-0">
            <div className="col-span-2 bg-black rounded-lg overflow-hidden">
              {selectedServer && (
                <iframe
                  src={selectedServer}
                  className="w-full h-full"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              )}
            </div>
            <ScrollArea className="h-full">
              <Tabs
                value={`season-${selectedSeason}`}
                onValueChange={(v) => setSelectedSeason(Number.parseInt(v.split("-")[1]))}
              >
                <TabsList className="w-full">
                  {data?.seasons?.map((season: any) => (
                    <TabsTrigger key={season.season} value={`season-${season.season}`}>
                      Stagione {season.season}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {data?.seasons?.map((season: any) => (
                  <TabsContent key={season.season} value={`season-${season.season}`} className="space-y-2 mt-4">
                    {season.episodes.map((episode: any) => (
                      <div key={episode.number} className="glass rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-2">
                          {episode.number} - {episode.title}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {episode.servers.map((server: any, idx: number) => {
                            // Prefer dropload server
                            const isDropload = server.name.toLowerCase().includes("dropload")
                            return (
                              <Button
                                key={idx}
                                size="sm"
                                variant={selectedServer === server.url ? "default" : "outline"}
                                onClick={() => handleEpisodeSelect(server.url)}
                              >
                                {server.name}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
