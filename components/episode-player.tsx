"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}: {
  path: string
  seriesTitle?: string
  sources?: Source[]
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

  const seriesKeyForStore = useMemo(() => seriesBaseFromPath(path), [path])
  const lastSentAtRef = useRef<number>(0)
  const lastSentSecRef = useRef<number>(0)
  const restoreDoneRef = useRef<boolean>(false)

  // Available servers from sources prop
  const availableServers = useMemo(() => {
    const servers = sources?.map((s) => s.name) || ["AnimeWorld"]
    return servers.length > 0 ? servers : ["AnimeWorld"]
  }, [sources])

  // Check if current server uses embeds
  const isEmbedServer = selectedServer === "AnimeSaturn"

  // Load auto-next preference
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

  // Set default server to first available
  useEffect(() => {
    if (availableServers.length > 0 && !availableServers.includes(selectedServer)) {
      setSelectedServer(availableServers[0])
    }
  }, [availableServers, selectedServer])

  // Load episodes based on selected server
  useEffect(() => {
    const abort = new AbortController()
    ;(async () => {
      setLoadingEpisodes(true)
      setError(null)
      try {
        // If we have unified sources, try to use the unified episodes API
        if (sources && sources.length > 1) {
          const awSource = sources.find((s) => s.name === "AnimeWorld")
          const asSource = sources.find((s) => s.name === "AnimeSaturn")

          if (awSource && asSource) {
            const params = new URLSearchParams()
            params.set("AW", awSource.id)
            params.set("AS", asSource.id)

            const r = await fetch(`https://aw-au-api.onrender.com/episodes?${params}`, {
              signal: abort.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
              },
            })

            if (r.ok) {
              const unifiedEpisodes = await r.json()
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
                  unifiedData: ep, // Store the full episode data for later use
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

        if (selectedServer === "AnimeSaturn" && sources && sources.length === 1) {
          const asSource = sources.find((s) => s.name === "AnimeSaturn")
          if (asSource) {
            const r = await fetch(`https://aw-au-api.onrender.com/episodes?AS=${asSource.id}`, {
              signal: abort.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
              },
            })

            if (r.ok) {
              const unifiedEpisodes = await r.json()
              const eps: Episode[] = unifiedEpisodes
                .map((ep: any) => ({
                  num: ep.episode_number,
                  href: ep.sources.AnimeSaturn?.url || "",
                  id: ep.sources.AnimeSaturn?.id || "",
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

        if (selectedServer === "AnimeWorld" || availableServers.includes("AnimeWorld")) {
          const r = await fetch(`/api/episodes?path=${encodeURIComponent(path)}`, { signal: abort.signal })
          const ct = r.headers.get("content-type") || ""
          if (!ct.includes("application/json")) {
            const txt = await r.text()
            throw new Error(txt.slice(0, 200))
          }
          const j = await r.json()
          if (!j.ok) throw new Error(j.error || "Errore episodi")
          const eps: Episode[] = j.episodes
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
        } else {
          throw new Error(`Impossibile caricare episodi per ${selectedServer}. Il server unificato non è disponibile.`)
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
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

  // Stream discovery with unified API support
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
      try {
        // If we have unified episode data and multiple servers, use unified stream API
        if ((selectedEpisode as any).unifiedData && sources && sources.length > 1) {
          const awSource = sources.find((s) => s.name === "AnimeWorld")
          const asSource = sources.find((s) => s.name === "AnimeSaturn")

          if (awSource && asSource) {
            const params = new URLSearchParams()
            const unifiedEp = (selectedEpisode as any).unifiedData

            if (selectedServer === "AnimeWorld" && unifiedEp.sources.AnimeWorld?.id) {
              params.set("AW", unifiedEp.sources.AnimeWorld.id)
            }
            if (selectedServer === "AnimeSaturn" && unifiedEp.sources.AnimeSaturn?.id) {
              params.set("AS", unifiedEp.sources.AnimeSaturn.id)
            }

            const r = await fetch(`https://aw-au-api.onrender.com/stream?${params}`, {
              signal: abort.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
              },
            })

            if (r.ok) {
              const streamData = await r.json()
              const serverData = streamData[selectedServer]

              if (serverData?.available) {
                if (selectedServer === "AnimeWorld" && serverData.stream_url) {
                  const direct = serverData.stream_url
                  setStreamUrl(direct)
                  setEpisodeRefUrl(selectedEpisode.href)

                  const stamp = Math.floor(Date.now() / 60000)
                  const proxy = `/api/proxy-stream?src=${encodeURIComponent(direct)}&ref=${encodeURIComponent(selectedEpisode.href)}&ts=${stamp}`
                  setProxyUrl(proxy)
                } else if (selectedServer === "AnimeSaturn" && serverData.embed) {
                  const parser = new DOMParser()
                  const doc = parser.parseFromString(serverData.embed, "text/html")
                  const video = doc.querySelector("video")

                  if (video && video.src) {
                    setProxyUrl(video.src)
                    setStreamUrl(serverData.stream_url)
                  } else {
                    throw new Error("Invalid embed format from AnimeSaturn")
                  }
                }
                return
              } else {
                throw new Error(`${selectedServer} non è disponibile per questo episodio`)
              }
            }
          }
        }

        if (
          selectedServer === "AnimeSaturn" &&
          (selectedEpisode as any).unifiedData &&
          sources &&
          sources.length === 1
        ) {
          const unifiedEp = (selectedEpisode as any).unifiedData
          if (unifiedEp.sources.AnimeSaturn?.id) {
            const r = await fetch(`https://aw-au-api.onrender.com/stream?AS=${unifiedEp.sources.AnimeSaturn.id}`, {
              signal: abort.signal,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AnizoneBot/1.0 Safari/537.36",
              },
            })

            if (r.ok) {
              const streamData = await r.json()
              const serverData = streamData.AnimeSaturn

              if (serverData?.available && serverData.embed) {
                const parser = new DOMParser()
                const doc = parser.parseFromString(serverData.embed, "text/html")
                const video = doc.querySelector("video")

                if (video && video.src) {
                  setProxyUrl(video.src)
                  setStreamUrl(serverData.stream_url)
                } else {
                  throw new Error("Invalid embed format from AnimeSaturn")
                }
                return
              } else {
                throw new Error("AnimeSaturn non è disponibile per questo episodio")
              }
            }
          }
        }

        if (selectedServer === "AnimeWorld") {
          const epPath = (() => {
            try {
              const u = new URL(selectedEpisode.href)
              return u.pathname + (u.search || "")
            } catch {
              return selectedEpisode.href
            }
          })()

          const cacheKey = `anizone:stream:${epKey(selectedEpisode)}`
          const cached = storageGet<{ direct: string; ref: string; ts: number }>(cacheKey)
          const fresh = cached && Date.now() - cached.ts < 10 * 60 * 1000 && typeof cached.direct === "string"

          let direct = cached?.direct
          let ref = cached?.ref

          if (!fresh) {
            const r = await fetch(`/api/stream?path=${encodeURIComponent(epPath)}`, { signal: abort.signal })
            const ct = r.headers.get("content-type") || ""
            if (!ct.includes("application/json")) {
              const txt = await r.text()
              throw new Error(txt.slice(0, 200))
            }
            const j = await r.json()
            if (!j.ok) throw new Error(j.error || "Errore stream")
            direct = j.streamUrl as string
            ref = j.source as string
            storageSet(cacheKey, { direct, ref, ts: Date.now() })
          }

          setStreamUrl(direct!)
          setEpisodeRefUrl(ref || null)
          const stamp = Math.floor(Date.now() / 60000)
          const proxy = `/api/proxy-stream?src=${encodeURIComponent(direct!)}${
            ref ? `&ref=${encodeURIComponent(ref)}` : ""
          }&ts=${stamp}`
          setProxyUrl(proxy)
        } else {
          throw new Error(`${selectedServer} richiede l'API unificata che non è attualmente disponibile`)
        }
      } catch (e: any) {
        if (abort.signal.aborted) return
        setError(e?.message || "Errore nel caricamento dello stream")
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    })()
    return () => abort.abort()
  }, [selectedEpisode, selectedServer, sources])

  // Resume on metadata (only for video player, not iframe)
  useEffect(() => {
    if (!proxyUrl || isEmbedServer) return
    const v = videoRef.current
    if (!v) return
    const onLoaded = async () => {
      try {
        if (restoreDoneRef.current) return
        const r = await fetch("/api/user-state", { cache: "no-store" })
        const j = await r.json()
        const entry = j?.data?.continueWatching?.[seriesKeyForStore]
        const savedEp = Number(entry?.episode?.num ?? 0)
        const savedPos = Number(entry?.positionSeconds ?? entry?.position_seconds ?? 0)
        if (entry && savedEp === (selectedEpisode?.num ?? -1) && savedPos > 0 && isFinite(savedPos)) {
          const dur = v.duration
          const resumeTo = Math.max(0, Math.min(savedPos, isFinite(dur) && dur > 0 ? dur - 2 : savedPos))
          if (!Number.isNaN(resumeTo) && resumeTo > 0) v.currentTime = resumeTo
        }
      } catch {
      } finally {
        restoreDoneRef.current = true
      }
      if (autoNext) v.play().catch(() => {})
    }
    v.addEventListener("loadedmetadata", onLoaded, { once: true })
    return () => v.removeEventListener("loadedmetadata", onLoaded)
  }, [proxyUrl, autoNext, seriesKeyForStore, selectedEpisode, isEmbedServer])

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

  // timeupdate-driven periodic save + events (only for video player)
  useEffect(() => {
    if (isEmbedServer) return // Skip for embed servers
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

  return (
    <div className="w-full space-y-3">
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Episodi</div>
          <div className="flex items-center gap-4">
            {/* Server selector */}
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
            key={proxyUrl}
            ref={videoRef}
            src={proxyUrl}
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            autoPlay={autoNext}
            onEnded={onEnd}
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
