"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EpisodeCountdown } from "@/components/episode-countdown"

declare global {
  interface Window {
    Hls?: any
  }
}

type Episode = { num: number; href: string; id?: string }
type Source = { name: string; url: string; id: string }

function epKey(e: Episode) {
  return `${e.num}-${e.href}`
}

function seriesBaseFromPath(path: string) {
  try {
    const u = new URL(path, "https://dummy.local")
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length >= 2) return `/${parts[0]}/${parts[1]}`
    return u.pathname
  } catch {
    const parts = path.split("/").filter(Boolean)
    if (parts.length >= 2) return `/${parts[0]}/${parts[1]}`
    return path
  }
}

function extractAnimeIdFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    if (pathParts.length >= 2 && pathParts[0] === "play") {
      return pathParts[1]
    }
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    console.warn("[v0] Could not extract anime ID from URL:", url)
    return url
  } catch (error) {
    console.warn("[v0] Error parsing URL:", url, error)
    const pathMatch = url.match(/\/play\/([^/?#]+)/)
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1]
    }
    return url
  }
}

function storageGet<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
function storageSet(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

export function EpisodePlayer({
  path,
  seriesTitle = "Anime",
  sources = [],
  nextEpisodeDate,
  nextEpisodeTime,
}: {
  path: string
  seriesTitle?: string
  sources?: Source[]
  nextEpisodeDate?: string
  nextEpisodeTime?: string
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<string>("AnimeWorld")
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [episodeRefUrl, setEpisodeRefUrl] = useState<string | null>(null)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoNext, setAutoNext] = useState<boolean>(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [useHlsFallback, setUseHlsFallback] = useState(false)
  const hlsRef = useRef<any>(null)

  const seriesKeyForStore = useMemo(() => seriesBaseFromPath(path), [path])
  const lastSentAtRef = useRef<number>(0)
  const lastSentSecRef = useRef<number>(0)
  const restoreDoneRef = useRef<boolean>(false)

  const availableServers = useMemo(() => {
    const servers = sources?.map((s) => s.name) || ["AnimeWorld"]
    return servers.length > 0 ? servers : ["AnimeWorld"]
  }, [sources])

  const isEmbedServer = selectedServer === "AnimeSaturn"

  useEffect(() => {
    try {
      const v = localStorage.getItem("anizone:autoNext")
      if (v === "0") setAutoNext(false)
      else setAutoNext(true)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem("anizone:autoNext", autoNext ? "1" : "0")
    } catch {}
  }, [autoNext])

  useEffect(() => {
    if (availableServers.length > 0 && !availableServers.includes(selectedServer)) {
      setSelectedServer(availableServers[0])
    }
  }, [availableServers, selectedServer])

  useEffect(() => {
    const abort = new AbortController()
    ;(async () => {
      setLoadingEpisodes(true)
      setError(null)
      try {
        console.log("[v0] Loading episodes for server:", selectedServer, "with sources:", sources)

        if (!sources || sources.length === 0) {
          console.log("[v0] No sources provided, trying to get from sessionStorage")

          try {
            const storedSources = sessionStorage.getItem(`anizone:sources:${path}`)
            if (storedSources) {
              const parsedSources = JSON.parse(storedSources)
              if (Array.isArray(parsedSources) && parsedSources.length > 0) {
                console.log("[v0] Found sources in sessionStorage:", parsedSources)
                const awSource = parsedSources.find((s: any) => s.name === "AnimeWorld")
                const asSource = parsedSources.find((s: any) => s.name === "AnimeSaturn")

                if (awSource || asSource) {
                  const params = new URLSearchParams()
                  if (awSource) {
                    const animeId = extractAnimeIdFromUrl(awSource.url)
                    params.set("AW", animeId)
                    console.log("[v0] Using anime ID from URL:", animeId, "extracted from:", awSource.url)
                  }
                  if (asSource) {
                    params.set("AS", asSource.id)
                    console.log("[v0] Using AnimeSaturn ID:", asSource.id, "from source object")
                  }

                  const apiUrl = `https://aw-au-as-api.vercel.app/api/episodes?${params}`
                  console.log("[v0] Calling unified episodes API with stored sources:", apiUrl)

                  const r = await fetch(apiUrl, {
                    signal: abort.signal,
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
                    },
                  })

                  if (r.ok) {
                    const unifiedEpisodes = await r.json()
                    if (Array.isArray(unifiedEpisodes)) {
                      const eps: Episode[] = unifiedEpisodes
                        .map((ep: any) => ({
                          num: ep.episode_number,
                          href:
                            selectedServer === "AnimeWorld"
                              ? ep.sources.AnimeWorld?.url || ""
                              : ep.sources.AnimeSaturn?.url || "",
                          id:
                            selectedServer === "AnimeWorld"
                              ? ep.sources.AnimeWorld?.id || ""
                              : ep.sources.AnimeSaturn?.id || "",
                          unifiedData: ep,
                        }))
                        .filter((ep: Episode) => ep.href || ep.id)

                      setEpisodes(eps)

                      let epParam: number | null = null
                      try {
                        const u = new URL(typeof window !== "undefined" ? window.location.href : "https://dummy.local")
                        const v = u.searchParams.get("ep")
                        if (v) epParam = Number.parseInt(v, 10)
                      } catch {}

                      if (epParam && eps.some((e) => e.num === epParam)) {
                        const match = eps.find((e) => e.num === epParam)!
                        setSelectedKey(epKey(match))
                      } else if (eps.length > 0) {
                        setSelectedKey(epKey(eps[0]))
                      }
                      return
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.log("[v0] Failed to get sources from sessionStorage:", e)
          }

          throw new Error("No sources available. Please go back and select an anime from the main page.")
        }

        const awSource = sources.find((s) => s.name === "AnimeWorld")
        const asSource = sources.find((s) => s.name === "AnimeSaturn")

        console.log("[v0] Found sources:", { awSource, asSource })

        const params = new URLSearchParams()
        if (awSource) {
          const animeId = extractAnimeIdFromUrl(awSource.url)
          params.set("AW", animeId)
          console.log("[v0] Using anime ID from URL:", animeId, "extracted from:", awSource.url)
        }
        if (asSource) {
          params.set("AS", asSource.id)
          console.log("[v0] Using AnimeSaturn ID:", asSource.id, "from source object")
        }

        if (!awSource && !asSource) {
          throw new Error("No valid AnimeWorld or AnimeSaturn sources found")
        }

        const apiUrl = `https://aw-au-as-api.vercel.app/api/episodes?${params}`
        console.log("[v0] Calling unified episodes API:", apiUrl)

        const r = await fetch(apiUrl, {
          signal: abort.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          },
        })

        console.log("[v0] Unified episodes API response status:", r.status)
        console.log("[v0] Response headers:", Object.fromEntries(r.headers.entries()))

        if (!r.ok) {
          const errorText = await r.text()
          console.log("[v0] Unified episodes API error response:", errorText)
          throw new Error(`Unified API failed with status ${r.status}: ${errorText}`)
        }

        const unifiedEpisodes = await r.json()
        console.log("[v0] Unified episodes response:", unifiedEpisodes)

        if (!Array.isArray(unifiedEpisodes)) {
          console.log("[v0] Invalid response format - not an array:", typeof unifiedEpisodes)
          throw new Error("Invalid response format from unified API")
        }

        const eps: Episode[] = unifiedEpisodes
          .map((ep: any) => ({
            num: ep.episode_number,
            href:
              selectedServer === "AnimeWorld" ? ep.sources.AnimeWorld?.url || "" : ep.sources.AnimeSaturn?.url || "",
            id: selectedServer === "AnimeWorld" ? ep.sources.AnimeWorld?.id || "" : ep.sources.AnimeSaturn?.id || "",
            unifiedData: ep,
          }))
          .filter((ep: Episode) => ep.href || ep.id)

        console.log("[v0] Processed episodes:", eps)
        setEpisodes(eps)

        let epParam: number | null = null
        try {
          const u = new URL(typeof window !== "undefined" ? window.location.href : "https://dummy.local")
          const v = u.searchParams.get("ep")
          if (v) epParam = Number.parseInt(v, 10)
        } catch {}

        if (epParam && eps.some((e) => e.num === epParam)) {
          const match = eps.find((e) => e.num === epParam)!
          setSelectedKey(epKey(match))
        } else if (eps.length > 0) {
          setSelectedKey(epKey(eps[0]))
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
        console.log("[v0] Episode loading error:", e)
        console.log("[v0] Error details:", {
          message: e?.message,
          stack: e?.stack,
          name: e?.name,
          cause: e?.cause,
        })
        setError(e?.message || "Errore nel caricamento episodi")
      } finally {
        if (!abort.signal.aborted) setLoadingEpisodes(false)
      }
    })()
    return () => abort.abort()
  }, [path, selectedServer, sources, availableServers])

  const selectedEpisode = useMemo(
    () => (selectedKey ? (episodes.find((e) => epKey(e) === selectedKey) ?? null) : null),
    [selectedKey, episodes],
  )

  useEffect(() => {
    if (!selectedEpisode) return
    const abort = new AbortController()
    restoreDoneRef.current = false
    ;(async () => {
      setLoading(true)
      setStreamUrl(null)
      setEmbedUrl(null)
      setEpisodeRefUrl(null)
      setProxyUrl(null)
      setError(null)
      setUseHlsFallback(false)

      try {
        console.log("[v0] Loading stream for episode:", selectedEpisode, "server:", selectedServer)

        if (!(selectedEpisode as any).unifiedData) {
          throw new Error("No unified data available for this episode")
        }

        if (!sources || sources.length === 0) {
          throw new Error("No sources available for streaming")
        }

        const params = new URLSearchParams()
        const unifiedEp = (selectedEpisode as any).unifiedData

        if (selectedServer === "AnimeWorld" && unifiedEp.sources.AnimeWorld?.id) {
          params.set("AW", unifiedEp.sources.AnimeWorld.id)
        }
        if (selectedServer === "AnimeSaturn" && unifiedEp.sources.AnimeSaturn?.id) {
          params.set("AS", unifiedEp.sources.AnimeSaturn.id)
        }

        if (!params.toString()) {
          throw new Error(`No valid ${selectedServer} source ID found for this episode`)
        }

        const apiUrl = `https://aw-au-as-api.vercel.app/api/stream?${params}`
        console.log("[v0] Calling unified stream API:", apiUrl)

        const r = await fetch(apiUrl, {
          signal: abort.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
          },
        })

        console.log("[v0] Unified stream API response status:", r.status)

        if (!r.ok) {
          const errorText = await r.text()
          throw new Error(`Unified stream API failed with status ${r.status}: ${errorText}`)
        }

        const streamData = await r.json()
        const serverData = streamData[selectedServer]

        if (!serverData || !serverData.available) {
          throw new Error(`${selectedServer} is not available for this episode`)
        }

        if (selectedServer === "AnimeWorld" && serverData.stream_url) {
          const direct = serverData.stream_url
          setStreamUrl(direct)
          setEpisodeRefUrl(selectedEpisode.href)

          const stamp = Math.floor(Date.now() / 60000)
          const proxy = `/api/proxy-stream?src=${encodeURIComponent(direct)}&ref=${encodeURIComponent(selectedEpisode.href)}&ts=${stamp}`
          setProxyUrl(proxy)
        } else if (selectedServer === "AnimeSaturn") {
          const finalStreamUrl = serverData.stream_url

          if (finalStreamUrl) {
            // Use iframe embed for all AnimeSaturn streams (both MP4 and M3U8)
            const embedIframeUrl = `https://animesaturn-proxy.onrender.com/embed?url=${encodeURIComponent(finalStreamUrl)}`
            setEmbedUrl(embedIframeUrl)
          } else if (serverData.embed) {
            // Fallback to existing embed HTML if no direct stream URL
            setEmbedUrl(`data:text/html;charset=utf-8,${encodeURIComponent(serverData.embed)}`)
          } else {
            throw new Error("No valid stream data found for AnimeSaturn")
          }
        } else {
          throw new Error(`Invalid stream data format for ${selectedServer}`)
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
        console.log("[v0] Stream loading error:", e)
        setError(e?.message || "Errore nel caricamento dello stream")
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    })()
    return () => abort.abort()
  }, [selectedEpisode, selectedServer, sources])

  useEffect(() => {
    if (!useHlsFallback || !proxyUrl || !videoRef.current) return

    const video = videoRef.current

    if (!window.Hls) {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest"
      script.onload = () => initializeHls()
      document.head.appendChild(script)
    } else {
      initializeHls()
    }

    function initializeHls() {
      if (!window.Hls || !video || !proxyUrl) return

      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (window.Hls.isSupported()) {
        console.log("[v0] Initializing HLS.js for m3u8 stream:", proxyUrl)
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
        })

        hlsRef.current = hls
        hls.loadSource(proxyUrl)
        hls.attachMedia(video)

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          console.log("[v0] HLS manifest parsed successfully")
        })

        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
          console.error("[v0] HLS error:", data)
          if (data.fatal) {
            setError("Errore nella riproduzione HLS")
          }
        })
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("[v0] Using native HLS support")
        video.src = proxyUrl
      } else {
        setError("HLS non supportato in questo browser")
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [useHlsFallback, proxyUrl])

  useEffect(() => {
    if (isEmbedServer) return
    const v = videoRef.current
    if (!v) return
    const onTime = () => sendProgress(v.currentTime)
    const onPause = () => sendProgress(v.currentTime, { immediate: true })
    const onEnded = () => sendProgress(v.duration || v.currentTime || 0, { immediate: true })
    const onVis = () => {
      if (document.visibilityState === "hidden") sendProgress(v.currentTime, { keepalive: true, immediate: true })
    }
    const onUnload = () => sendProgress(v.currentTime, { keepalive: true, immediate: true })
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("pause", onPause)
    v.addEventListener("ended", onEnded)
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pagehide", onUnload)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("pause", onPause)
      v.removeEventListener("ended", onEnded)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pagehide", onUnload)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [selectedEpisode, seriesKeyForStore, seriesTitle, isEmbedServer])

  const onEnd = () => {
    if (!autoNext || !selectedEpisode) return
    const idx = episodes.findIndex((e) => epKey(e) === epKey(selectedEpisode))
    if (idx >= 0 && idx + 1 < episodes.length) {
      const next = episodes[idx + 1]
      setSelectedKey(epKey(next))
    }
  }

  async function saveContinueForClick(ep: Episode) {
    try {
      const seriesKey = seriesBaseFromPath(path)
      const seriesPath = seriesKey
      await fetch("/api/user-state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "continue",
          seriesKey,
          seriesPath,
          title: seriesTitle || "Anime",
          episode: { num: ep.num, href: ep.href },
          position_seconds: 0,
        }),
      })
      broadcastProgress(0)
    } catch {}
  }

  const broadcastProgress = (seconds: number) => {
    try {
      const detail = {
        seriesKey: seriesKeyForStore,
        episodeNum: selectedEpisode?.num ?? 0,
        position: Math.floor(seconds || 0),
      }
      window.dispatchEvent(new CustomEvent("anizone:progress", { detail }))
    } catch {}
  }

  const sendProgress = (seconds: number, opts?: { keepalive?: boolean; immediate?: boolean }) => {
    const now = Date.now()
    const progressed = Math.abs(seconds - lastSentSecRef.current)
    const shouldThrottle = !opts?.immediate && now - lastSentAtRef.current < 8000 && progressed < 5
    if (shouldThrottle) return
    lastSentAtRef.current = now
    lastSentSecRef.current = seconds

    const payload = {
      op: "continue",
      seriesKey: seriesKeyForStore,
      seriesPath: seriesKeyForStore,
      title: seriesTitle || "Anime",
      episode: { num: selectedEpisode?.num ?? 0, href: selectedEpisode?.href ?? "" },
      position_seconds: Math.floor(seconds),
    }

    broadcastProgress(payload.position_seconds)

    try {
      if (opts?.keepalive && "sendBeacon" in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
        navigator.sendBeacon("/api/user-state", blob)
        return
      }
    } catch {}

    fetch("/api/user-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // @ts-ignore
      keepalive: opts?.keepalive === true,
    }).catch(() => {})
  }

  return (
    <div className="w-full space-y-3">
      {nextEpisodeDate && nextEpisodeTime && (
        <EpisodeCountdown nextEpisodeDate={nextEpisodeDate} nextEpisodeTime={nextEpisodeTime} className="text-sm" />
      )}

      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Episodi</div>
          <div className="flex items-center gap-4">
            {availableServers.length > 1 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="server-select" className="text-xs text-muted-foreground">
                  Server:
                </Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-[120px] h-7 text-xs" id="server-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServers.map((server) => (
                      <SelectItem key={server} value={server} className="text-xs">
                        {server}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch id="auto-next" checked={autoNext} onCheckedChange={setAutoNext} />
              <Label htmlFor="auto-next" className="text-xs text-muted-foreground cursor-pointer">
                Auto-next
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x pb-1">
          {loadingEpisodes ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 w-14 rounded-full bg-neutral-800 animate-pulse shrink-0" />
            ))
          ) : episodes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessun episodio trovato.</div>
          ) : (
            episodes.map((e) => {
              const key = epKey(e)
              const active = selectedKey === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedKey(key)
                    saveContinueForClick(e)
                  }}
                  className={`shrink-0 snap-start px-3 h-9 rounded-full text-sm border ${
                    active
                      ? "bg-neutral-100 text-black border-neutral-100 dark:bg-neutral-900 dark:text-white dark:border-neutral-900"
                      : "bg-white text-black dark:bg-neutral-800 dark:text-white/90"
                  }`}
                  aria-pressed={active}
                >
                  {"E" + e.num}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="text-white flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento...
          </div>
        ) : embedUrl ? (
          <iframe
            key={embedUrl}
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            width="380"
            height="215"
            loading="lazy"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={`${seriesTitle} - Episodio ${selectedEpisode?.num || ""}`}
          />
        ) : proxyUrl ? (
          <video
            key={`${proxyUrl}-${useHlsFallback}`}
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            autoPlay={autoNext}
            onEnded={onEnd}
            src={!useHlsFallback ? proxyUrl : undefined}
            onError={() => {
              setError("Errore di riproduzione. Riprovo...")
              if (selectedEpisode) localStorage.removeItem(`anizone:stream:${epKey(selectedEpisode)}`)
              setProxyUrl(null)
              setTimeout(() => {
                setSelectedKey((k) => (k ? `${k}` : k))
              }, 200)
            }}
          />
        ) : !selectedEpisode ? (
          <div className="text-sm text-neutral-200 p-4 text-center">
            Seleziona un episodio per iniziare la riproduzione.
          </div>
        ) : (
          <div className="text-sm text-neutral-200 p-4 text-center">{error || "Caricamento in corso..."}</div>
        )}
      </div>

      {streamUrl && !isEmbedServer ? (
        <div className="text-sm">
          Apri il link diretto in una nuova scheda:{" "}
          <a className="underline" href={streamUrl} target="_blank" rel="noreferrer">
            Apri
          </a>
        </div>
      ) : null}

      {isEmbedServer && (
        <div className="text-xs text-muted-foreground">
          Stai guardando tramite {selectedServer}. Il controllo della riproduzione e il salvataggio della posizione
          potrebbero essere limitati.
        </div>
      )}
    </div>
  )
}
