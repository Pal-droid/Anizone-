"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SlideOutMenu, type SlideOutMenuHandle } from "@/components/slide-out-menu"
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Menu,
  Loader2,
} from "lucide-react"

export default function MangaReaderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const menuRef = useRef<SlideOutMenuHandle>(null)

  const [pages, setPages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"single" | "double">("single")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPrevChapterButton, setShowPrevChapterButton] = useState(false)
  const [showNextChapterButton, setShowNextChapterButton] = useState(false)

  const title = searchParams.get("title") || "Manga"
  const chapter = searchParams.get("chapter") || "Chapter"

  const startSentinelRef = useRef<HTMLDivElement>(null)
  const endSentinelRef = useRef<HTMLDivElement>(null)

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/manga")
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "single" ? "double" : "single")
  }

  const goToPage = (page: number) => {
    if (page >= 0 && page < pages.length) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      goToPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1)
    }
  }

  useEffect(() => {
    const fetchPages = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const isUnified = urlParams.get("_unified") === "true"
      const source = urlParams.get("_source")

      if (!isUnified || !source) {
        setError("Parametri di lettura mancanti")
        setIsLoading(false)
        return
      }

      try {
        let fetchUrl: string

        if (source === "Comix") {
          const hashId = urlParams.get("_hash_id")
          const slug = urlParams.get("_slug")
          const chapterUrl = urlParams.get("_chapter_url")

          if (!hashId || !slug || !chapterUrl) {
            throw new Error("Parametri Comix mancanti")
          }

          // Extract chapter ID and number from URL
          const urlParts = chapterUrl.split("/")
          const chapterIndex = urlParts.indexOf("chapter")
          const chapterId = chapterIndex !== -1 && urlParts[chapterIndex + 1] ? urlParts[chapterIndex + 1] : "1"
          const chapterNum = urlParams.get("_chapter_num") || "1"

          fetchUrl = `/api/manga-pages-new?source=Comix&comix_hash_id=${hashId}&comix_slug=${slug}&chapter_id=${chapterId}&chapter_num=${chapterNum}`
        } else if (source === "World") {
          const chapterUrl = urlParams.get("_chapter_url")
          if (!chapterUrl) {
            throw new Error("URL capitolo World mancante")
          }
          fetchUrl = `/api/manga-pages-new?source=World&chapter_url=${encodeURIComponent(chapterUrl)}`
        } else {
          throw new Error("Fonte non supportata")
        }

        console.log("[v0] Fetching manga pages from:", fetchUrl)
        const response = await fetch(fetchUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch manga pages: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Received pages data:", data)

        if (data.pages && Array.isArray(data.pages)) {
          setPages(data.pages)
          setCurrentPage(0)
        } else {
          throw new Error("Invalid pages data received")
        }
      } catch (err) {
        console.error("[v0] Error fetching manga pages:", err)
        setError(err instanceof Error ? err.message : "Failed to load manga pages")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault()
          goToNextPage()
          break
        case "ArrowLeft":
          e.preventDefault()
          goToPrevPage()
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "m":
          e.preventDefault()
          toggleViewMode()
          break
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("keydown", handleKeyPress)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("keydown", handleKeyPress)
    }
  }, [currentPage, pages.length])

  useEffect(() => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento pagine...</p>
        </div>
      </div>
    )
  }

  if (error || pages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Errore nel caricamento</h2>
          <p className="text-muted-foreground mb-4">{error || "Nessuna pagina trovata"}</p>
          <Button onClick={handleGoBack}>
            <ArrowLeft size={16} className="mr-2" />
            Torna indietro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? "overflow-hidden" : ""}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 bg-background/95 backdrop-blur border-b ${isFullscreen ? "hidden" : ""}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => menuRef.current?.open()}
              className="hover:text-primary transition-colors p-1"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft size={16} className="mr-2" />
              Indietro
            </Button>
            <div className="hidden sm:block">
              <h1 className="font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">{chapter}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleViewMode}>
              {viewMode === "single" ? "Doppia" : "Singola"}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Title */}
      <div className="sm:hidden px-4 py-2 border-b bg-background/95 backdrop-blur">
        <h1 className="font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{chapter}</p>
      </div>

      {/* Reading Area */}
      <main className="relative">
        {/* Start Sentinel */}
        <div ref={startSentinelRef} className="absolute top-0 left-0 w-px h-px" />

        {/* Pages */}
        <div className="flex flex-col items-center py-4">
          {viewMode === "single" ? (
            // Single page view
            pages.map((page, index) => (
              <div
                key={index}
                className={`max-w-full ${index === currentPage ? "block" : "hidden"}`}
              >
                <img
                  src={page}
                  alt={`Page ${index + 1}`}
                  className="max-w-full h-auto mx-auto"
                  loading="lazy"
                />
              </div>
            ))
          ) : (
            // Double page view
            Array.from({ length: Math.ceil(pages.length / 2) }).map((_, index) => (
              <div
                key={index}
                className={`flex justify-center gap-2 max-w-7xl mx-auto ${index === Math.floor(currentPage / 2) ? "block" : "hidden"}`}
              >
                <img
                  src={pages[index * 2]}
                  alt={`Page ${index * 2 + 1}`}
                  className="max-w-[49%] h-auto"
                  loading="lazy"
                />
                {pages[index * 2 + 1] && (
                  <img
                    src={pages[index * 2 + 1]}
                    alt={`Page ${index * 2 + 2}`}
                    className="max-w-[49%] h-auto"
                    loading="lazy"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* End Sentinel */}
        <div ref={endSentinelRef} className="absolute bottom-0 left-0 w-px h-px" />
      </main>

      {/* Navigation Controls */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur border rounded-full px-4 py-2 flex items-center gap-4 z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {currentPage + 1} / {pages.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage === pages.length - 1}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Page Navigation Areas */}
      <div
        className="fixed top-0 left-0 w-1/2 h-full cursor-pointer z-30"
        onClick={goToPrevPage}
      />
      <div
        className="fixed top-0 right-0 w-1/2 h-full cursor-pointer z-30"
        onClick={goToNextPage}
      />

      {/* SlideOutMenu */}
      <SlideOutMenu ref={menuRef} />
    </div>
  )
}
