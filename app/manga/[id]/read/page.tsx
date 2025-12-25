"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  RotateCcw,
  ListIcon,
  BookOpen,
  Menu,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deobfuscateUrl, obfuscateUrl } from "@/lib/utils"
import { SlideOutMenu, type SlideOutMenuHandle } from "@/components/slide-out-menu"

interface MangaReaderProps {
  params: {
    id: string
  }
  searchParams: {
    u?: string // obfuscated URL
    url?: string // legacy URL
    title?: string
    chapter?: string
    chapterIndex?: string // Added chapterIndex to track position in chapter list
  }
}

type Chapter = {
  title: string
  url: string
  date: string
  isNew?: boolean
}

type Volume = {
  name: string
  chapters: Chapter[]
}

function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = "200px" }: IntersectionObserverInit = {},
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry)
  }

  useEffect(() => {
    const node = elementRef?.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || !node) return

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(node)

    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin])

  return entry
}

function LazyImage({
  src,
  alt,
  index,
  onError,
  onLoad,
}: {
  src: string
  alt: string
  index: number
  onError: () => void
  onLoad: () => void
}) {
  const imgRef = useRef<HTMLDivElement>(null)
  const entry = useIntersectionObserver(imgRef, { threshold: 0.1 })
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError()
  }, [onError])

  return (
    <div ref={imgRef} className="text-center flex items-center justify-center">
      {entry?.isIntersecting ? (
        hasError ? (
          <Card className="bg-gray-900 border-gray-700 mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400 mb-4">Errore nel caricamento dell'immagine {index + 1}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setHasError(false)
                  setIsLoaded(false)
                }}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <RotateCcw size={16} className="mr-2" />
                Riprova
              </Button>
            </CardContent>
          </Card>
        ) : (
          <img
            id={`page-${index}`}
            className="page-image img-fluid"
            src={src || "/placeholder.svg"}
            alt={alt}
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "100%",
              display: "block",
              margin: "0 auto",
            }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      ) : (
        <div
          className="w-full bg-gray-800 rounded flex items-center justify-center"
          style={{ aspectRatio: "2/3", minHeight: "400px" }}
        >
          <div className="animate-pulse text-gray-400">Caricamento...</div>
        </div>
      )}
    </div>
  )
}

export default function MangaReader({ params, searchParams }: MangaReaderProps) {
  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<"single" | "list">("list")
  const menuRef = useRef<SlideOutMenuHandle>(null)
  const router = useRouter()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1)
  const [showPrevChapterButton, setShowPrevChapterButton] = useState(true)
  const [showNextChapterButton, setShowNextChapterButton] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startSentinelRef = useRef<HTMLDivElement>(null)
  const endSentinelRef = useRef<HTMLDivElement>(null)

  const chapterUrl = searchParams.u ? deobfuscateUrl(searchParams.u) : searchParams.url

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await fetch(`/api/manga-info?id=${params.id}`)
        if (!response.ok) return
        const data = await response.json()

        const chapters: Chapter[] = []
        if (data.volumes) {
          data.volumes.forEach((volume: Volume) => {
            chapters.push(...volume.chapters)
          })
        }
        setAllChapters(chapters)

        if (chapterUrl) {
          const index = chapters.findIndex((ch) => ch.url === chapterUrl)
          setCurrentChapterIndex(index)
        }
      } catch (err) {
        console.error("[v0] Error fetching chapters:", err)
      }
    }

    fetchChapters()
  }, [params.id, chapterUrl])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const navigateToChapter = (chapter: Chapter) => {
    router.push(
      `/manga/${params.id}/read?u=${obfuscateUrl(chapter.url)}&title=${encodeURIComponent(searchParams.title || "")}&chapter=${encodeURIComponent(chapter.title)}`,
    )
  }

  const goToPrevChapter = () => {
    if (currentChapterIndex < allChapters.length - 1) {
      navigateToChapter(allChapters[currentChapterIndex + 1])
    }
  }

  const goToNextChapter = () => {
    if (currentChapterIndex > 0) {
      navigateToChapter(allChapters[currentChapterIndex - 1])
    }
  }

  const hasPrevChapter = currentChapterIndex < allChapters.length - 1 && currentChapterIndex !== -1
  const hasNextChapter = currentChapterIndex > 0

  useEffect(() => {
    if (!isFullscreen || viewMode !== "list") return

    const startObserver = new IntersectionObserver(
      ([entry]) => {
        setShowPrevChapterButton(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    const endObserver = new IntersectionObserver(
      ([entry]) => {
        setShowNextChapterButton(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    if (startSentinelRef.current) startObserver.observe(startSentinelRef.current)
    if (endSentinelRef.current) endObserver.observe(endSentinelRef.current)

    return () => {
      startObserver.disconnect()
      endObserver.disconnect()
    }
  }, [isFullscreen, viewMode])

  useEffect(() => {
    if (viewMode === "single") {
      setShowPrevChapterButton(currentPage === 0)
      setShowNextChapterButton(currentPage === pages.length - 1)
    }
  }, [currentPage, pages.length, viewMode])

  useEffect(() => {
    const fetchPages = async () => {
      if (!chapterUrl) {
        setError("URL del capitolo mancante")
        setIsLoading(false)
        return
      }

      try {
        const urlObj = new URL(chapterUrl, "https://example.com")
        const isUnified = urlObj.searchParams.get("_unified") === "true"
        const source = urlObj.searchParams.get("_source")

        let fetchUrl: string

        if (isUnified && source) {
          console.log("[v0] Using unified pages API for source:", source)

          if (source === "Comix") {
            const hashId = urlObj.searchParams.get("_hash_id")
            const slug = urlObj.searchParams.get("_slug")
            const chapterId = urlObj.searchParams.get("_chapter_id")
            const chapterNum = urlObj.searchParams.get("_chapter_num")

            fetchUrl = `/api/manga-unified-pages?source=Comix&hash_id=${hashId}&slug=${slug}&chapter_id=${chapterId}&chapter_num=${chapterNum}`
          } else if (source === "World") {
            const chapterUrlParam = urlObj.searchParams.get("_chapter_url")
            fetchUrl = `/api/manga-unified-pages?source=World&chapter_url=${encodeURIComponent(chapterUrlParam || "")}`
          } else {
            throw new Error("Unknown unified source")
          }
        } else {
          // Use old scraping API
          fetchUrl = `/api/manga-pages?url=${encodeURIComponent(chapterUrl)}`
        }

        console.log("[v0] Fetching manga pages from:", fetchUrl)
        const response = await fetch(fetchUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch manga pages: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Received pages data:", data)

        if (!data.pages || data.pages.length === 0) {
          throw new Error("No pages found in response")
        }

        setPages(data.pages || [])
      } catch (err) {
        console.error("[v0] Error fetching pages:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [chapterUrl])

  const handleImageError = (pageIndex: number) => {
    setImageErrors((prev) => new Set(prev).add(pageIndex))
  }

  const handleImageRetry = (pageIndex: number) => {
    setImageErrors((prev) => {
      const newSet = new Set(prev)
      newSet.delete(pageIndex)
      return newSet
    })
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "f" || e.key === "F") {
      e.preventDefault()
      toggleFullscreen()
      return
    }

    if (viewMode === "single") {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        nextPage()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        prevPage()
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, pages.length, viewMode])

  const handleGoBack = () => {
    router.replace(`/manga/${params.id}`)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-4">Caricamento pagine...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || pages.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Errore nel caricamento</h2>
            <p className="text-gray-400 mb-4">Non è stato possibile caricare le pagine del manga.</p>
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft size={16} />
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main ref={containerRef} className="min-h-screen bg-black text-white pb-16">
      <SlideOutMenu ref={menuRef} currentPath={`/manga/${params.id}/read`} hideButton />

      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 border-b border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isFullscreen && (
              <button
                onClick={() => menuRef.current?.open()}
                className="text-white hover:text-primary transition-colors p-1"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="text-white hover:bg-white/10">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="font-semibold text-sm line-clamp-1">{searchParams.title || "Manga Reader"}</h1>
              {viewMode === "single" && (
                <p className="text-xs text-gray-400">
                  {currentPage + 1}/{pages.length}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevChapter}
                  disabled={!hasPrevChapter}
                  className="text-white hover:bg-white/10 disabled:opacity-30"
                  title="Capitolo precedente"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextChapter}
                  disabled={!hasNextChapter}
                  className="text-white hover:bg-white/10 disabled:opacity-30"
                  title="Capitolo successivo"
                >
                  <ChevronRight size={16} />
                </Button>
              </>
            )}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "single" | "list")}>
              <TabsList className="bg-gray-800 border-gray-700">
                <TabsTrigger value="single" className="text-white data-[state=active]:bg-gray-700">
                  <BookOpen size={14} />
                </TabsTrigger>
                <TabsTrigger value="list" className="text-white data-[state=active]:bg-gray-700">
                  <ListIcon size={14} />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
              title={isFullscreen ? "Esci da schermo intero (F)" : "Schermo intero (F)"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </Button>
            {viewMode === "single" && (
              <Badge variant="outline" className="text-white border-white/20">
                {Math.round(((currentPage + 1) / pages.length) * 100)}%
              </Badge>
            )}
          </div>
        </div>
      </header>

      {viewMode === "list" ? (
        <div className="px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div ref={startSentinelRef} className="h-1" />

            {isFullscreen && hasPrevChapter && showPrevChapterButton && (
              <div className="flex justify-center py-4">
                <Button
                  onClick={goToPrevChapter}
                  variant="outline"
                  className="text-white border-white/20 hover:bg-white/10 bg-transparent"
                >
                  <ChevronLeft size={16} className="mr-2" />
                  Capitolo precedente
                </Button>
              </div>
            )}

            {pages.map((pageUrl, index) => (
              <LazyImage
                key={index}
                src={pageUrl || "/placeholder.svg"}
                alt={`Pagina ${index + 1}`}
                index={index}
                onError={() => handleImageError(index)}
                onLoad={() => console.log(`[v0] Successfully loaded image ${index + 1}`)}
              />
            ))}

            <div ref={endSentinelRef} className="h-1" />

            {isFullscreen && hasNextChapter && showNextChapterButton && (
              <div className="flex justify-center py-8">
                <Button
                  onClick={goToNextChapter}
                  variant="outline"
                  size="lg"
                  className="text-white border-white/20 hover:bg-white/10 bg-transparent"
                >
                  Capitolo successivo
                  <ChevronRight size={16} className="ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="pt-4 pb-20">
            <div className="flex items-center justify-center min-h-screen px-4">
              {imageErrors.has(currentPage) ? (
                <Card className="bg-gray-900 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400 mb-4">Errore nel caricamento dell'immagine</p>
                    <Button
                      variant="outline"
                      onClick={() => handleImageRetry(currentPage)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <RotateCcw size={16} className="mr-2" />
                      Riprova
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <img
                  id={`page-${currentPage}`}
                  className="page-image img-fluid"
                  src={pages[currentPage] || "/placeholder.svg"}
                  alt={`Pagina ${currentPage + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: isFullscreen ? "90vh" : "70vh",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                  onError={() => handleImageError(currentPage)}
                  onLoad={() => {
                    console.log(`[v0] Successfully loaded single page image ${currentPage + 1}`)
                  }}
                />
              )}
            </div>

            {isFullscreen && showPrevChapterButton && hasPrevChapter && currentPage === 0 && (
              <div className="fixed top-1/2 left-4 -translate-y-1/2 z-30">
                <Button
                  onClick={goToPrevChapter}
                  variant="outline"
                  size="lg"
                  className="text-white border-white/20 hover:bg-white/10 bg-black/50"
                >
                  <ChevronLeft size={20} className="mr-2" />
                  Capitolo precedente
                </Button>
              </div>
            )}

            {isFullscreen && showNextChapterButton && hasNextChapter && currentPage === pages.length - 1 && (
              <div className="fixed top-1/2 right-4 -translate-y-1/2 z-30">
                <Button
                  onClick={goToNextChapter}
                  variant="outline"
                  size="lg"
                  className="text-white border-white/20 hover:bg-white/10 bg-black/50"
                >
                  Capitolo successivo
                  <ChevronRight size={20} className="ml-2" />
                </Button>
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur z-20 border-t border-gray-800">
            <div className="px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 0}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                <ArrowLeft size={16} className="mr-1" />
                Precedente
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {currentPage + 1} / {pages.length}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
                className="text-white hover:bg-white/10 disabled:opacity-50"
              >
                Successiva
                <ArrowLeft size={16} className="ml-1 rotate-180" />
              </Button>
            </div>
          </div>

          <div className="fixed inset-0 flex pt-16 pb-20 pointer-events-none z-10">
            <div className="flex-1 cursor-pointer pointer-events-auto" onClick={prevPage} />
            <div className="flex-1 cursor-pointer pointer-events-auto" onClick={nextPage} />
          </div>
        </>
      )}
    </main>
  )
}
