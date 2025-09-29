"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { obfuscateUrl } from "@/lib/obfuscate"

interface OngoingItem {
  id: string
  title: string
  image: string
  episodeId: string
}

export function ContinueWatching() {
  const [ongoingList, setOngoingList] = useState<OngoingItem[]>([])
  const [episodes, setEpisodes] = useState<Record<string, any[]>>({})
  const [sources, setSources] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // Track which anime IDs we’ve already fetched
  const fetchedIdsRef = useRef<Set<string>>(new Set())

  // Fetch ongoing list once
  useEffect(() => {
    const fetchOngoingList = async () => {
      try {
        const res = await fetch("/api/user/ongoing-list")
        if (!res.ok) throw new Error("Failed to fetch ongoing list")
        const data = await res.json()
        setOngoingList(data.ongoing || [])
      } catch (err) {
        console.error("[ContinueWatching] Failed to fetch ongoing list:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOngoingList()
  }, [])

  // Fetch episodes for each item (without spamming backend)
  useEffect(() => {
    if (!ongoingList.length) return

    const fetchEpisodes = async (animeId: string) => {
      if (fetchedIdsRef.current.has(animeId)) return
      fetchedIdsRef.current.add(animeId)

      try {
        const res = await fetch(`/api/episodes?AW=${encodeURIComponent(animeId)}`)
        if (!res.ok) throw new Error("Failed to fetch episodes")
        const data = await res.json()
        setEpisodes((prev) => ({
          ...prev,
          [animeId]: data.episodes || []
        }))
        setSources((prev) => ({
          ...prev,
          [animeId]: data.sources || []
        }))
      } catch (err) {
        console.error("[ContinueWatching] Failed to fetch episodes:", err)
      }
    }

    ongoingList.forEach((item) => {
      fetchEpisodes(item.id)
    })
  }, [ongoingList])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Continue Watching</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!ongoingList.length) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Continue Watching</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {ongoingList.map((item) => {
          const episodeData = episodes[item.id] || []
          const currentEpisode = episodeData.find((ep: any) => ep.id === item.episodeId)

          return (
            <Link
              key={item.id}
              href={`/watch?p=${obfuscateUrl(item.id)}&e=${item.episodeId}`}
              onClick={() => {
                if (sources[item.id]) {
                  try {
                    sessionStorage.setItem(`anizone:sources:${item.id}`, JSON.stringify(sources[item.id]))
                    console.log("[ContinueWatching] Stored sources for:", item.id)
                  } catch (error) {
                    console.error("[ContinueWatching] Failed to store sources:", error)
                  }
                }
              }}
              className="block"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md">
                <Image
                  src={item.image || "/placeholder.png"}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                  <p className="truncate">{item.title}</p>
                  {currentEpisode && <p className="text-gray-300">Ep {currentEpisode.number}</p>}
                </div>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}