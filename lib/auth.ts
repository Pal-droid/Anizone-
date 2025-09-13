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
            console.log("[v0] Invalid user data in localStorage, clearing")
            localStorage.removeItem("anizone_user")
          }
        } catch (e) {
          console.log("[v0] Failed to parse user data, clearing localStorage")
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

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.user = {
          username,
          token: data.access_token,
          profile_picture_url: data.profile_picture_url,
        }
        localStorage.setItem("anizone_user", JSON.stringify(this.user))
        this.notify()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail || "Login failed" }
      }
    } catch (error) {
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

      if (response.ok) {
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail || "Signup failed" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  logout() {
    this.user = null
    localStorage.removeItem("anizone_user")
    this.notify()
  }

  async getAnimeLists(): Promise<UserLists | null> {
    if (!this.user) return null

    try {
      console.log("[v0] Fetching anime lists for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/anime-lists`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (response.ok) {
        const lists = await response.json()
        console.log("[v0] Successfully fetched anime lists")
        return lists
      } else {
        console.log("[v0] Failed to fetch anime lists, status:", response.status)
        if (response.status === 401) {
          // Token expired, logout user
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch anime lists:", error)
    }
    return null
  }

  async updateAnimeLists(lists: UserLists): Promise<boolean> {
    if (!this.user) return false

    try {
      console.log("[v0] Updating anime lists for user:", this.user.username)
      console.log("[v0] Sending lists data:", lists)

      const response = await fetch(`${API_BASE}/user/anime-lists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lists),
      })

      if (response.ok) {
        console.log("[v0] Successfully updated anime lists")
        return true
      } else {
        const errorText = await response.text()
        console.log("[v0] Failed to update anime lists, status:", response.status, "error:", errorText)
        if (response.status === 401) {
          // Token expired, logout user
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to update anime lists:", error)
    }
    return false
  }

  async getMangaLists(): Promise<UserLists | null> {
    if (!this.user) return null

    try {
      console.log("[v0] Fetching manga lists for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/manga-lists`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (response.ok) {
        const lists = await response.json()
        console.log("[v0] Successfully fetched manga lists")
        return lists
      } else {
        console.log("[v0] Failed to fetch manga lists, status:", response.status)
        if (response.status === 401) {
          // Token expired, logout user
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch manga lists:", error)
    }
    return null
  }

  async updateMangaLists(lists: UserLists): Promise<boolean> {
    if (!this.user) return false

    try {
      console.log("[v0] Updating manga lists for user:", this.user.username)
      console.log("[v0] Sending lists data:", lists)

      const response = await fetch(`${API_BASE}/user/manga-lists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lists),
      })

      if (response.ok) {
        console.log("[v0] Successfully updated manga lists")
        return true
      } else {
        const errorText = await response.text()
        console.log("[v0] Failed to update manga lists, status:", response.status, "error:", errorText)
        if (response.status === 401) {
          // Token expired, logout user
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to update manga lists:", error)
    }
    return false
  }

  async getContinueWatching(): Promise<Record<string, ContinueWatchingItem> | null> {
    if (!this.user) return null

    try {
      console.log("[v0] Fetching continue watching for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/continue-watching`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Successfully fetched continue watching")
        return data
      } else {
        console.log("[v0] Failed to fetch continue watching, status:", response.status)
        if (response.status === 401) {
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch continue watching:", error)
    }
    return null
  }

  async updateContinueWatching(data: Record<string, ContinueWatchingItem>): Promise<boolean> {
    if (!this.user) return false

    try {
      console.log("[v0] Updating continue watching for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/continue-watching`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        console.log("[v0] Successfully updated continue watching")
        return true
      } else {
        console.log("[v0] Failed to update continue watching, status:", response.status)
        if (response.status === 401) {
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to update continue watching:", error)
    }
    return false
  }

  async getContinueReading(): Promise<Record<string, ContinueReadingItem> | null> {
    if (!this.user) return null

    try {
      console.log("[v0] Fetching continue reading for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/continue-reading`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Successfully fetched continue reading")
        return data
      } else {
        console.log("[v0] Failed to fetch continue reading, status:", response.status)
        if (response.status === 401) {
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch continue reading:", error)
    }
    return null
  }

  async updateContinueReading(data: Record<string, ContinueReadingItem>): Promise<boolean> {
    if (!this.user) return false

    try {
      console.log("[v0] Updating continue reading for user:", this.user.username)

      const response = await fetch(`${API_BASE}/user/continue-reading`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        console.log("[v0] Successfully updated continue reading")
        return true
      } else {
        console.log("[v0] Failed to update continue reading, status:", response.status)
        if (response.status === 401) {
          this.logout()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to update continue reading:", error)
    }
    return false
  }

  async uploadProfilePicture(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.user) return { success: false, error: "Not authenticated" }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE}/upload-profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.user.token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Successfully uploaded profile picture")
        this.user.profile_picture_url = data.profile_picture_url
        localStorage.setItem("anizone_user", JSON.stringify(this.user))
        this.notify()
        return { success: true, url: data.profile_picture_url }
      } else {
        const error = await response.json()
        console.log("[v0] Failed to upload profile picture, status:", response.status)
        if (response.status === 401) {
          this.logout()
        }
        return { success: false, error: error.detail || "Upload failed" }
      }
    } catch (error) {
      console.error("[v0] Failed to upload profile picture:", error)
      return { success: false, error: "Network error" }
    }
  }

  async fetchUserProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (!this.user) return { success: false, error: "Not authenticated" }

    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${this.user.token}` },
      })

      if (response.ok) {
        const profile = await response.json()
        if (profile.profile_picture_url) {
          this.user.profile_picture_url = profile.profile_picture_url
          localStorage.setItem("anizone_user", JSON.stringify(this.user))
          this.notify()
        }
        return { success: true, profile }
      } else {
        if (response.status === 401) {
          this.logout()
        }
        return { success: false, error: "Failed to fetch profile" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }
}

export const authManager = new AuthManager()
