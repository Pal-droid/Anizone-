"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Loader2 } from "lucide-react"

interface AniListTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (token: string) => Promise<{ success: boolean; error?: string }>
}

export function AniListTokenDialog({ open, onOpenChange, onLogin }: AniListTokenDialogProps) {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token.trim()) {
      setError("Per favore inserisci un access token")
      return
    }

    setLoading(true)
    setError("")

    const result = await onLogin(token.trim())

    if (result.success) {
      setToken("")
      onOpenChange(false)
    } else {
      setError(result.error || "Login fallito. Verifica il tuo token.")
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Accedi con AniList</DialogTitle>
          <DialogDescription>Inserisci il tuo AniList Access Token per sincronizzare le tue liste</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Incolla qui il tuo access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
              <p className="text-sm font-medium">Come ottenere un Access Token:</p>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Clicca sul pulsante "Ricevi Token"</li>
                <li>Accedi / crea il tuo account AniList (se hai già un account vai al prossimo step)</li>
                <li>Premi "Autorizza"</li>
                <li>Copia il token che ti viene dato e incollalo qui</li>
              </ol>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2 bg-transparent"
                onClick={() =>
                  window.open("https://anilist.co/api/v2/oauth/authorize?client_id=26299&response_type=token", "_blank")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ricevi Token
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accedi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
