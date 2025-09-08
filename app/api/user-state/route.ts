import { type NextRequest, NextResponse } from "next/server"
import { getPublicState, setContinue, addToList, removeFromList, type ListName } from "@/lib/server-store"
import {
  BACKEND_BASE,
  JWT_COOKIE,
  type BackendUserData,
  mapLocalToBackendKey,
  mapBackendToLocalKey,
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
  const r = await fetch(`${BACKEND_BASE}/user/data`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (r.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  return (await r.json()) as BackendUserData
}

async function backendSaveData(token: string, data: BackendUserData) {
  const r = await fetch(`${BACKEND_BASE}/user/data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  })
  if (r.status === 401) throw Object.assign(new Error("Unauthorized"), { code: 401 })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`Save failed: ${t.slice(0, 200)}`)
  }
}

function mapBackendToLocal(data: BackendUserData) {
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
  for (const [k, arr] of Object.entries(data.lists || {})) {
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
  return { continueWatching, lists }
}

function mergeLocalChangeIntoBackend(
  backend: BackendUserData,
  op:
    | { type: "continue"; seriesKey: string; episode: number; position_seconds?: number }
    | { type: "list-add"; list: ListName; seriesKey: string }
    | { type: "list-remove"; list: ListName; seriesKey: string },
): BackendUserData {
  const data: BackendUserData = {
    continue_watching: Array.isArray(backend.continue_watching) ? [...backend.continue_watching] : [],
    lists: {
      da_guardare: [...(backend.lists?.da_guardare || [])],
      in_corso: [...(backend.lists?.in_corso || [])],
      completati: [...(backend.lists?.completati || [])],
      in_pausa: [...(backend.lists?.in_pausa || [])],
      abbandonati: [...(backend.lists?.abbandonati || [])],
      in_revisione: [...(backend.lists?.in_revisione || [])],
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
    const key = mapLocalToBackendKey[op.list]
    const set = new Set<string>(data.lists[key] || [])
    set.add(op.seriesKey)
    data.lists[key] = Array.from(set)
  } else if (op.type === "list-remove") {
    const key = mapLocalToBackendKey[op.list]
    data.lists[key] = (data.lists[key] || []).filter((x) => x !== op.seriesKey)
  }
  return data
}

export async function GET(req: NextRequest) {
  const userId = getOrCreateUserId(req)
  const token = req.cookies.get(JWT_COOKIE)?.value

  try {
    if (token) {
      const backend = await backendGetData(token)
      const mapped = mapBackendToLocal(backend)
      const res = NextResponse.json({ ok: true, data: { ...mapped } })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }
  } catch (e: any) {
    if (e?.code === 401) {
      const res = NextResponse.json({ ok: false, error: "Sessione scaduta" }, { status: 401 })
      res.cookies.set(JWT_COOKIE, "", { path: "/", maxAge: 0 })
      attachUserCookieIfNeeded(req, res, userId)
      return res
    }
    return NextResponse.json({ ok: false, error: e?.message || "Errore backend" }, { status: 500 })
  }

  const data = getPublicState(userId)
  const res = NextResponse.json({ ok: true, data })
  attachUserCookieIfNeeded(req, res, userId)
  return res
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

  const position =
    typeof (body as ContinueBody).position_seconds === "number"
      ? (body as ContinueBody).position_seconds
      : (body as ContinueBody).positionSeconds

  if (token) {
    try {
      const backend = await backendGetData(token)
      let updated = backend
      switch (body.op) {
        case "continue": {
          updated = mergeLocalChangeIntoBackend(backend, {
            type: "continue",
            seriesKey: (body as ContinueBody).seriesKey,
            episode: (body as ContinueBody).episode?.num ?? 0,
            position_seconds: typeof position === "number" ? position : 0,
          })
          break
        }
        case "list-add": {
          updated = mergeLocalChangeIntoBackend(backend, {
            type: "list-add",
            list: (body as ListAddBody).list,
            seriesKey: (body as ListAddBody).seriesKey,
          })
          break
        }
        case "list-remove": {
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
    const res = NextResponse.json({ ok: false, error: e?.message || "Errore aggiornamento stato" }, { status: 500 })
    attachUserCookieIfNeeded(req, res, userId)
    return res
  }
}
