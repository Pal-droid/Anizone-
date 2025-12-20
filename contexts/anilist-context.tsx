"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { aniListManager, type AniListUser } from "@/lib/anilist"
import { useSearchParams } from "next/navigation"

interface AniListContextType {
  user: AniListUser | null
  isLoading: boolean
  login: () => void
  logout: () => void
  refreshAuth: () => void
}

const AniListContext = createContext<AniListContextType | undefined>(undefined)

export function AniListProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AniListUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()

  const refreshAuth = () => {
    const currentUser = aniListManager.getUser()
    setUser(currentUser)
    setIsLoading(false)
  }

  useEffect(() => {
    // Check for OAuth callback code
    const code = searchParams.get("code")
    if (code) {
      setIsLoading(true)
      aniListManager
        .handleCallback(code)
        .then((result) => {
          if (result.success) {
            // Remove code from URL
            window.history.replaceState({}, document.title, window.location.pathname)
            refreshAuth()
          } else {
            console.error("[v0] OAuth callback failed:", result.error)
            setIsLoading(false)
          }
        })
        .catch((error) => {
          console.error("[v0] OAuth callback error:", error)
          setIsLoading(false)
        })
    } else {
      // Initial auth check
      refreshAuth()
    }

    // Subscribe to auth changes
    const unsubscribe = aniListManager.subscribe((newUser) => {
      console.log("[v0] AniList auth state changed:", newUser?.name || "logged out")
      setUser(newUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [searchParams])

  const login = () => {
    aniListManager.login()
  }

  const logout = () => {
    aniListManager.logout()
    refreshAuth()
  }

  return (
    <AniListContext.Provider value={{ user, isLoading, login, logout, refreshAuth }}>
      {children}
    </AniListContext.Provider>
  )
}

export function useAniList() {
  const context = useContext(AniListContext)
  if (context === undefined) {
    throw new Error("useAniList must be used within an AniListProvider")
  }
  return context
}
