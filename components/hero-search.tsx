"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { obfuscateId } from "@/lib/utils"

export function HeroSearch() {
  const [query, setQuery] = useState("")
  const [contentType, setContentType] = useState<"anime" | "manga">("anime")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    if (contentType === "anime") {
      // Directly go to the watch page
      router.push(`/watch/${obfuscateId(query.trim())}`)
    } else {
      // Go to the manga search page
      router.push(`/search?keyword=${encodeURIComponent(query.trim())}&tab=manga`)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Es. Naruto"
          className="flex-1 px-4 py-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded">
          Cerca
        </button>
      </form>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setContentType("anime")}
          className={`px-4 py-2 rounded ${contentType === "anime" ? "bg-primary text-white" : "border"}`}
        >
          Anime
        </button>
        <button
          type="button"
          onClick={() => setContentType("manga")}
          className={`px-4 py-2 rounded ${contentType === "manga" ? "bg-primary text-white" : "border"}`}
        >
          Manga
        </button>
      </div>
    </div>
  )
}

export default HeroSearch