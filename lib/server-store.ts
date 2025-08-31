export type ListName = "planning" | "completed" | "current" | "dropped" | "repeating" | "paused"

export type ContinueEntry = {
  seriesKey: string // e.g. /play/slug
  seriesPath: string // same as seriesKey
  title: string
  episode: { num: number; href: string }
  updatedAt: number
  positionSeconds?: number
}

export type ListItem = {
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
  addedAt: number
}

export type UserState = {
  continueWatching: Record<string, ContinueEntry> // keyed by seriesKey
  lists: Record<ListName, Record<string, ListItem>> // list -> (seriesKey -> item)
}

const defaultState = (): UserState => ({
  continueWatching: {},
  lists: {
    planning: {},
    completed: {},
    current: {},
    dropped: {},
    repeating: {},
    paused: {},
  },
})

const STORE = new Map<string, UserState>()

export function getState(userId: string): UserState {
  if (!STORE.has(userId)) STORE.set(userId, defaultState())
  return STORE.get(userId)!
}

export function setContinue(userId: string, entry: ContinueEntry & { positionSeconds?: number }) {
  const s = getState(userId)
  s.continueWatching[entry.seriesKey] = entry
}

export function addToList(userId: string, list: ListName, item: ListItem) {
  const s = getState(userId)
  s.lists[list][item.seriesKey] = item
}

export function removeFromList(userId: string, list: ListName, seriesKey: string) {
  const s = getState(userId)
  delete s.lists[list][seriesKey]
}

export function getPublicState(userId: string) {
  // Directly return state for anonymous users (no secrets here)
  return getState(userId)
}
