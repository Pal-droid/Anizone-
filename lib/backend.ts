export const BACKEND_BASE = process.env.BACKEND_BASE || "https://stale-nananne-anizonee-3fa1a732.koyeb.app"

export const JWT_COOKIE = "azjwt"

export type BackendLists = {
  da_guardare?: string[]
  da_leggere?: string[]
  in_corso: string[]
  completati: string[]
  in_pausa: string[]
  abbandonati: string[]
  in_revisione: string[]
}

export type BackendContinueItem = {
  anime_id: string
  episode: number
  position_seconds: number
}

export type BackendUserData = {
  continue_watching: BackendContinueItem[]
  anime_lists: BackendLists
  manga_lists: BackendLists
  lightnovel_lists: BackendLists
}

export const mapLocalToBackendKey: Record<
  "planning" | "current" | "completed" | "paused" | "dropped" | "repeating",
  keyof BackendLists
> = {
  planning: "da_guardare",
  current: "in_corso",
  completed: "completati",
  paused: "in_pausa",
  dropped: "abbandonati",
  repeating: "in_revisione",
}

export const mapBackendToLocalKey: Record<keyof BackendLists, string> = {
  da_guardare: "planning",
  da_leggere: "planning", // 🔥 for manga/LN
  in_corso: "current",
  completati: "completed",
  in_pausa: "paused",
  abbandonati: "dropped",
  in_revisione: "repeating",
}
