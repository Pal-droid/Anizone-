"use client"

import Link from "next/link"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Suspense } from "react"
import { MangaSearchClient } from "@/components/manga-search-client"

interface MangaResult {
  title: string
  url: string
  image: string
  type: string
  status: string
  author: string
  artist: string
  genres: string[]
  story: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

function LoadingState() {
  const SkeletonCard = () => (
    <div className="space-y-3">
      <div className="aspect-[2/3] skeleton rounded-2xl" />
      <div className="space-y-2 px-1">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default function MangaSearchPage() {
  return (
    <main className="min-h-screen">
      <SlideOutMenu currentPath="/search-manga" />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <Suspense fallback={<LoadingState />}>
        <MangaSearchClient />
      </Suspense>
    </main>
  )
}
