"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Mode = "login" | "signup"

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [me, setMe] = useState<string | null>(null)

  async function refreshMe() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" })
      if (r.status === 401) {
        setMe(null)
        return
      }
      const j = await r.json()
      if (j.ok) setMe(j.username || null)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshMe()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup"
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const j = await r.json()
      if (!r.ok || !j.ok) {
        setStatus(j.error || j.message || "Errore")
        return
      }
      if (mode === "signup") {
        setStatus("Registrazione completata. Ora effettua il login.")
        setMode("login")
      } else {
        setStatus("Login effettuato.")
        setUsername("")
        setPassword("")
        await refreshMe()
        // Reload lists after login
        try {
          await fetch("/api/user-state", { cache: "no-store" })
        } catch {}
      }
    } catch {
      setStatus("Errore di rete")
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setStatus(null)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setMe(null)
      setStatus("Disconnesso.")
      // Optionally refresh lists (will show anonymous state)
      await fetch("/api/user-state", { cache: "no-store" })
    } catch {
      setStatus("Errore durante il logout")
    } finally {
      setBusy(false)
    }
  }

  const loggedIn = !!me

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Account</CardTitle>
      </CardHeader>
      <CardContent>
        {loggedIn ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Connesso come <span className="font-medium">{me}</span>
            </div>
            <Button variant="outline" onClick={logout} disabled={busy}>
              Logout
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="text-xs block mb-1">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nomeutente" />
            </div>
            <div>
              <label className="text-xs block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {mode === "login" ? "Login" : "Signup"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Vai a Signup" : "Vai a Login"}
              </Button>
            </div>
          </form>
        )}
        {status ? <div className="text-xs text-muted-foreground mt-2">{status}</div> : null}
      </CardContent>
    </Card>
  )
}
