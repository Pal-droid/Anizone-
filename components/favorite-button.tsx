"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { aniListManager } from "@/lib/anilist"
import { useAniList } from "@/contexts/anilist-context"

interface FavoriteButtonProps {
  mediaId?: number
  itemTitle: string
  itemPath?: string
  className?: string
  size?: "sm" | "md" | "lg"
  initialIsFavorite?: boolean
  onToggle?: () => void | Promise<void> // Added callback for when favorite is toggled
}

export function FavoriteButton({
  mediaId,
  itemTitle,
  itemPath,
  className,
  size = "md",
  initialIsFavorite = false,
  onToggle,
}: FavoriteButtonProps) {
  const { user } = useAniList()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [loading, setLoading] = useState(false)
  const [resolvedMediaId, setResolvedMediaId] = useState<number | null>(mediaId || null)

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  useEffect(() => {
    setIsFavorite(initialIsFavorite)
  }, [initialIsFavorite])

  useEffect(() => {
    if (!resolvedMediaId && user && itemPath) {
      // Try to get mediaId from sessionStorage
      const metaKey = `anizone:meta:${itemPath}`
      const storedMeta = sessionStorage.getItem(metaKey)
      if (storedMeta) {
        try {
          const parsed = JSON.parse(storedMeta)
          if (parsed.anilistId) {
            setResolvedMediaId(parsed.anilistId)
            return
          }
        } catch (e) {
          console.error("Error parsing stored meta:", e)
        }
      }

      // Search by title
      searchAniListMedia()
    }
  }, [user, itemTitle, itemPath, resolvedMediaId])

  const searchAniListMedia = async () => {
    try {
      const query = `
        query ($search: String) {
          Media(search: $search) {
            id
          }
        }
      `

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { search: itemTitle },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data?.Media?.id) {
          setResolvedMediaId(data.data.Media.id)
        }
      }
    } catch (error) {
      console.error("Failed to search AniList media:", error)
    }
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user || !resolvedMediaId) return

    setLoading(true)
    try {
      const success = await aniListManager.toggleFavorite(resolvedMediaId, !isFavorite)
      if (success) {
        setIsFavorite(!isFavorite)
        if (onToggle) {
          await onToggle()
        }
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={cn(
        sizeClasses[size],
        "rounded-full flex items-center justify-center",
        "bg-background/90 backdrop-blur-sm border border-border",
        "hover:scale-110 active:scale-95 transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-500",
        className,
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart size={iconSizes[size]} className={isFavorite ? "fill-current" : ""} />
    </button>
  )
}
