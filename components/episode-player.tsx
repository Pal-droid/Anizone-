"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EpisodeCountdown } from "@/components/episode-countdown"
import { EpisodeItem, initialEpisode, initialSources } from "@/types"
import { hlsRef, videoRef, iframeRef, currentPathRef, lastSentSecRef, lastSentAtRef, hasNavigatedToNextRef } from "@/lib/references"

declare global {
  interface Window {
    Hls?: any
  }
}

type Episode = { num: number; href: string; id?: string; unifiedData?: any }
type Source = { name: string; url: string; id: string; animeSession?: string }

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
    const parts = pathParts // Declare parts variable here
    if (parts.length >= 2 && pathParts[0] === "play") {
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

function extractAnimeIdFromSourceId(sourceId: string): string {
  // If it contains a slash, it might be an episode ID - extract the anime part
  if (sourceId.includes("/")) {
    return sourceId.split("/")[0]
  }
  return sourceId
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
  const [selectedResolution, setSelectedResolution] = useState<string>("1080")
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [episodeRefUrl, setEpisodeRefUrl] = useState<string | null>(null)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoNext, setAutoNext] = useState<boolean>(true)
  const [autoUpdateProgress, setAutoUpdateProgress] = useState<boolean>(true)
  const [availableResolutions, setAvailableResolutions] = useState<string[]>(["1080", "720", "480", "360"])
  const [aggAudioType, setAggAudioType] = useState<"sub" | "dub">("sub")
  const [aggHasSub, setAggHasSub] = useState<boolean>(true)
  const [aggHasDub, setAggHasDub] = useState<boolean>(false)
  const [aggAvailableQualities, setAggAvailableQualities] = useState<string[]>([])
  const [aggSelectedQuality, setAggSelectedQuality] = useState<string>("1080p")
  const [userProgress, setUserProgress] = useState<number>(0)
  const [isInWatchingList, setIsInWatchingList] = useState<boolean>(false)
  const [isEnglishServer, setIsEnglishServer] = useState<boolean>(() => {
    return path.startsWith("/en/") || !!sessionStorage.getItem(`anizone:isEnglish:${path}`)
  })
  const [enEmbeds, setEnEmbeds] = useState<Array<{ name: string; embedUrl: string }>>([])
  const [selectedEnEmbed, setSelectedEnEmbed] = useState<string | null>(null)
  const videoEndedRef = useRef<boolean>(false)

  const seriesKeyForStore = useMemo(() => seriesBaseFromPath(path), [path])

  // Update isEnglishServer when path changes
  useEffect(() => {
    const isEn = path.startsWith("/en/") || !!sessionStorage.getItem(`anizone:isEnglish:${path}`)
    setIsEnglishServer(isEn)
    if (isEn) {
      setSelectedServer("HNime")
    }
  }, [path])

  const availableServers = useMemo(() => {
    if (isEnglishServer) return ["HNime"]
    const serverNames = sources?.map((s) => s.name) || []
    return serverNames.filter(
      (name) => name === "AnimeWorld" || name === "AnimeSaturn" || name === "AnimePahe" || name === "Unity" || name === "AnimeGG",
    )
  }, [sources, isEnglishServer])

  const serverDisplayNames = useMemo(
    () => ({
      AnimeWorld: "World",
      AnimeSaturn: "Saturn",
      AnimePahe: "Pahe",
      Unity: "Unity",
      AnimeGG: "AGG",
      HNime: "HNime",
    }),
    [],
  )

  const isEmbedServer = false // AnimeSaturn now uses proxy URL instead of embed
  const isAnimePahe = selectedServer === "AnimePahe"
  const isUnity = selectedServer === "Unity"
  const isAnimeGG = selectedServer === "AnimeGG"
  const isHNime = selectedServer === "HNime"

  useEffect(() => {
    if (currentPathRef.current && currentPathRef.current !== path) {
      console.log("[v0] Anime path changed from", currentPathRef.current, "to", path, "- clearing cached data")

      try {
        const oldAnimeId = extractAnimeIdFromUrl(currentPathRef.current)
        const newAnimeId = extractAnimeIdFromUrl(path)

        if (oldAnimeId !== newAnimeId) {
          sessionStorage.removeItem(`anizone:sources:${currentPathRef.current}`)

          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes(oldAnimeId) || key.includes(currentPathRef.current))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key))

          setEpisodes([])
          setSelectedKey(null)
          setStreamUrl(null)
          setEmbedUrl(null)
          setEpisodeRefUrl(null)
          setProxyUrl(null)
          setError(null)
          setEpisodesLoading(true)
        }
      } catch (e) {
        console.log("[v0] Error clearing cached data:", e)
      }
    }
    currentPathRef.current = path
  }, [path])

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
    try {
      const v = localStorage.getItem("anizone:autoUpdateProgress")
      if (v === "0") setAutoUpdateProgress(false)
      else setAutoUpdateProgress(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("anizone:autoUpdateProgress", autoUpdateProgress ? "1" : "0")
    } catch {}
  }, [autoUpdateProgress])

  useEffect(() => {
    if (availableServers.length > 0 && !availableServers.includes(selectedServer)) {
      const serverPriority = ["AnimeWorld", "AnimeSaturn", "Unity", "AnimePahe", "AnimeGG"]
      const prioritizedServer = serverPriority.find((s) => availableServers.includes(s))
      if (prioritizedServer) {
        setSelectedServer(prioritizedServer)
      }
    }
  }, [availableServers, selectedServer])

  useEffect(() => {
    if (!isEnglishServer && (!sources || sources.length === 0)) {
      console.log("[v0] loadEpisodes useEffect - No sources available")
      return
    }

    console.log("[v0] loadEpisodes useEffect - Starting with selectedServer:", selectedServer, "isEnglish:", isEnglishServer)

    async function loadEpisodes() {
      console.log("[v0] loadEpisodes function called - episodesLoading:", episodesLoading)
      if (episodesLoading) {
        console.log("[v0] loadEpisodes - Already loading, returning early")
        return
      }
      setEpisodesLoading(true)
      setEpisodesError(null)

      try {
        // English server (HNime) episode loading
        if (isEnglishServer) {
          const hnSource = sources?.find((s) => s.name === "HNime")
          const sourceId = hnSource?.id || path.replace("/en/", "")
          console.log("[v0] Loading English episodes with HI:", sourceId)

          const r = await fetch(`/api/en/episodes?HI=${encodeURIComponent(sourceId)}`, {
            signal: AbortSignal.timeout(20000),
          })

          if (!r.ok) {
            const errorText = await r.text()
            throw new Error(`EN Episodes API failed: ${errorText}`)
          }

          const data = await r.json()
          if (data.ok && Array.isArray(data.episodes) && data.episodes.length > 0) {
            const mapped: Episode[] = data.episodes.map((ep: any) => ({
              num: ep.num,
              href: ep.sources?.HNime?.url || ep.href || "",
              id: ep.sources?.HNime?.id || ep.id || "",
              unifiedData: ep,
            }))
            console.log("[v0] EN Mapped episodes:", mapped.length)
            setEpisodes(mapped)
          } else {
            throw new Error("No English episodes found")
          }
          setEpisodesLoading(false)
          return
        }

        // Italian server episode loading (existing logic)
        console.log("[v0] Loading episodes for server:", selectedServer, "with sources:", sources)

        const params = new URLSearchParams()

        const awSource = sources?.find((s) => s.name === "AnimeWorld")
        const asSource = sources?.find((s) => s.name === "AnimeSaturn")
        const apSource = sources?.find((s) => s.name === "AnimePahe")
        const auSource = sources?.find((s) => s.name === "Unity")
        const agSource = sources?.find((s) => s.name === "AnimeGG")

        console.log(
          "[v0] Found sources - AW:",
          awSource?.id,
          "AS:",
          asSource?.id,
          "AP:",
          apSource?.id,
          "AU:",
          auSource?.id,
          "AG:",
          agSource?.id,
        )

        if (awSource?.id) params.set("AW", awSource.id)
        if (asSource?.id) params.set("AS", asSource.id)
        if (apSource?.id) {
          params.set("AP", apSource.id)
        }
        if (auSource?.id) params.set("AU", auSource.id)
        if (agSource?.id) params.set("AG", agSource.id)

        console.log("[v0] Fetching episodes with params:", params.toString())

        const apiUrl = `/api/episodes?${params}`
        console.log("[v0] Fetching from URL:", apiUrl)

        const r = await fetch(apiUrl, {
          signal: AbortSignal.timeout(20000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })

        console.log("[v0] Fetch completed with status:", r.status)

        if (!r.ok) {
          const errorText = await r.text()
          console.log("[v0] Episodes API error response:", errorText)
          throw new Error(`Episodes API failed: ${errorText}`)
        }

        const data = await r.json()
        console.log("[v0] Episodes API response:", data)

        if (data.ok && Array.isArray(data.episodes) && data.episodes.length > 0) {
          const mapped: Episode[] = data.episodes.map((ep: any) => ({
            num: ep.num,
            href:
              ep.sources?.AnimeWorld?.url ||
              ep.sources?.AnimeSaturn?.url ||
              ep.sources?.Unity?.url ||
              ep.sources?.AnimePahe?.url ||
              ep.sources?.AnimeGG?.url ||
              "",
            id:
              ep.sources?.AnimeWorld?.id ||
              ep.sources?.AnimeSaturn?.id ||
              ep.sources?.Unity?.id ||
              ep.sources?.AnimePahe?.id ||
              ep.sources?.AnimeGG?.id ||
              "",
            unifiedData: ep,
          }))
          console.log("[v0] Mapped episodes:", mapped.length)
          setEpisodes(mapped)
        } else {
          console.log("[v0] No episodes in response")
          throw new Error("No episodes found")
        }
      } catch (e: any) {
        console.error("[v0] Episodes loading error:", e)
        setEpisodesError(e?.message || "Errore nel caricamento episodi")
      } finally {
        console.log("[v0] loadEpisodes finally - setting loading to false")
        setEpisodesLoading(false)
      }
    }

    loadEpisodes()
  }, [path, sources, selectedServer, isEnglishServer])

  useEffect(() => {
    async function fetchAniListProgress() {
      try {
        const metaKey = `anizone:meta:${path}`
        const storedMeta = sessionStorage.getItem(metaKey)

        if (!storedMeta) {
          console.log("[v0] No AniList metadata found for progress check")
          return
        }

        const metaData = JSON.parse(storedMeta)
        if (!metaData.anilistId) {
          console.log("[v0] No AniList ID in metadata")
          return
        }

        const { aniListManager } = await import("@/lib/anilist")
        const user = aniListManager.getUser()

        if (!user) {
          console.log("[v0] User not logged into AniList")
          return
        }

        console.log("[v0] Fetching AniList progress for anime:", metaData.anilistId)
        const result = await aniListManager.getMediaListStatus(Number(metaData.anilistId), "ANIME")

        console.log("[v0] AniList progress result:", result)

        if (result.status === "CURRENT") {
          setIsInWatchingList(true)
          setUserProgress(result.progress || 0)
          console.log("[v0] User is watching this anime, progress:", result.progress)
        } else {
          setIsInWatchingList(false)
          setUserProgress(0)
        }
      } catch (error) {
        console.error("[v0] Error fetching AniList progress:", error)
      }
    }

    fetchAniListProgress()
  }, [path])

  useEffect(() => {
    if (episodes.length === 0 || selectedKey !== null) {
      return
    }

    console.log("[v0] Auto-selecting episode - userProgress:", userProgress, "isInWatchingList:", isInWatchingList)

    // If user is watching and has progress, select next unwatched episode
    if (isInWatchingList && userProgress > 0) {
      const nextEpisode = episodes.find((ep) => ep.num === userProgress + 1)
      if (nextEpisode) {
        console.log("[v0] Auto-selecting next episode:", nextEpisode.num)
        setSelectedKey(epKey(nextEpisode))
        return
      }
    }

    // Otherwise, select episode 1 by default
    const firstEpisode = episodes.find((ep) => ep.num === 1)
    if (firstEpisode) {
      console.log("[v0] Auto-selecting episode 1")
      setSelectedKey(epKey(firstEpisode))
    } else if (episodes.length > 0) {
      // Fallback to first available episode
      console.log("[v0] Auto-selecting first available episode:", episodes[0].num)
      setSelectedKey(epKey(episodes[0]))
    }
  }, [episodes, userProgress, isInWatchingList, selectedKey])

  const selectedEpisode = useMemo(
    () => (selectedKey ? (episodes.find((e) => epKey(e) === selectedKey) ?? null) : null),
    [selectedKey, episodes],
  )

  useEffect(() => {
    if (!selectedEpisode) return
    const abort = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      setStreamUrl(null)
      setEmbedUrl(null)
      setEpisodeRefUrl(null)
      setProxyUrl(null)

      const cacheKey = `anizone:stream:${epKey(selectedEpisode)}:${selectedServer}:${selectedResolution}:${isAnimeGG ? `${aggAudioType}:${aggSelectedQuality}` : ""}${isHNime ? `:en:${selectedEnEmbed}` : ""}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.streamUrl) setStreamUrl(parsed.streamUrl)
          if (parsed.embedUrl) setEmbedUrl(parsed.embedUrl)
          if (parsed.proxyUrl) setProxyUrl(parsed.proxyUrl)
          if (parsed.enEmbeds) {
            setEnEmbeds(parsed.enEmbeds)
            if (!selectedEnEmbed && parsed.enEmbeds.length > 0) {
              setSelectedEnEmbed(parsed.enEmbeds[0].name)
            }
          }
          if (parsed.streamUrl || parsed.embedUrl || parsed.proxyUrl) {
            setLoading(false)
            return
          }
        } catch {}
      }

      try {
        console.log("[v0] Loading stream for episode:", selectedEpisode, "server:", selectedServer)

        // Handle HNime (English) server
        if (isHNime) {
          const episodeId = selectedEpisode.unifiedData?.sources?.HNime?.id || selectedEpisode.id
          console.log("[v0] Using HNime for stream - episode ID:", episodeId)

          const hiRes = await fetch(`/api/en/stream?HI=${encodeURIComponent(episodeId)}`, {
            signal: abort.signal,
          })

          if (!hiRes.ok) {
            const errorText = await hiRes.text()
            throw new Error(`HNime stream API failed: ${errorText}`)
          }

          const hiData = await hiRes.json()
          console.log("[v0] HNime stream data:", hiData)

          if (hiData.ok && hiData.embeds && hiData.embeds.length > 0) {
            setEnEmbeds(hiData.embeds)
            const defaultEmbed = selectedEnEmbed
              ? hiData.embeds.find((e: any) => e.name === selectedEnEmbed) || hiData.embeds[0]
              : hiData.embeds[0]
            setSelectedEnEmbed(defaultEmbed.name)
            setEmbedUrl(defaultEmbed.embedUrl)
            setEpisodeRefUrl(selectedEpisode.href)

            localStorage.setItem(cacheKey, JSON.stringify({ embedUrl: defaultEmbed.embedUrl, enEmbeds: hiData.embeds }))
            setLoading(false)
            return
          } else {
            throw new Error(hiData.error || "Failed to get HNime stream")
          }
        }

        const unifiedEp = selectedEpisode.unifiedData
        if (!unifiedEp) {
          throw new Error("No unified data available for this episode")
        }

        if (selectedServer === "Unity" && unifiedEp.sources?.Unity?.id) {
          const episodeId = unifiedEp.sources.Unity.id
          console.log("[v0] Using Unity for stream - episode ID:", episodeId)

          const unityRes = await fetch(`/api/unity-stream?episode_id=${episodeId}`, {
            signal: abort.signal,
          })

          if (!unityRes.ok) {
            const errorText = await unityRes.text()
            throw new Error(`Unity stream API failed: ${errorText}`)
          }

          const unityData = await unityRes.json()
          console.log("[v0] Unity stream data:", unityData)

          if (unityData.ok && unityData.stream_url) {
            const direct = unityData.stream_url
            setStreamUrl(direct)
            setEpisodeRefUrl(selectedEpisode.href)
            setProxyUrl(direct) // Unity MP4 should be playable directly

            localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: direct, proxyUrl: direct }))
            setLoading(false)
            return
          } else {
            throw new Error(unityData.error || "Failed to get Unity stream")
          }
        }

        // Handle AnimeGG (AGG) server
        if (selectedServer === "AnimeGG" && unifiedEp.sources?.AnimeGG?.id) {
          const episodeId = unifiedEp.sources.AnimeGG.id
          console.log("[v0] Using AnimeGG for stream - episode ID:", episodeId, "audio:", aggAudioType, "quality:", aggSelectedQuality)

          const aggParams = new URLSearchParams()
          aggParams.set("AG", episodeId)
          aggParams.set("AG_AUDIO", aggAudioType)
          aggParams.set("AG_RES", aggSelectedQuality)

          const aggRes = await fetch(`/api/stream?${aggParams}`, {
            signal: abort.signal,
          })

          if (!aggRes.ok) {
            const errorText = await aggRes.text()
            throw new Error(`AnimeGG stream API failed: ${errorText}`)
          }

          const aggData = await aggRes.json()
          console.log("[v0] AnimeGG stream data:", aggData)

          if (aggData.ok && aggData.proxyUrl) {
            setStreamUrl(aggData.streamUrl)
            setEpisodeRefUrl(selectedEpisode.href)
            setProxyUrl(aggData.proxyUrl)
            
            // Update available qualities and audio types
            if (aggData.availableQualities) {
              setAggAvailableQualities(aggData.availableQualities)
            }
            setAggHasSub(aggData.hasSub ?? true)
            setAggHasDub(aggData.hasDub ?? false)
            
            // Update selected quality if it changed
            if (aggData.selectedQuality) {
              setAggSelectedQuality(aggData.selectedQuality)
            }

            localStorage.setItem(cacheKey, JSON.stringify({ 
              streamUrl: aggData.streamUrl, 
              proxyUrl: aggData.proxyUrl,
              availableQualities: aggData.availableQualities,
              hasSub: aggData.hasSub,
              hasDub: aggData.hasDub,
              selectedQuality: aggData.selectedQuality
            }))
            setLoading(false)
            return
          } else {
            throw new Error(aggData.error || "Failed to get AnimeGG stream")
          }
        }

        const params = new URLSearchParams()

        if (selectedServer === "AnimeWorld" && unifiedEp.sources.AnimeWorld?.id) {
          params.set("AW", unifiedEp.sources.AnimeWorld.id)
          console.log("[v0] Using AnimeWorld episode ID for direct stream:", unifiedEp.sources.AnimeWorld.id)
        } else if (selectedServer === "AnimeSaturn" && unifiedEp.sources.AnimeSaturn?.id) {
          params.set("AS", unifiedEp.sources.AnimeSaturn.id)
          console.log("[v0] Using AnimeSaturn episode ID for stream:", unifiedEp.sources.AnimeSaturn.id)
        } else if (
          selectedServer === "AnimePahe" &&
          unifiedEp.sources.AnimePahe?.id &&
          unifiedEp.sources.AnimePahe?.animeSession
        ) {
          params.set("AP_ANIME", unifiedEp.sources.AnimePahe.animeSession)
          params.set("AP", unifiedEp.sources.AnimePahe.id)
          params.set("res", selectedResolution)
          console.log(
            "[v0] Using AnimePahe for stream - AP (episode id):",
            unifiedEp.sources.AnimePahe.id,
            "AP_ANIME (animeSession):",
            unifiedEp.sources.AnimePahe.animeSession,
            "resolution:",
            selectedResolution,
          )
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
          throw new Error(`Stream API failed with status ${r.status}: ${errorText}`)
        }

        const streamData = await r.json()
        console.log("[v0] Stream data:", streamData)

        const serverData = streamData[selectedServer]

        if (!serverData || !serverData.available) {
          throw new Error(`${selectedServer} is not available for this episode`)
        }

        if (selectedServer === "AnimeSaturn" && serverData.stream_url) {
          const rawStreamUrl = serverData.stream_url
          // Build proxy URL using our local AnimeSaturn proxy
          const proxied = `/api/animesaturn-proxy?url=${encodeURIComponent(rawStreamUrl)}`
          console.log("[v0] Got AnimeSaturn stream URL:", rawStreamUrl)
          console.log("[v0] Using AnimeSaturn proxy URL:", proxied)
          setStreamUrl(rawStreamUrl)
          setProxyUrl(proxied)
          setEpisodeRefUrl(selectedEpisode.href)

          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: rawStreamUrl, proxyUrl: proxied }))
        } else if (selectedServer === "AnimePahe" && serverData.stream_url) {
          const direct = serverData.stream_url
          console.log("[v0] Got AnimePahe stream URL:", direct)
          setStreamUrl(direct)
          setEpisodeRefUrl(selectedEpisode.href)

          // For AnimePahe, we don't need a proxy - just use the stream URL directly
          setProxyUrl(direct)

          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: direct, proxyUrl: direct }))
        } else if (selectedServer === "AnimeWorld" && serverData.stream_url) {
          const direct = serverData.stream_url
          console.log("[v0] Got AnimeWorld direct stream URL (no proxy):", direct)
          setStreamUrl(direct)
          setEpisodeRefUrl(selectedEpisode.href)

          setProxyUrl(direct)

          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ streamUrl: direct, proxyUrl: direct }))
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
    }

    load()
    return () => abort.abort()
  }, [selectedEpisode, selectedServer, selectedResolution, isAnimeGG, aggAudioType, aggSelectedQuality, isHNime])

  useEffect(() => {
    if (selectedServer !== "AnimePahe" || !selectedEpisode) return

    const unifiedEp = selectedEpisode.unifiedData
    if (!unifiedEp?.sources?.AnimePahe?.id || !unifiedEp?.sources?.AnimePahe?.animeSession) return

    async function testResolutions() {
      const resolutionsToTest = ["1080", "720", "480", "360"]
      const available: string[] = []

      for (const res of resolutionsToTest) {
        try {
          const params = new URLSearchParams()
          params.set("AP_ANIME", unifiedEp.sources.AnimePahe.animeSession)
          params.set("AP", unifiedEp.sources.AnimePahe.id)
          params.set("res", res)

          const apiUrl = `https://aw-au-as-api.vercel.app/api/stream?${params}`
          const r = await fetch(apiUrl, {
            signal: AbortSignal.timeout(5000),
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })

          if (r.ok) {
            const streamData = await r.json()
            if (streamData.AnimePahe?.available && streamData.AnimePahe?.stream_url) {
              available.push(res)
              console.log("[v0] AnimePahe resolution", res, "is available")
            }
          }
        } catch (e) {
          console.log("[v0] AnimePahe resolution", res, "test failed:", e)
        }
      }

      if (available.length > 0) {
        setAvailableResolutions(available)
        // If current resolution is not available, switch to highest available
        if (!available.includes(selectedResolution)) {
          setSelectedResolution(available[0])
        }
      }
    }

    testResolutions()
  }, [selectedServer, selectedEpisode])

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [proxyUrl, selectedServer])

  useEffect(() => {
    if (isEmbedServer) return
    const v = videoRef.current
    if (!v) return
    const onTime = () => sendProgress(v.currentTime)
    const onPause = () => sendProgress(v.currentTime, { immediate: true })
    const onEnded = () => {
      videoEndedRef.current = true
      sendProgress(v.duration || v.currentTime || 0, { immediate: true })
    }
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

  useEffect(() => {
    if (!embedUrl || isAnimePahe || isUnity || isAnimeGG || !selectedEpisode) return
    const iframe = iframeRef.current
    if (!iframe) return

    const animeId = extractAnimeIdFromUrl(path)
    const progressKey = `progress:${animeId}:${selectedEpisode.num}`
    let restoreDone = false

    const savedTime = storageGet<number>(progressKey) || 0

    const saveProgress = (currentTime: number) => {
      storageSet(progressKey, Math.floor(currentTime))
      broadcastProgress(Math.floor(currentTime))
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return
      if (!e.data?.type) return

      console.log("[v0] Saturn message received:", e.data.type, e.data)

      if (e.data.type === "saturn-video-ended") {
        console.log("[v0] Saturn video ended detected! autoNext:", autoNext, "selectedEpisode:", selectedEpisode?.num)

        if (autoUpdateProgress && selectedEpisode) {
          updateAniListProgress(selectedEpisode.num)
        }

        if (!autoNext || !selectedEpisode) {
          console.log("[v0] Saturn auto-next skipped - autoNext:", autoNext, "selectedEpisode:", selectedEpisode)
          return
        }
        const idx = episodes.findIndex((ep) => epKey(ep) === epKey(selectedEpisode))
        console.log("[v0] Saturn auto-next - current index:", idx, "total episodes:", episodes.length)
        if (idx >= 0 && idx + 1 < episodes.length) {
          const next = episodes[idx + 1]
          console.log("[v0] Saturn auto-next - moving to episode:", next.num)
          setSelectedKey(epKey(next))
        } else {
          console.log("[v0] Saturn auto-next - no next episode available")
        }
      }

      // General embed video ended handler for all embed types
      if (e.data.type === "videoEnded") {
        console.log("[v0] Embed video ended detected! autoNext:", autoNext, "selectedEpisode:", selectedEpisode?.num)

        if (autoUpdateProgress && selectedEpisode) {
          updateAniListProgress(selectedEpisode.num)
        }

        if (!autoNext || !selectedEpisode) {
          console.log("[v0] Embed auto-next skipped - autoNext:", autoNext, "selectedEpisode:", selectedEpisode)
          return
        }
        const idx = episodes.findIndex((ep) => epKey(ep) === epKey(selectedEpisode))
        console.log("[v0] Embed auto-next - current index:", idx, "total episodes:", episodes.length)
        if (idx >= 0 && idx + 1 < episodes.length) {
          const next = episodes[idx + 1]
          console.log("[v0] Embed auto-next - moving to episode:", next.num)
          setSelectedKey(epKey(next))
        } else {
          console.log("[v0] Embed auto-next - no next episode available")
        }
      }

      if (e.data.type === "saturn-progress" && typeof e.data.currentTime === "number") {
        saveProgress(e.data.currentTime)
      }
    }

    window.addEventListener("message", handleMessage)

    const sendResume = () => {
      if (savedTime > 0 && !restoreDone && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "resume-video", time: savedTime }, "*")
        restoreDone = true
      }
    }

    sendResume()

    iframe.addEventListener("load", sendResume)

    return () => {
      window.removeEventListener("message", handleMessage)
      iframe.removeEventListener("load", sendResume)
    }
  }, [embedUrl, isAnimePahe, isUnity, isAnimeGG, selectedEpisode, path, autoNext, autoUpdateProgress, episodes])

  const updateAniListProgress = async (episodeNum: number) => {
    try {
      const meta = sessionStorage.getItem(`anizone:meta:${path}`)
      if (!meta) {
        console.log("[v0] No metadata available for AniList update")
        return
      }

      const metaData = JSON.parse(meta)
      if (!metaData.anilistId) {
        console.log("[v0] No AniList ID in metadata")
        return
      }

      const { aniListManager } = await import("@/lib/anilist")
      const user = aniListManager.getUser()

      if (!user) {
        console.log("[v0] User not logged in to AniList")
        return
      }

      // Get current status
      const currentStatus = await aniListManager.getMediaListStatus(Number(metaData.anilistId), "ANIME")

      console.log("[v0] Auto-updating AniList: episode", episodeNum, "for anime", metaData.anilistId)
      console.log("[v0] Current status:", currentStatus)

      // If status is PLANNING, change it to CURRENT
      const newStatus = currentStatus.status === "PLANNING" ? "CURRENT" : currentStatus.status || "CURRENT"

      await aniListManager.updateAnimeEntry(Number(metaData.anilistId), newStatus, episodeNum)

      console.log("[v0] Successfully updated AniList progress")

      setIsInWatchingList(true)
      setUserProgress(episodeNum)

      // Broadcast status change event so QuickListManager can update
      window.dispatchEvent(
        new CustomEvent("anizone:status-updated", {
          detail: { mediaId: metaData.anilistId, status: newStatus, progress: episodeNum },
        }),
      )
    } catch (e) {
      console.error("[v0] Could not auto-update AniList:", e)
    }
  }

  const saveContinueForClick = async (ep: Episode) => {
    try {
      const seriesKey = seriesBaseFromPath(path)
      const seriesPath = seriesKey

      // Check if video ended and user is navigating to next episode
      if (videoEndedRef.current && selectedEpisode && ep.num > selectedEpisode.num) {
        hasNavigatedToNextRef.current = true

        // Update AniList progress if available
        const meta = sessionStorage.getItem(`anizone:meta:${path}`)
        if (meta) {
          try {
            const metaData = JSON.parse(meta)
            if (metaData.anilistId) {
              // Dynamic import to avoid circular dependencies
              const { aniListManager } = await import("@/lib/anilist")
              const user = aniListManager.getUser()

              if (user) {
                console.log(
                  "[v0] Auto-updating AniList: episode",
                  ep.num,
                  "status CURRENT for anime",
                  metaData.anilistId,
                )
                await aniListManager.updateAnimeEntry(Number(metaData.anilistId), "CURRENT", ep.num)
              }
            }
          } catch (e) {
            console.log("[v0] Could not auto-update AniList:", e)
          }
        }
      }

      // Reset flags for new episode
      videoEndedRef.current = false
      hasNavigatedToNextRef.current = false

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

  const onEnd = () => {
    videoEndedRef.current = true

    if (autoUpdateProgress && selectedEpisode) {
      updateAniListProgress(selectedEpisode.num)
    }

    if (!autoNext || !selectedEpisode) return
    const idx = episodes.findIndex((e) => epKey(e) === epKey(selectedEpisode))
    if (idx >= 0 && idx + 1 < episodes.length) {
      const next = episodes[idx + 1]
      setSelectedKey(epKey(next))
    }
  }

  return (
    <div className="w-full space-y-3">
      {nextEpisodeDate && nextEpisodeTime && (
        <EpisodeCountdown nextEpisodeDate={nextEpisodeDate} nextEpisodeTime={nextEpisodeTime} className="text-sm" />
      )}

      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Episodi</div>
          <div className="flex items-center gap-3 flex-wrap">
            {availableServers.length > 1 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="server-select" className="text-xs text-muted-foreground">
                  Server:
                </Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-[100px] h-7 text-xs" id="server-select">
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServers.map((server) => (
                      <SelectItem key={server} value={server} className="text-xs">
                        {serverDisplayNames[server as keyof typeof serverDisplayNames] || server}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAnimePahe && (
              <div className="flex items-center gap-2">
                <Label htmlFor="resolution-select" className="text-xs text-muted-foreground">
                  Qualità:
                </Label>
                <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                  <SelectTrigger className="w-[90px] h-7 text-xs" id="resolution-select">
                    <SelectValue placeholder="Risoluzione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableResolutions.map((res) => (
                      <SelectItem key={res} value={res} className="text-xs">
                        {res}p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isHNime && enEmbeds.length > 1 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="en-embed-select" className="text-xs text-muted-foreground">
                  Server:
                </Label>
                <Select
                  value={selectedEnEmbed}
                  onValueChange={(v) => {
                    setSelectedEnEmbed(v)
                    const embed = enEmbeds.find((e) => e.name === v)
                    if (embed) setEmbedUrl(embed.embedUrl)
                  }}
                >
                  <SelectTrigger className="w-[120px] h-7 text-xs" id="en-embed-select">
                    <SelectValue placeholder="Server" />
                  </SelectTrigger>
                  <SelectContent>
                    {enEmbeds.map((embed) => (
                      <SelectItem key={embed.name} value={embed.name} className="text-xs">
                        {embed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAnimeGG && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="agg-audio-select" className="text-xs text-muted-foreground">
                    Audio:
                  </Label>
                  <Select 
                    value={aggAudioType} 
                    onValueChange={(v) => setAggAudioType(v as "sub" | "dub")}
                    disabled={!aggHasSub && !aggHasDub}
                  >
                    <SelectTrigger className="w-[80px] h-7 text-xs" id="agg-audio-select">
                      <SelectValue placeholder="Audio" />
                    </SelectTrigger>
                    <SelectContent>
                      {aggHasSub && (
                        <SelectItem value="sub" className="text-xs">
                          Sub
                        </SelectItem>
                      )}
                      {aggHasDub && (
                        <SelectItem value="dub" className="text-xs">
                          Dub
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {aggAvailableQualities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="agg-quality-select" className="text-xs text-muted-foreground">
                      Qualità:
                    </Label>
                    <Select value={aggSelectedQuality} onValueChange={setAggSelectedQuality}>
                      <SelectTrigger className="w-[90px] h-7 text-xs" id="agg-quality-select">
                        <SelectValue placeholder="Qualità" />
                      </SelectTrigger>
                      <SelectContent>
                        {aggAvailableQualities.map((quality) => (
                          <SelectItem key={quality} value={quality} className="text-xs">
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch id="auto-next" checked={autoNext} onCheckedChange={setAutoNext} />
              <Label htmlFor="auto-next" className="text-xs text-muted-foreground cursor-pointer">
                Auto-next
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="auto-update" checked={autoUpdateProgress} onCheckedChange={setAutoUpdateProgress} />
              <Label htmlFor="auto-update" className="text-xs text-muted-foreground cursor-pointer">
                Auto-aggiorna
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x pb-1">
          {episodesLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 w-14 rounded-full bg-neutral-800 animate-pulse shrink-0" />
            ))
          ) : episodes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessun episodio trovato.</div>
          ) : (
            episodes.map((e) => {
              const key = epKey(e)
              const active = selectedKey === key
              const isWatched = isInWatchingList && userProgress > 0 && e.num <= userProgress

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
                      : isWatched
                        ? "bg-neutral-300 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-500 opacity-60"
                        : "bg-white text-black dark:bg-neutral-800 dark:text-white/90"
                  }`}
                  aria-pressed={active}
                  title={isWatched ? `Episodio ${e.num} (già visto)` : `Episodio ${e.num}`}
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
        ) : embedUrl && !isAnimePahe && !isUnity && !isAnimeGG ? (
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
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            autoPlay={autoNext}
            onEnded={onEnd}
            src={proxyUrl}
            onError={() => {
              setError("Errore di riproduzione. Riprovo...")
              if (selectedEpisode)
                localStorage.removeItem(
                  `anizone:stream:${epKey(selectedEpisode)}:${selectedServer}:${selectedResolution}:${isAnimeGG ? `${aggAudioType}:${aggSelectedQuality}` : ""}`,
                )
              setProxyUrl(null)
              setTimeout(() => {
                setSelectedKey((k) => (k ? `${k}` : k))
              }, 200)
            }}
          />
        ) : !selectedEpisode ? (
          <div className="text-sm text-neutral-200 p-4 text-center">Caricamento episodio...</div>
        ) : (
          <div className="text-sm text-neutral-200 p-4 text-center">{error || "Caricamento in corso..."}</div>
        )}
      </div>

      {(isEmbedServer || isAnimePahe || isUnity || isAnimeGG || isHNime) && (
        <div className="text-xs text-muted-foreground">
          Stai guardando tramite{" "}
          {serverDisplayNames[selectedServer as keyof typeof serverDisplayNames] || selectedServer}.
          {isAnimePahe && ` Risoluzione: ${selectedResolution}p.`}
          {isAnimeGG && ` Audio: ${aggAudioType === "dub" ? "Dub" : "Sub"}. Qualità: ${aggSelectedQuality}.`}
          {isHNime && selectedEnEmbed && ` ${selectedEnEmbed}.`}
          {(isEmbedServer || isHNime) &&
            " Il controllo della riproduzione e il salvataggio della posizione potrebbero essere limitati."}
        </div>
      )}
    </div>
  )
}
