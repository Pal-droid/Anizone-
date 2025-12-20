"use client"

export interface AniListUser {
  id: number
  name: string
  avatar?: {
    large?: string
    medium?: string
  }
  token: string
}

class AniListManager {
  private user: AniListUser | null = null
  private listeners: ((user: AniListUser | null) => void)[] = []

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("anilist_user")
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored)
          if (parsedUser && parsedUser.token && parsedUser.id) {
            this.user = parsedUser
            console.log("[v0] Restored AniList user from localStorage:", parsedUser.name)
          } else {
            localStorage.removeItem("anilist_user")
          }
        } catch {
          localStorage.removeItem("anilist_user")
        }
      }
    }
  }

  subscribe(listener: (user: AniListUser | null) => void) {
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

  setUser(user: AniListUser | null) {
    this.user = user
    if (user) {
      localStorage.setItem("anilist_user", JSON.stringify(user))
    } else {
      localStorage.removeItem("anilist_user")
    }
    this.notify()
  }

  async loginWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("[v0] Attempting to login with provided token")

      // Fetch user data from AniList to validate token
      const userResponse = await this.fetchAniListUser(token)
      if (!userResponse.success || !userResponse.user) {
        return { success: false, error: userResponse.error || "Failed to fetch user data" }
      }

      const user: AniListUser = {
        ...userResponse.user,
        token: token,
      }

      this.setUser(user)
      console.log("[v0] Successfully logged in as:", user.name)
      return { success: true }
    } catch (error) {
      console.error("[v0] Token login error:", error)
      return { success: false, error: "Invalid token or network error" }
    }
  }

  // Fetch current user from AniList API
  async fetchAniListUser(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const query = `
        query {
          Viewer {
            id
            name
            avatar {
              large
              medium
            }
          }
        }
      `

      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        return { success: false, error: "Failed to fetch user from AniList" }
      }

      const data = await response.json()

      if (data.errors) {
        return { success: false, error: "Invalid access token" }
      }

      return { success: true, user: data.data.Viewer }
    } catch (error) {
      console.error("[v0] Error fetching AniList user:", error)
      return { success: false, error: "Network error" }
    }
  }

  logout() {
    this.user = null
    localStorage.removeItem("anilist_user")
    this.notify()
  }

  // Fetch user's anime list from AniList
  async getUserAnimeList(): Promise<any> {
    if (!this.user) throw new Error("Not authenticated")

    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            name
            status
            entries {
              id
              mediaId
              status
              progress
              media {
                id
                title {
                  romaji
                  english
                  native
                }
                coverImage {
                  large
                  medium
                }
                episodes
              }
            }
          }
        }
      }
    `

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { userId: this.user.id },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch anime list")
      }

      const data = await response.json()
      return data.data.MediaListCollection
    } catch (error) {
      console.error("[v0] Error fetching anime list:", error)
      throw error
    }
  }

  // Fetch user's manga list from AniList
  async getUserMangaList(): Promise<any> {
    if (!this.user) throw new Error("Not authenticated")

    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: MANGA) {
          lists {
            name
            status
            entries {
              id
              mediaId
              status
              progress
              media {
                id
                title {
                  romaji
                  english
                  native
                }
                coverImage {
                  large
                  medium
                }
                chapters
              }
            }
          }
        }
      }
    `

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { userId: this.user.id },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch manga list")
      }

      const data = await response.json()
      return data.data.MediaListCollection
    } catch (error) {
      console.error("[v0] Error fetching manga list:", error)
      throw error
    }
  }

  // Update anime entry on AniList
  async updateAnimeEntry(mediaId: number, status: string, progress?: number): Promise<boolean> {
    if (!this.user) return false

    const mutation = `
      mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) {
          id
          status
          progress
        }
      }
    `

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.token}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { mediaId, status, progress },
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error updating anime entry:", error)
      return false
    }
  }

  // Update manga entry on AniList
  async updateMangaEntry(mediaId: number, status: string, progress?: number): Promise<boolean> {
    if (!this.user) return false

    const mutation = `
      mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int) {
        SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress) {
          id
          status
          progress
        }
      }
    `

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.token}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { mediaId, status, progress },
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error updating manga entry:", error)
      return false
    }
  }

  // Delete anime entry from AniList
  async deleteAnimeEntry(entryId: number): Promise<boolean> {
    if (!this.user) return false

    const mutation = `
      mutation ($id: Int) {
        DeleteMediaListEntry(id: $id) {
          deleted
        }
      }
    `

    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.user.token}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { id: entryId },
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Error deleting anime entry:", error)
      return false
    }
  }
}

export const aniListManager = new AniListManager()
