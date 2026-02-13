"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Globe, Info, Palette, Sun, Moon, Monitor, Trash2, AlertTriangle, Check, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { toast } from "@/hooks/use-toast"

// Default blurple hue
const DEFAULT_HUE = 280

const PRESET_ACCENTS = [
  { name: "Blurple", hue: 280, color: "oklch(0.55 0.2 280)" },
  { name: "Blue", hue: 240, color: "oklch(0.55 0.2 240)" },
  { name: "Teal", hue: 180, color: "oklch(0.55 0.18 180)" },
  { name: "Green", hue: 145, color: "oklch(0.55 0.18 145)" },
  { name: "Yellow", hue: 85, color: "oklch(0.6 0.18 85)" },
  { name: "Orange", hue: 50, color: "oklch(0.6 0.2 50)" },
  { name: "Red", hue: 25, color: "oklch(0.55 0.22 25)" },
  { name: "Pink", hue: 350, color: "oklch(0.6 0.2 350)" },
  { name: "Rose", hue: 320, color: "oklch(0.6 0.18 320)" },
]

function ColorWheel({
  selectedHue,
  onHueChange,
}: {
  selectedHue: number
  onHueChange: (hue: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const outerRadius = center - 4
    const innerRadius = outerRadius - 28

    ctx.clearRect(0, 0, size, size)

    // Draw the color wheel ring
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180
      const endAngle = ((angle + 1) * Math.PI) / 180

      ctx.beginPath()
      ctx.arc(center, center, outerRadius, startAngle, endAngle)
      ctx.arc(center, center, innerRadius, endAngle, startAngle, true)
      ctx.closePath()
      ctx.fillStyle = `oklch(0.6 0.2 ${angle})`
      ctx.fill()
    }

    // Draw the selector indicator
    const indicatorAngle = ((selectedHue - 90) * Math.PI) / 180
    const indicatorRadius = (outerRadius + innerRadius) / 2
    const indicatorX = center + indicatorRadius * Math.cos(indicatorAngle)
    const indicatorY = center + indicatorRadius * Math.sin(indicatorAngle)

    ctx.beginPath()
    ctx.arc(indicatorX, indicatorY, 12, 0, Math.PI * 2)
    ctx.fillStyle = `oklch(0.6 0.2 ${selectedHue})`
    ctx.fill()
    ctx.strokeStyle = "white"
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = "rgba(0,0,0,0.3)"
    ctx.lineWidth = 1
    ctx.stroke()
  }, [selectedHue])

  useEffect(() => {
    drawWheel()
  }, [drawWheel])

  const getHueFromPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left - rect.width / 2
    const y = clientY - rect.top - rect.height / 2

    // Check if click is within the ring area
    const distance = Math.sqrt(x * x + y * y)
    const canvasScale = canvas.width / rect.width
    const outerRadius = (canvas.width / 2 - 4) / canvasScale
    const innerRadius = (outerRadius * canvasScale - 28) / canvasScale

    if (distance < innerRadius * 0.7 || distance > outerRadius * 1.2) return null

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    return Math.round(angle) % 360
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const hue = getHueFromPosition(e.clientX, e.clientY)
      if (hue !== null) {
        isDragging.current = true
        onHueChange(hue)
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }
    },
    [getHueFromPosition, onHueChange],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90
      if (angle < 0) angle += 360
      onHueChange(Math.round(angle) % 360)
    },
    [onHueChange],
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return (
    <div ref={containerRef} className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="cursor-pointer touch-none"
        style={{ width: 200, height: 200 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}

export default function SettingsPage() {
  const [preferredLanguage, setPreferredLanguage] = useState<"it" | "en">("it")
  const [accentHue, setAccentHue] = useState(DEFAULT_HUE)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [clearingStreamCache, setClearingStreamCache] = useState(false)
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("anizone:preferredLanguage")
      if (saved === "en" || saved === "it") {
        setPreferredLanguage(saved)
      }
      const savedHue = localStorage.getItem("anizone:accentHue")
      if (savedHue) {
        const hue = Number(savedHue)
        if (!isNaN(hue)) setAccentHue(hue)
      }
    } catch {}
  }, [])

  const handleLanguageChange = (value: string) => {
    const lang = value as "it" | "en"
    setPreferredLanguage(lang)
    try {
      localStorage.setItem("anizone:preferredLanguage", lang)
      window.dispatchEvent(new CustomEvent("anizone:language-changed", { detail: { language: lang } }))
    } catch {}
  }

  const handleAccentChange = (hue: number) => {
    setAccentHue(hue)
    try {
      localStorage.setItem("anizone:accentHue", String(hue))
      window.dispatchEvent(new CustomEvent("anizone:accent-changed", { detail: { hue } }))
    } catch {}
  }

  const handleResetAccent = () => {
    handleAccentChange(DEFAULT_HUE)
  }

  // Clear stream cache (localStorage keys starting with anizone:stream)
  const handleClearStreamCache = () => {
    setClearingStreamCache(true)
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("anizone:stream:")) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
      toast({
        title: "Cache streaming pulita",
        description: `${keysToRemove.length} elementi rimossi dalla cache.`,
      })
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile pulire la cache streaming.",
        variant: "destructive",
      })
    }
    setClearingStreamCache(false)
  }

  // Reset all data: delete data + log out + delete cache + delete theme/accent
  const handleResetAllData = async () => {
    try {
      // 1. Log out from AniList (clear server cookie)
      await fetch("/api/anilist/auth", { method: "DELETE" }).catch(() => {})

      // 2. Log out from Anizone auth
      localStorage.removeItem("anizone_user")

      // 3. Clear ALL localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) keysToRemove.push(key)
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      // 4. Clear sessionStorage
      sessionStorage.clear()

      // 5. Reset theme
      setTheme("dark")

      // 6. Reset accent to default
      window.dispatchEvent(new CustomEvent("anizone:accent-changed", { detail: { hue: DEFAULT_HUE } }))

      toast({
        title: "Dati resettati",
        description: "Tutti i dati sono stati cancellati. La pagina si ricaricherà.",
      })

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile resettare i dati.",
        variant: "destructive",
      })
    }
  }

  // Delete cache only
  const handleDeleteAllCache = () => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("anizone:stream:") || key.startsWith("anizone:sources:") || key.startsWith("anizone:meta:"))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
      sessionStorage.clear()

      toast({
        title: "Cache eliminata",
        description: `${keysToRemove.length} elementi cache rimossi.`,
      })
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la cache.",
        variant: "destructive",
      })
    }
  }

  // Delete theme and accent
  const handleDeleteThemeAndAccent = () => {
    try {
      localStorage.removeItem("anizone:accentHue")
      localStorage.removeItem("theme")
      setTheme("dark")
      setAccentHue(DEFAULT_HUE)
      window.dispatchEvent(new CustomEvent("anizone:accent-changed", { detail: { hue: DEFAULT_HUE } }))

      toast({
        title: "Tema resettato",
        description: "Tema e colore d'accento ripristinati ai valori predefiniti.",
      })
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile resettare il tema.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SlideOutMenu />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
            <p className="text-muted-foreground">Personalizza la tua esperienza su Anizone</p>
          </div>

          <div className="space-y-6">
            {/* Language Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Lingua Server Anime
                </CardTitle>
                <CardDescription>
                  Scegli da quali server streaming vuoi ricevere i contenuti anime
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={preferredLanguage} onValueChange={handleLanguageChange}>
                  <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="it" id="lang-it" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="lang-it" className="cursor-pointer font-medium">
                        Italiano
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Gli anime verranno cercati dai server italiani: World, Saturn, Unity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="en" id="lang-en" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="lang-en" className="cursor-pointer font-medium">
                        English
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Anime will be fetched from English servers: HNime (HD streaming, multiple subs options)
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                  <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nota importante</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Cambiando la lingua del server, i risultati di ricerca e le fonti di streaming cambieranno.
                      I tuoi preferiti e la cronologia rimarranno invariati.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Aspetto
                </CardTitle>
                <CardDescription>
                  Scegli il tema e il colore d{"'"}accento del sito
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Theme mode */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tema</Label>
                  {mounted && (
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === "light"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-sm font-medium">Chiaro</span>
                        {theme === "light" && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === "dark"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-sm font-medium">Scuro</span>
                        {theme === "dark" && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === "system"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 bg-card"
                        }`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-sm font-medium">Sistema</span>
                        {theme === "system" && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Accent color */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Colore d{"'"}accento</Label>
                    {accentHue !== DEFAULT_HUE && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetAccent}
                        className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Ripristina
                      </Button>
                    )}
                  </div>

                  {/* Preset colors */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ACCENTS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleAccentChange(preset.hue)}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                          accentHue === preset.hue
                            ? "border-foreground ring-2 ring-foreground/20 scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                        aria-label={`Colore accento ${preset.name}`}
                      >
                        {accentHue === preset.hue && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Color wheel */}
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <p className="text-xs text-muted-foreground">Oppure scegli un colore personalizzato</p>
                    <ColorWheel selectedHue={accentHue} onHueChange={handleAccentChange} />
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border border-border"
                        style={{ backgroundColor: `oklch(0.55 0.2 ${accentHue})` }}
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        Hue: {accentHue}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Zona Pericolosa
                </CardTitle>
                <CardDescription>
                  Azioni irreversibili. Procedi con cautela.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Clear Cache section */}
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Pulisci Cache
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elimina le cache locali per risolvere problemi di riproduzione o dati obsoleti.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={clearingStreamCache}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Cache Streaming
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Pulisci cache streaming?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questo eliminerà tutti gli URL di streaming salvati localmente (anizone:stream).
                            I video dovranno essere ricaricati dal server.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearStreamCache}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Pulisci
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                  </div>
                </div>

                {/* Reset Data section */}
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Reset Dati
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elimina dati, cache e preferenze. Queste azioni sono irreversibili.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Delete data and log out */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Elimina dati e logout
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare tutti i dati e disconnettersi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Verranno eliminati tutti i dati locali, la cache, le sessioni e verrai disconnesso da tutti gli account (Anizone e AniList). Questa azione non è reversibile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleResetAllData}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Elimina tutto
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete cache only */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Elimina tutta la cache
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare tutta la cache?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Verranno eliminate tutte le cache locali e del server. I dati degli account rimarranno intatti.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAllCache}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Elimina cache
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete theme and accent color */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Palette className="w-3.5 h-3.5 mr-1.5" />
                          Reset tema e accento
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resettare tema e colore d{"'"}accento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Il tema verrà impostato su scuro e il colore d{"'"}accento tornerà al blurple predefinito.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteThemeAndAccent}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Resetta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
