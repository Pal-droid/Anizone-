"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, obfuscateUrl } from "@/lib/utils"
import Link from "next/link"
import { FavoriteButton } from "@/components/favorite-button"
import { ListEditButton } from "@/components/list-edit-button"
import { useState } from "react"

type Source = {
  name: string
  url: string
  id: string
}

type Props = {
  title: string
  href: string
  image: string
  isDub?: boolean
  dubLanguage?: "it" | "en" | "ko" | "it/en" | "it/ko" | "en/ko" | "it/en/ko"
  compactSources?: boolean
  className?: string
  sources?: Source[]
  has_multi_servers?: boolean
  isEnglishServer?: boolean
}

function FlagIcon({ code }: { code: "it" | "gb" | "kr" }) {
  const src =
    code === "it"
      ? "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ee-1f1f9.svg"
      : code === "gb"
      ? "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ec-1f1e7.svg"
      : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1f0-1f1f7.svg"

  return <img src={src || "/placeholder.svg"} alt={code.toUpperCase()} className="w-3.5 h-3.5" loading="lazy" />
}

function MergedFlags() {
  return (
    <span className="relative inline-block w-5 h-3.5">
      <span className="absolute left-0 top-0">
        <FlagIcon code="it" />
      </span>
      <span className="absolute left-2 top-0">
        <FlagIcon code="gb" />
      </span>
    </span>
  )
}

function DubFlags({ dubLanguage }: { dubLanguage: string }) {
  // Parse the language string and get unique languages
  const languages = dubLanguage.split('/').filter(Boolean)
  
  // Map language codes to flag codes
  const flagMap: Record<string, "it" | "gb" | "kr"> = {
    "it": "it",
    "en": "gb", 
    "ko": "kr"
  }
  
  const flags = languages.map(lang => flagMap[lang]).filter(Boolean)
  
  if (flags.length === 0) return null
  
  if (flags.length === 1) {
    return <FlagIcon code={flags[0]} />
  }
  
  // For multiple flags, create a merged display
  return (
    <span className="relative inline-block" style={{ width: `${flags.length * 12 + (flags.length - 1) * 2}px`, height: "14px" }}>
      {flags.map((flag, index) => (
        <span 
          key={flag} 
          className="absolute top-0" 
          style={{ left: `${index * 14}px` }}
        >
          <FlagIcon code={flag} />
        </span>
      ))}
    </span>
  )
}

function getSourceIconUrl(name: string) {
  if (name === "AnimeWorld") return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animeworld.ac&size=48"
  if (name === "AnimeSaturn") return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animesaturn.cx&size=48"
  if (name === "AnimePahe") return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animepahe.si&size=48"
  if (name === "AnimeGG") return "https://raw.githubusercontent.com/Pal-droid/Seanime-Providers/refs/heads/main/public/animegg.png"
  if (name === "HNime") return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://hianime.to&size=48"
  return null
}

export function AnimeCard({ title, href, image, isDub, dubLanguage, compactSources, className, sources, has_multi_servers, isEnglishServer }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const showDubBadge = isDub === true || !!dubLanguage
  const path = (() => {
    if (sources && sources.length > 0) {
      // English server: use HNime source ID
      const hnSource = sources.find((s) => s.name === "HNime")
      if (hnSource?.id) {
        return `/en/${hnSource.id}`
      }
      const awSource = sources.find((s) => s.name === "AnimeWorld")
      if (awSource?.id) {
        // Keep the ID as-is, including trailing hyphens which are part of valid AnimeWorld IDs
        return `/play/${awSource.id}`
      }
    }

    try {
      const u = new URL(href, "https://dummy.local")
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      if (u.pathname && u.pathname !== "/") {
        return u.pathname
      }
    } catch {
      const parts = href.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "play") {
        return `/${parts[0]}/${parts[1]}`
      }
      if (parts.length > 0) {
        return `/play/${parts[parts.length - 1]}`
      }
    }

    return href && href !== "/" ? (href.startsWith("/") ? href : `/${href}`) : "/play/unknown"
  })()

  const hasAnimeWorld = sources?.some((s) => s.name === "AnimeWorld")
  const hasAnimeSaturn = sources?.some((s) => s.name === "AnimeSaturn")
  const hasAnimePahe = sources?.some((s) => s.name === "AnimePahe")
  const hasAnimeGG = sources?.some((s) => s.name === "AnimeGG")
  const showBadges = sources && sources.length > 0 && (hasAnimeWorld || hasAnimeSaturn || hasAnimePahe || hasAnimeGG)

  const compactBadgeSources = sources && sources.length > 0 ? sources.slice(0, 2) : []
  const remainingSourcesCount = sources && sources.length > 2 ? sources.length - 2 : 0

  const isAnimePaheImage = image.includes("animepahe.si") || image.includes("animepahe.com")
  const displayImage = isAnimePaheImage ? `/api/animepahe-image-proxy?url=${encodeURIComponent(image)}` : image

  const handleClick = () => {
    if (sources && sources.length > 0) {
      try {
        const normalizedSources = sources.map((s) => {
          if (s.name === "AnimeWorld" && s.id) {
            return {
              ...s,
              url: s.url || `https://www.animeworld.ac/play/${s.id}`,
            }
          }
          return s
        })

        const storageKey = `anizone:sources:${path}`
        console.log("[v0] AnimeCard storing sources with key:", storageKey, "sources:", normalizedSources)
        sessionStorage.setItem(storageKey, JSON.stringify(normalizedSources))

        // Store English server flag and title
        if (isEnglishServer) {
          sessionStorage.setItem(`anizone:isEnglish:${path}`, "true")
          sessionStorage.setItem(`anizone:title:${path}`, title)
        } else {
          sessionStorage.removeItem(`anizone:isEnglish:${path}`)
        }
      } catch (e) {
        console.error("Failed to store sources:", e)
      }
    } else {
      try {
        const animeId = path.split("/").pop() || ""
        if (animeId && animeId !== "unknown") {
          const defaultSources = [
            {
              name: "AnimeWorld",
              url: `https://www.animeworld.ac${path}`,
              id: animeId,
            },
          ]
          const storageKey = `anizone:sources:${path}`
          console.log("[v0] AnimeCard creating default sources with key:", storageKey, "sources:", defaultSources)
          sessionStorage.setItem(storageKey, JSON.stringify(defaultSources))
        }
      } catch (e) {
        console.error("Failed to store default sources:", e)
      }
    }
  }

  const obfuscatedPath = obfuscateUrl(path)

  return (
    <Link
      href={`/watch?p=${obfuscatedPath}`}
      className={cn("block", className)}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          "group cursor-pointer h-full overflow-hidden",
          "bg-card border-0 rounded-2xl",
          "shadow-sm hover:shadow-lg transition-all duration-300",
          "card-interactive",
        )}
      >
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative aspect-[2/3] overflow-hidden rounded-t-2xl bg-muted">
            <img
              src={displayImage || "/placeholder.svg?height=450&width=300&query=poster%20anime%20cover"}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {compactSources ? (
              sources && sources.length > 0 ? (
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {compactBadgeSources.map((s) => {
                    const iconUrl = getSourceIconUrl(s.name)
                    return (
                      <div key={s.name} className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                        {iconUrl ? (
                          <img src={iconUrl || "/placeholder.svg"} alt={s.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full rounded flex items-center justify-center text-[10px] font-semibold text-foreground">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {remainingSourcesCount > 0 && (
                    <div className="w-7 h-7 rounded-full bg-background/90 shadow-lg backdrop-blur-sm flex items-center justify-center text-[10px] font-semibold text-foreground">
                      +{remainingSourcesCount}
                    </div>
                  )}
                </div>
              ) : null
            ) : (
              showBadges && (
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {hasAnimeWorld && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                      <img
                        src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animeworld.ac&size=48"
                        alt="AnimeWorld"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  {hasAnimeSaturn && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                      <img
                        src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animesaturn.cx&size=48"
                        alt="AnimeSaturn"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  {hasAnimePahe && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                      <img
                        src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://animepahe.si&size=48"
                        alt="AnimePahe"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  {hasAnimeGG && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                      <img
                        src="https://raw.githubusercontent.com/Pal-droid/Seanime-Providers/refs/heads/main/public/animegg.png"
                        alt="AnimeGG"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              )
            )}

            {showDubBadge && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-lg shadow-lg">
                  <span className="inline-flex items-center gap-1">
                    {dubLanguage && <DubFlags dubLanguage={dubLanguage} />}
                    <span>DUB</span>
                  </span>
                </Badge>
              </div>
            )}
          </div>

          <div className="p-3 flex-1 flex flex-col min-h-[72px]">
            <h3 className="font-medium text-sm leading-snug text-foreground flex-1">
              <span className="line-clamp-2 break-words">{title}</span>
            </h3>
            {sources && sources.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1.5">{sources.length} fonti disponibili</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
