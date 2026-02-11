"use client"

import { useState, useEffect } from "react"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Globe, Info } from "lucide-react"
import { motion } from "framer-motion"

export default function SettingsPage() {
  const [preferredLanguage, setPreferredLanguage] = useState<"it" | "en">("it")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("anizone:preferredLanguage")
      if (saved === "en" || saved === "it") {
        setPreferredLanguage(saved)
      }
    } catch { }
  }, [])

  const handleLanguageChange = (value: string) => {
    const lang = value as "it" | "en"
    setPreferredLanguage(lang)
    try {
      localStorage.setItem("anizone:preferredLanguage", lang)
      window.dispatchEvent(new CustomEvent("anizone:language-changed", { detail: { language: lang } }))
    } catch { }
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
                        Gli anime verranno cercati dai server italiani: AnimeWorld, AnimeSaturn, AnimeUnity.
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
                        Anime will be fetched from English servers: HiAnime (HD streaming, multiple audio options)
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

            {/* Future Settings Placeholder */}
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>Altre Impostazioni</CardTitle>
                <CardDescription>Altre opzioni saranno disponibili presto</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Tema, notifiche, qualità video e altre preferenze saranno aggiunte nelle prossime versioni.
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
