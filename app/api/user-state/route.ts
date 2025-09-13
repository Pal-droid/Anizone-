import { type NextRequest, NextResponse } from "next/server"
import { getPublicState, setContinue, addToList, removeFromList, type ListName } from "@/lib/server-store"
import {
  JWT_COOKIE,
  type BackendUserData,
  type BackendLists,
  mapLocalToBackendKey,
  mapBackendToLocalKey,
  getBackendAnimeData,
  getBackendMangaData,
  getBackendLightNovelData,
  getBackendContinueWatching,
  getBackendContinueReading,
  saveBackendAnimeData,
  saveBackendMangaData,
  saveBackendContinueWatching,
} from "@/lib/backend"

const USER_COOKIE = "azid"

function getOrCreateUserId(req: NextRequest) {
  const existing = req.cookies.get(USER_COOKIE)?.value
  return existing ?? crypto.randomUUID()
}

function attachUserCookieIfNeeded(req: NextRequest, res: NextResponse, userId: string) {
  const existing = req.cookies.get(USER_COOKIE)?.value
  if (!existing) {
    res.cookies.set(USER_COOKIE, userId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
}

async function backendGetData(token: string): Promise<BackendUserData> {
  try {
    console.log("[v0] Fetching data from backend with token:", token ? "present" : "missing")

    const [animeData, mangaData, lightNovelData, continueWatching, continueReading] = await Promise.all([
      getBackendAnimeData(token),
      getBackendMangaData(token),
      getBackendLightNovelData(token),
      getBackendContinueWatching(token),
      getBackendContinueReading(token),
    ])

    console.log("[v0] Backend data fetched successfully:", {
      animeData: Object.keys(animeData || {}),
      mangaData: Object.keys(mangaData || {}),
      continueWatching: Object.keys(continueWatching || {}),
    })

    return {
      continue_watching: Object.entries(continueWatching || {}).map(([key, value]: [string, any]) => ({
        anime_id: key,
        episode: value.episode?.num || 0,
        position_seconds: value.positionSeconds || 0,
      })),
      continue_reading: continueReading || {},
      continue_watching_series_movies: {},
      anime_lists: animeData || {
        da_guardare: [],
        in_corso: [],
        completati: [],
        in_pausa: [],
        abbandonati: [],
        in_revisione: [],
      },
      manga_lists: mangaData || {
        da_leggere: [],
        in_corso: [],
        completati: [],
        in_pausa: [],
        abbandonati: [],
        in_revisione: [],
      },
      lightnovel_lists: lightNovelData || {
        da_leggere: [],
        in_corso: [],
        completati: [],
        in_pausa: [],
        abbandonati: [],
        in_revisione: [],
      },
      series_movies_lists: {
        da_guardare: [],
        in_corso: [],
        completati: [],
        in_pausa: [],
        abbandonati: [],
        in_revisione: [],
      },
    }
  } catch (error: any) {
    console.error("[v0] Backend data fetch error:", error)
    if (error?.code === 401) throw error
    throw new Error(`Failed to fetch backend data: ${error.message}`)
  }
}

async function backendSaveData(token: string, data: BackendUserData) {
  try {
    console.log("[v0] Saving data to backend:", {
      animeListsKeys: Object.keys(data.anime_lists || {}),
      mangaListsKeys: Object.keys(data.manga_lists || {}),
      continueWatchingCount: data.continue_watching?.length || 0,
    })

    await Promise.all([
      saveBackendAnimeData(token, data.anime_lists),
      saveBackendMangaData(token, data.manga_lists),
      saveBackendContinueWatching(token, data.continue_watching),
    ])

    console.log("[v0] Successfully saved all data to backend")
  } catch (error: any) {
    console.error("[v0] Backend save error:", error)
    if (error?.code === 401) throw error
    throw new Error(`Failed to save backend data: ${error.message}`)
  }
}

function mapBackendToLocal(data: BackendUserData) {
  console.log("[v0] Mapping backend data to local format:", data)

  const lists: Record<
    ListName,
    Record<string, { seriesKey: string; seriesPath: string; title: string; addedAt: number }>
  > = {
    planning: {},
    current: {},
    completed: {},
    paused: {},
    dropped: {},
    repeating: {},
  }

  // Map anime lists
  if (data.anime_lists) {
    for (const [k, arr] of Object.entries(data.anime_lists)) {
      const localKey = mapBackendToLocalKey[k as keyof typeof mapBackendToLocalKey] as ListName | undefined
      if (!localKey) continue
      for (const id of arr || []) {
        const seriesKey = id
        lists[localKey][seriesKey] = {
          seriesKey,
          seriesPath: seriesKey,
          title: seriesKey,
          addedAt: Date.now(),
        }
      }
    }
  }

  // Map manga lists
  if (data.manga_lists) {
    for (const [k, arr] of Object.entries(data.manga_lists)) {
      const localKey = mapBackendToLocalKey[k as keyof typeof mapBackendToLocalKey] as ListName | undefined
      if (!localKey) continue
      for (const id of arr || []) {
        const seriesKey = id
        lists[localKey][seriesKey] = {
          seriesKey,
          seriesPath: seriesKey,
          title: seriesKey,
          addedAt: Date.now(),
        }
      }
    }
  }

  const continueWatching: Record<
    string,
    {
      seriesKey: string
      seriesPath: string
      title: string
      episode: { num: number; href: string }
      updatedAt: number
      positionSeconds?: number
    }
  > = {}

  for (const cw of data.continue_watching || []) {
    const seriesKey = cw.anime_id
    continueWatching[seriesKey] = {
      seriesKey,
      seriesPath: seriesKey,
      title: seriesKey,
      episode: { num: cw.episode ?? 0, href: seriesKey },
      updatedAt: Date.now(),
      positionSeconds: cw.position_seconds ?? 0,
    }
  }

  console.log("[v0] Mapped data:", { lists, continueWatching })
  return { continueWatching, lists }
}

function mergeLocalChangeIntoBackend(
  backend: BackendUserData,
  op:
    | { type: "continue"; seriesKey: string; episode: number; position_seconds?: number }
    | { type: "list-add"; list: ListName; seriesKey: string; contentType?: string }
    | { type: "list-remove"; list: ListName; seriesKey: string; contentType?: string },
): BackendUserData {
  const data: BackendUserData = {
    continue_watching: Array.isArray(backend.continue_watching) ? [...backend.continue_watching] : [],
    continue_reading: { ...backend.continue_reading },
    continue_watching_series_movies: { ...backend.continue_watching_series_movies },
    anime_lists: {
      da_guardare: [...(backend.anime_lists?.da_guardare || [])],
      in_corso: [...(backend.anime_lists?.in_corso || [])],
      completati: [...(backend.anime_lists?.completati || [])],
      in_pausa: [...(backend.anime_lists?.in_pausa || [])],
      abbandonati: [...(backend.anime_lists?.abbandonati || [])],
      in_revisione: [...(backend.anime_lists?.in_revisione || [])],
    },
    manga_lists: {
      da_leggere: [...(backend.manga_lists?.da_leggere || [])],
      in_corso: [...(backend.manga_lists?.in_corso || [])],
      completati: [...(backend.manga_lists?.completati || [])],
      in_pausa: [...(backend.manga_lists?.in_pausa || [])],
      abbandonati: [...(backend.manga_lists?.abbandonati || [])],
      in_revisione: [...(backend.manga_lists?.in_revisione || [])],
    },
    lightnovel_lists: {
      da_leggere: [...(backend.lightnovel_lists?.da_leggere || [])],
      in_corso: [...(backend.lightnovel_lists?.in_corso || [])],
      completati: [...(backend.lightnovel_lists?.completati || [])],
      in_pausa: [...(backend.lightnovel_lists?.in_pausa || [])],
      abbandonati: [...(backend.lightnovel_lists?.abbandonati || [])],
      in_revisione: [...(backend.lightnovel_lists?.in_revisione || [])],
    },
    series_movies_lists: {
      da_guardare: [...(backend.series_movies_lists?.da_guardare || [])],
      in_corso: [...(backend.series_movies_lists?.in_corso || [])],
      completati: [...(backend.series_movies_lists?.completati || [])],
      in_pausa: [...(backend.series_movies_lists?.in_pausa || [])],
      abbandonati: [...(backend.series_movies_lists?.abbandonati || [])],
      in_revisione: [...(backend.series_movies_lists?.in_revisione || [])],
    },
  }

  if (op.type === "continue") {
    const idx = data.continue_watching.findIndex((x) => x.anime_id === op.seriesKey)
    const item = {
      anime_id: op.seriesKey,
      episode: op.episode,
      position_seconds: op.position_seconds ?? 0,
    }
    if (idx >= 0) data.continue_watching[idx] = item
    else data.continue_watching.push(item)
  } else if (op.type === "list-add") {
    // Determine which list type to update based on content type
    const contentType = op.contentType || (op.seriesKey.includes("/manga/") ? "manga" : "anime")
    let targetLists: BackendLists

    if (contentType === "manga") {
      targetLists = data.manga_lists
    } else if (contentType === "light-novel") {
      targetLists = data.lightnovel_lists
    } else {
      targetLists = data.anime_lists
    }

    const key = mapLocalToBackendKey[op.list]
    const set = new Set<string>(targetLists[key] || [])
    set.add(op.seriesKey)
    targetLists[key] = Array.from(set)
  } else if (op.type === "list-remove") {
    // Remove from all list types to ensure cleanup
    const key = mapLocalToBackendKey[op.list]
    data.anime_lists[key] = (data.anime_lists[key] || []).filter((x) => x !== op.seriesKey)
    data.manga_lists[key] = (data.manga_lists[key] || []).filter((x) => x !== op.seriesKey)
    data.lightnovel_lists[key] = (data.lightnovel_lists[key] || []).filter((x) => x !== op.seriesKey)
  }
  return data
}

type ContinueBody = {
  op: "continue"
  seriesKey: string
  seriesPath: string
  title: string
  episode: { num: number; href: string }
  position_seconds?: number
  positionSeconds?: number
}

type ListAddBody = {
  op: "list-add"
  list: ListName
  seriesKey: string
  seriesPath: string
  title: string
  image?: string
}

type ListRemoveBody = {
  op: "list-remove"
  list: ListName
  seriesKey: string
}

type Body = ContinueBody | ListAddBody | ListRemoveBody

export async function GET(req: NextRequest) {
  const userId = getOrCreateUserId(req)
  const token = req.cookies.get(JWT_COOKIE)?.value

  console.log("[v0] GET /api/user-state - userId:", userId, "hasToken:", !!token)

  try {
    if (token) {
      console.log("[v0] Using backend authentication")
      const backend = await backendGetData(token)
      const mapped = mapBackendToLocal(backend)
      const res = NextResponse.json({ ok: true, data: { ...mapped } })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }
  } catch (e: any) {
    console.error("[v0] Backend error in GET:", e)
    if (e?.code === 401) {
      console.log("[v0] Token expired, clearing JWT cookie")
      const res = NextResponse.json({ ok: false, error: "Sessione scaduta" }, { status: 401 })
      res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }
    console.error("[v0] Backend error, falling back to local storage")
    // Fall through to local storage
  }

  console.log("[v0] Using local storage fallback")
  const data = getPublicState(userId)
  const res = NextResponse.json({ ok: true, data })
  attachUserCookieIfNeeded(req, res, userId)
  return res
}

export async function POST(req: NextRequest) {
  const userId = getOrCreateUserId(req)
  const token = req.cookies.get(JWT_COOKIE)?.value

  let body: Body
  try {
    body = await req.json()
  } catch {
    const res = NextResponse.json({ ok: false, error: "JSON non valido" }, { status: 400 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }

  console.log("[v0] POST /api/user-state - operation:", body.op, "hasToken:", !!token)

  const position =
    typeof (body as ContinueBody).position_seconds === "number"
      ? (body as ContinueBody).position_seconds
      : (body as ContinueBody).positionSeconds

  if (token) {
    try {
      console.log("[v0] Processing with backend authentication")
      const backend = await backendGetData(token)
      let updated = backend

      switch (body.op) {
        case "continue": {
          console.log("[v0] Adding to continue watching:", (body as ContinueBody).seriesKey)
          updated = mergeLocalChangeIntoBackend(backend, {
            type: "continue",
            seriesKey: (body as ContinueBody).seriesKey,
            episode: (body as ContinueBody).episode?.num ?? 0,
            position_seconds: typeof position === "number" ? position : 0,
          })
          break
        }
        case "list-add": {
          const addBody = body as ListAddBody
          console.log("[v0] Adding to list:", addBody.list, "seriesKey:", addBody.seriesKey)

          // Determine content type from seriesKey or seriesPath
          const contentType = addBody.seriesKey.includes("/manga/")
            ? "manga"
            : addBody.seriesKey.includes("/light-novel/")
              ? "light-novel"
              : "anime"

          console.log("[v0] Detected content type:", contentType)

          updated = mergeLocalChangeIntoBackend(backend, {
            type: "list-add",
            list: addBody.list,
            seriesKey: addBody.seriesKey,
            contentType,
          })
          break
        }
        case "list-remove": {
          console.log(
            "[v0] Removing from list:",
            (body as ListRemoveBody).list,
            "seriesKey:",
            (body as ListRemoveBody).seriesKey,
          )
          updated = mergeLocalChangeIntoBackend(backend, {
            type: "list-remove",
            list: (body as ListRemoveBody).list,
            seriesKey: (body as ListRemoveBody).seriesKey,
          })
          break
        }
        default: {
          const res = NextResponse.json({ ok: false, error: "Operazione non supportata" }, { status: 400 })
          attachUserCookieIfNeeded(req, res, userId)
          return res
        }
      }

      await backendSaveData(token, updated)
      const mapped = mapBackendToLocal(updated)
      const res = NextResponse.json({ ok: true, data: { ...mapped } })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    } catch (e: any) {
      console.error("[v0] Backend error in POST:", e)
      if (e?.code === 401) {
        const res = NextResponse.json({ ok: false, error: "Sessione scaduta" }, { status: 401 })
        res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
        attachUserCookieIfNeeded(req, res, userId)
        return res
      }
      const res = NextResponse.json({ ok: false, error: e?.message || "Errore backend" }, { status: 500 })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }
  }

  // Anonymous fallback
  console.log("[v0] Processing with local storage fallback")
  try {
    switch (body.op) {
      case "continue": {
        const b = body as ContinueBody
        setContinue(userId, {
          seriesKey: b.seriesKey,
          seriesPath: b.seriesPath,
          title: b.title,
          episode: b.episode,
          updatedAt: Date.now(),
          positionSeconds: typeof position === "number" ? position : 0,
        })
        break
      }
      case "list-add": {
        const b = body as ListAddBody
        addToList(userId, b.list, {
          seriesKey: b.seriesKey,
          seriesPath: b.seriesPath,
          title: b.title,
          image: b.image,
          addedAt: Date.now(),
        })
        break
      }
      case "list-remove": {
        const b = body as ListRemoveBody
        removeFromList(userId, b.list, b.seriesKey)
        break
      }
      default: {
        const res = NextResponse.json({ ok: false, error: "Operazione non supportata" }, { status: 400 })
        attachUserCookieIfNeeded(req, res, userId)
        return res
      }
    }

    const data = getPublicState(userId)
    const res = NextResponse.json({ ok: true, data })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  } catch (e: any) {
    console.error("[v0] Local storage error:", e)
    const res = NextResponse.json({ ok: false, error: e?.message || "Errore aggiornamento stato" }, { status: 500 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }
}
