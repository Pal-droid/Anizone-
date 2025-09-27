"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Play, Check, Pause, X, RotateCcw, BookOpen } from "lucide-react"
import { authManager } from "@/lib/auth"
import { LoginDialog } from "./login-dialog"

interface QuickListManagerProps {
  itemId: string
  itemTitle: string
  itemImage?: string
  type: "anime" | "manga"
  itemPath?: string
}

const ANIME_LIST_CONFIG = {
  da_guardare: { label: "Da guardare", icon: Plus, color: "bg-blue-500 hover:bg-blue-600" },
  in_corso: { label: "In corso", icon: Play, color: "bg-green-500 hover:bg-green-600" },
  completati: { label: "Completati", icon: Check, color: "bg-purple-500 hover:bg-purple-600" },
  in_pausa: { label: "In pausa", icon: Pause, color: "bg-yellow-500 hover:bg-yellow-600" },
  abbandonati: { label: "Abbandonati", icon: X, color: "bg-red-500 hover:bg-red-600" },
  in_revisione: { label: "In revisione", icon: RotateCcw, color: "bg-indigo-500 hover:bg-indigo-600" },
}

const MANGA_LIST_CONFIG = {
  da_leggere: { label: "Da leggere", icon: Plus, color: "bg-blue-500 hover:bg-blue-600" },
  in_corso: { label: "In corso", icon: Play, color: "bg-green-500 hover:bg-green-600" },
  completati: { label: "Completati", icon: Check, color: "bg-purple-500 hover:bg-purple-600" },
  in_pausa: { label: "In pausa", icon: Pause, color: "bg-yellow-500 hover:bg-yellow-600" },
  abbandonati: { label: "Abbandonati", icon: X, color: "bg-red-500 hover:bg-red-600" },
  in_revisione: { label: "In revisione", icon: RotateCcw, color: "bg-indigo-500 hover:bg-indigo-600" },
}

export function QuickListManager({ itemId, itemTitle, itemImage, type, itemPath }: QuickListManagerProps) {
  const [user, setUser] = useState(null)
  const [lists, setLists] = useState(null)
  const [currentList, setCurrentList] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showEpisodeInput, setShowEpisodeInput] = useState(false)
  const [episodeProgress, setEpisodeProgress] = useState("")
  const [showChapterInput, setShowChapterInput] = useState(false)
  const [chapterProgress, setChapterProgress] = useState("")

  const LIST_CONFIG = type === "anime" ? ANIME_LIST_CONFIG : MANGA_LIST_CONFIG

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setUser)
    const currentUser = authManager.getUser()
    setUser(currentUser)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      loadLists()
    } else {
      setLists(null)
      setCurrentList(null)
    }
  }, [user, type])

  useEffect(() => {
    if (lists) {
      for (const [listKey, items] of Object.entries(lists)) {
        if (Array.isArray(items) && items.includes(itemId)) {
          setCurrentList(listKey)
          return
        }
      }
      setCurrentList(null)
    }
  }, [lists, itemId])

  const loadLists = async () => {
    setLoading(true)
    try {
      const userLists = type === "anime" ? await authManager.getAnimeLists() : await authManager.getMangaLists()
      setLists(userLists)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updateList = async (targetList) => {
    if (!lists || !user) return
    if (type === "anime" && targetList === "in_corso" && currentList !== "in_corso") {
      setShowEpisodeInput(true)
      return
    }
    if (type === "manga" && targetList === "in_corso" && currentList !== "in_corso") {
      setShowChapterInput(true)
      return
    }
    await performListUpdate(targetList)
  }

  const performListUpdate = async (targetList, episode = null, chapter = null) => {
    setLoading(true)
    try {
      const newLists = { ...lists }
      if (currentList && newLists[currentList]) {
        newLists[currentList] = newLists[currentList].filter((id) => id !== itemId)
      }

      if (targetList !== currentList) {
        if (!newLists[targetList]) newLists[targetList] = []
        newLists[targetList].push(itemId)
        setCurrentList(targetList)
      } else {
        setCurrentList(null)
      }

      const success =
        type === "anime" ? await authManager.updateAnimeLists(newLists) : await authManager.updateMangaLists(newLists)
      if (success) setLists(newLists)
      else setCurrentList(currentList)
    } catch (error) {
      console.error(error)
      setCurrentList(currentList)
    } finally {
      setLoading(false)
      setShowEpisodeInput(false)
      setShowChapterInput(false)
      setEpisodeProgress("")
      setChapterProgress("")
    }
  }

  const handleEpisodeSubmit = () => {
    if (episodeProgress.trim()) performListUpdate("in_corso", episodeProgress.trim())
    else performListUpdate("in_corso")
  }

  const handleEpisodeCancel = () => {
    setShowEpisodeInput(false)
    setEpisodeProgress("")
  }

  const handleChapterSubmit = () => {
    if (chapterProgress.trim()) performListUpdate("in_corso", null, chapterProgress.trim())
    else performListUpdate("in_corso", null, "1")
  }

  const handleChapterCancel = () => {
    setShowChapterInput(false)
    setChapterProgress("")
  }

  // LOGIN BUTTON (centered, single line)
  if (!user) {
    return (
      <>
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogin(true)}
            className="flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <BookOpen className="h-4 w-4" />
            <span>Accedi per aggiungere alle liste</span>
          </Button>
        </div>
        <LoginDialog isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </>
    )
  }

  // LOADING PLACEHOLDER
  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  // EPISODE INPUT
  if (showEpisodeInput) {
    return (
      <div className="flex flex-col gap-2 p-3 border rounded-lg bg-background">
        <p className="text-sm font-medium">Episodio attuale:</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Es. 5"
            value={episodeProgress}
            onChange={(e) => setEpisodeProgress(e.target.value)}
            className="w-20"
            min="1"
          />
          <Button size="sm" onClick={handleEpisodeSubmit} className="bg-green-500 hover:bg-green-600">
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={handleEpisodeCancel}>
            Annulla
          </Button>
        </div>
      </div>
    )
  }

  // CHAPTER INPUT
  if (showChapterInput) {
    return (
      <div className="flex flex-col gap-2 p-3 border rounded-lg bg-background">
        <p className="text-sm font-medium">Capitolo attuale:</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Es. 15"
            value={chapterProgress}
            onChange={(e) => setChapterProgress(e.target.value)}
            className="w-20"
            min="1"
          />
          <Button size="sm" onClick={handleChapterSubmit} className="bg-green-500 hover:bg-green-600">
            Salva
          </Button>
          <Button size="sm" variant="outline" onClick={handleChapterCancel}>
            Annulla
          </Button>
        </div>
      </div>
    )
  }

  // RENDER USER'S LIST BUTTONS
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(LIST_CONFIG).map(([listKey, config]) => {
        const Icon = config.icon
        const isActive = currentList === listKey

        return (
          <Button
            key={listKey}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => updateList(listKey)}
            className={`gap-2 ${isActive ? config.color : ""}`}
            disabled={loading}
          >
            <Icon className="h-4 w-4" />
            {isActive && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                ✓
              </Badge>
            )}
            <span className="hidden sm:inline">{config.label}</span>
          </Button>
        )
      })}
    </div>
  )
}