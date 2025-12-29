"use client"

import { toast } from "@/hooks/use-toast"

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

    const data = await response.json()

    if (response.status === 429 || data.rateLimited) {
      const resetInSeconds = data.resetInSeconds || 60
      const resetInMinutes = Math.ceil(resetInSeconds / 60)

      toast({
        title: "Limite di richieste raggiunto",
        description: `Hai raggiunto il limite di 90 richieste al minuto. Riprova tra ${resetInMinutes} ${resetInMinutes === 1 ? "minuto" : "minuti"}.`,
        variant: "destructive",
        duration: 5000,
      })

      throw new Error("Rate limit exceeded")
    }

    if (!response.ok) {
      throw new Error("Failed to make GraphQL request")
    }

    if (data.errors) {
      console.error("AniList API errors:", data.errors)
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
      if (error instanceof Error && !error.message.includes("Rate limit")) {
        toast({
          title: "Errore",
          description: "Impossibile aggiornare l'anime. Riprova più tardi.",
          variant: "destructive",
        })
      }
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
      if (error instanceof Error && !error.message.includes("Rate limit")) {
        toast({
          title: "Errore",
          description: "Impossibile aggiornare il manga. Riprova più tardi.",
          variant: "destructive",
        })
      }
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
      if (error instanceof Error && !error.message.includes("Rate limit")) {
        toast({
          title: "Errore",
          description: "Impossibile eliminare l'elemento. Riprova più tardi.",
          variant: "destructive",
        })
      }
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

  async checkFavoriteStatus(mediaId: number): Promise<boolean> {
    if (!this.user) return false

    const query = `
      query ($userId: Int) {
        User(id: $userId) {
          favourites {
            anime {
              nodes {
                id
              }
            }
            manga {
              nodes {
                id
              }
            }
          }
        }
      }
    `

    try {
      const data = await this.makeGraphQLRequest(query, { userId: this.user.id })
      const animeIds = data.data?.User?.favourites?.anime?.nodes?.map((n: any) => n.id) || []
      const mangaIds = data.data?.User?.favourites?.manga?.nodes?.map((n: any) => n.id) || []
      return [...animeIds, ...mangaIds].includes(mediaId)
    } catch (error) {
      console.error("Error checking favorite status:", error)
      return false
    }
  }

  async toggleFavorite(mediaId: number, isFavorite: boolean): Promise<boolean> {
    if (!this.user) return false

    const mutation = `
      mutation ($animeId: Int, $mangaId: Int) {
        ToggleFavourite(animeId: $animeId, mangaId: $mangaId) {
          anime {
            nodes {
              id
            }
          }
          manga {
            nodes {
              id
            }
          }
        }
      }
    `

    try {
      // We need to determine if this is anime or manga
      // For now, try anime first, then manga if it fails
      try {
        await this.makeGraphQLRequest(mutation, { animeId: mediaId })
        return true
      } catch {
        await this.makeGraphQLRequest(mutation, { mangaId: mediaId })
        return true
      }
    } catch (error) {
      console.error("[v0] Error toggling favorite:", error)
      if (error instanceof Error && !error.message.includes("Rate limit")) {
        toast({
          title: "Errore",
          description: "Impossibile aggiornare i preferiti. Riprova più tardi.",
          variant: "destructive",
        })
      }
      return false
    }
  }

  async getUserFavorites(): Promise<{ anime: any[]; manga: any[] }> {
    if (!this.user) return { anime: [], manga: [] }

    const query = `
      query ($userId: Int) {
        User(id: $userId) {
          favourites {
            anime {
              nodes {
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
                format
              }
            }
            manga {
              nodes {
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
                format
              }
            }
          }
        }
      }
    `

    try {
      const data = await this.makeGraphQLRequest(query, { userId: this.user.id })
      return {
        anime: data.data?.User?.favourites?.anime?.nodes || [],
        manga: data.data?.User?.favourites?.manga?.nodes || [],
      }
    } catch (error) {
      console.error("[v0] Error fetching favorites:", error)
      return { anime: [], manga: [] }
    }
  }
}

export const aniListManager = new AniListManager()
