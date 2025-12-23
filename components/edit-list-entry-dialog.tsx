"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Star } from "lucide-react"

interface EditListEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: any
  mediaType: "anime" | "manga"
  onSave: (updates: { status?: string; progress?: number; score?: number }) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: "CURRENT", label: "In corso" },
  { value: "PLANNING", label: "Da guardare/leggere" },
  { value: "COMPLETED", label: "Completato" },
  { value: "PAUSED", label: "In pausa" },
  { value: "DROPPED", label: "Abbandonato" },
  { value: "REPEATING", label: "In revisione" },
]

export function EditListEntryDialog({ open, onOpenChange, entry, mediaType, onSave }: EditListEntryDialogProps) {
  const [status, setStatus] = useState(entry.status)
  const [progress, setProgress] = useState(entry.progress || 0)
  const [score, setScore] = useState(entry.score || 0)
  const [isSaving, setIsSaving] = useState(false)

  const maxProgress = mediaType === "anime" ? entry.media.episodes || 999 : entry.media.chapters || 999

  useEffect(() => {
    if (open) {
      setStatus(entry.status)
      setProgress(entry.progress || 0)
      setScore(entry.score || 0)
    }
  }, [open, entry])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates: any = {}
      if (status !== entry.status) updates.status = status
      if (progress !== entry.progress) updates.progress = progress
      if (score !== entry.score) updates.score = score

      await onSave(updates)
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving entry:", error)
      alert("Errore durante il salvataggio")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifica {entry.media.title.romaji}</DialogTitle>
          <DialogDescription>
            Aggiorna lo stato, il progresso e il punteggio per questo {mediaType === "anime" ? "anime" : "manga"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Stato</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Progresso: {progress}
              {maxProgress < 999 && ` / ${maxProgress}`} {mediaType === "anime" ? "episodi" : "capitoli"}
            </Label>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                min="0"
                max={maxProgress}
                value={progress}
                onChange={(e) => setProgress(Math.min(maxProgress, Math.max(0, Number.parseInt(e.target.value) || 0)))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm font-medium">{maxProgress < 999 ? maxProgress : "?"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Punteggio</Label>
              <div className="flex items-center gap-1.5 text-yellow-500">
                <Star className="h-4 w-4 fill-yellow-500" />
                <span className="font-semibold text-foreground">{score}/10</span>
              </div>
            </div>
            <Slider
              value={[score]}
              onValueChange={(vals) => setScore(vals[0])}
              min={0}
              max={10}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
