"use client"

export interface AniListUser {
  id: number
  name: string
  avatar?: {
    large?: string
    medium?: string
  }
  bannerImage?: string
}

class AniListManager {
  private user: AniListUser | null = null
  private listeners: ((user: AniListUser | null) => void)[] = []

  constructor() {
    // Auth state will be fetched from server on mount via context
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
    this.notify()
  }

  async loginWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("[v0] Attempting to login with provided token")

      const response = await fetch("/api/anilist/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!data.success || !data.user) {
        return { success: false, error: data.error || "Failed to authenticate" }
      }

      this.setUser(data.user)
      console.log("[v0] Successfully logged in as:", data.user.name)
      return { success: true }
    } catch (error) {
      console.error("[v0] Token login error:", error)
      return { success: false, error: "Invalid token or network error" }
    }
  }

  async checkAuth(): Promise<void> {
    try {
      const response = await fetch("/api/anilist/auth", {
        method: "GET",
      })

      const data = await response.json()

      if (data.success && data.authenticated && data.user) {
        this.setUser(data.user)
        console.log("[v0] Restored session for:", data.user.name)
      } else {
        this.setUser(null)
      }
    } catch (error) {
      console.error("[v0] Error checking auth:", error)
      this.setUser(null)
    }
  }

  async logout() {
    try {
      await fetch("/api/anilist/auth", {
        method: "DELETE",
      })
    } catch (error) {
      console.error("[v0] Error during logout:", error)
    }

    this.setUser(null)
  }

  private async makeGraphQLRequest(query: string, variables?: any): Promise<any> {
    const response = await fetch("/api/anilist/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error("Failed to make GraphQL request")
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error("AniList API error")
    }

    return data
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
              score
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
      console.log("[v0] Fetching anime list for user:", this.user.id)
      const data = await this.makeGraphQLRequest(query, { userId: this.user.id })
      console.log("[v0] Anime list response:", data)
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
              score
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
      console.log("[v0] Fetching manga list for user:", this.user.id)
      const data = await this.makeGraphQLRequest(query, { userId: this.user.id })
      console.log("[v0] Manga list response:", data)
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
      await this.makeGraphQLRequest(mutation, { mediaId, status, progress })
      return true
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
      await this.makeGraphQLRequest(mutation, { mediaId, status, progress })
      return true
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
      await this.makeGraphQLRequest(mutation, { id: entryId })
      return true
    } catch (error) {
      console.error("[v0] Error deleting anime entry:", error)
      return false
    }
  }

  async getMediaListStatus(
    mediaId: number,
    type: "ANIME" | "MANGA",
  ): Promise<{ status: string | null; progress: number }> {
    if (!this.user) return { status: null, progress: 0 }

    console.log("[v0] Fetching list status for mediaId:", mediaId, "userId:", this.user.id, "type:", type)

    const query = `
      query ($mediaId: Int, $userId: Int, $type: MediaType) {
        MediaList(mediaId: $mediaId, userId: $userId, type: $type) {
          status
          progress
        }
      }
    `

    try {
      const data = await this.makeGraphQLRequest(query, { mediaId, userId: this.user.id, type })
      console.log("[v0] MediaList API response:", data)

      if (data.data?.MediaList) {
        console.log("[v0] Found MediaList entry:", data.data.MediaList)
        return {
          status: data.data.MediaList.status,
          progress: data.data.MediaList.progress || 0,
        }
      }

      console.log("[v0] No MediaList entry found for this media")
      return { status: null, progress: 0 }
    } catch (error) {
      console.error("[v0] Error fetching media list status:", error)
      return { status: null, progress: 0 }
    }
  }
}

export const aniListManager = new AniListManager()
