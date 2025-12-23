"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, Suspense } from "react"
import { aniListManager, type AniListUser } from "@/lib/anilist"

interface AniListContextType {
  user: AniListUser | null
  isLoading: boolean
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AniListContext = createContext<AniListContextType | undefined>(undefined)

function AniListProviderInternal({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AniListUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = async () => {
    console.log("[v0] Checking authentication status from server")
    await aniListManager.checkAuth()
    const currentUser = aniListManager.getUser()
    console.log("[v0] Current user after check:", currentUser?.name || "none")
    setUser(currentUser)
    setIsLoading(false)
  }

  useEffect(() => {
    // Initial auth check from server
    refreshAuth()

    // Subscribe to auth changes
    const unsubscribe = aniListManager.subscribe((newUser) => {
      console.log("[v0] AniList auth state changed:", newUser?.name || "logged out")
      setUser(newUser)
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const loginWithToken = async (token: string) => {
    console.log("[v0] Initiating token login")
    const result = await aniListManager.loginWithToken(token)
    if (result.success) {
      await refreshAuth()
    }
    return result
  }

  const logout = async () => {
    console.log("[v0] Logging out")
    await aniListManager.logout()
    await refreshAuth()
  }

  return (
    <AniListContext.Provider value={{ user, isLoading, loginWithToken, logout, refreshAuth }}>
      {children}
    </AniListContext.Provider>
  )
}

export function AniListProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AniListProviderInternal>{children}</AniListProviderInternal>
    </Suspense>
  )
}

export function useAniList() {
  const context = useContext(AniListContext)
  if (context === undefined) {
    throw new Error("useAniList must be used within an AniListProvider")
  }
  return context
}
