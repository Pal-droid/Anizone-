"use client"

const API_BASE = "https://stale-nananne-anizonee-3fa1a732.koyeb.app"

export interface User {
  username: string
  token: string
  profile_picture_url?: string
}

export interface ListItem {
  id: string
  title: string
  image?: string
  path?: string
  addedAt: number
}

export interface UserLists {
  da_guardare?: string[]
  da_leggere?: string[]
  in_corso: string[]
  completati: string[]
  in_pausa: string[]
  abbandonati: string[]
  in_revisione: string[]
}

export interface ContinueWatchingItem {
  anime: string
  episode: number
  progress: string
}

export interface ContinueReadingItem {
  manga: string
  chapter: number
  progress: string
}

class AuthManager {
  private user: User | null = null
  private listeners: ((user: User | null) => void)[] = []

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("anizone_user")
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored)
          if (parsedUser && parsedUser.token && parsedUser.username) {
            this.user = parsedUser
            console.log("[v0] Restored user from localStorage:", parsedUser.username)
            if (!parsedUser.profile_picture_url) {
              this.fetchUserProfile().catch(console.error)
            }
          } else {
            localStorage.removeItem("anizone_user")
          }
        } catch {
          localStorage.removeItem("anizone_user")
        }
      }
    }
  }

  subscribe(listener: (user: User | null) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.user))
  }

  getUser() {
    return this.user
  }

  setUser(user: User | null) {
    this.user = user
    if (user) {
      localStorage.setItem("anizone_user", JSON.stringify(user))
    } else {
      localStorage.removeItem("anizone_user")
    }
    this.notify()
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || "Login failed" }
      }

      const data = await response.json()
      const user: User = { username, token: data.access_token }
      this.user = user
      localStorage.setItem("anizone_user", JSON.stringify(user))
      this.notify()
      return { success: true }
    } catch {
      return { success: false, error: "Network error" }
    }
  }

  async signup(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.detail || "Signup failed" }
      }

      return { success: true }
    } catch {
      return { success: false, error: "Network error" }
    }
  }

  logout() {
    this.user = null
    localStorage.removeItem("anizone_user")
    this.notify()
  }

  // ---------------- Profile Picture ----------------

  async fetchUserProfile(): Promise<{ success: boolean; profile_picture_url?: string; error?: string }> {
    if (!this.user) return { success: false, error: "Not authenticated" }

    try {
      const response = await fetch(`${API_BASE}/user/profile-picture`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (!response.ok) {
        if (response.status === 401) this.logout()
        return { success: false, error: "Failed to fetch profile picture" }
      }

      const data = await response.json()
      if (data.profile_picture_url) {
        this.user.profile_picture_url = data.profile_picture_url
        localStorage.setItem("anizone_user", JSON.stringify(this.user))
        this.notify()
      }

      return { success: true, profile_picture_url: data.profile_picture_url }
    } catch {
      return { success: false, error: "Network error" }
    }
  }

  async uploadProfilePicture(file: File): Promise<{ success: boolean; profile_picture_url?: string; error?: string }> {
    if (!this.user) return { success: false, error: "Not authenticated" }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE}/upload-profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.user.token}` },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 401) this.logout()
        return { success: false, error: error.detail || "Upload failed" }
      }

      const data = await response.json()
      if (data.profile_picture_url) {
        this.user.profile_picture_url = data.profile_picture_url
        localStorage.setItem("anizone_user", JSON.stringify(this.user))
        this.notify()
      }

      return { success: true, profile_picture_url: data.profile_picture_url }
    } catch {
      return { success: false, error: "Network error" }
    }
  }
}

export const authManager = new AuthManager()