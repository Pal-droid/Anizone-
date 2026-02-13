"use client"

import type React from "react"
import { useEffect } from "react"

// Default blurple hue = 280
const DEFAULT_HUE = 280

function applyAccentHue(hue: number) {
  const root = document.documentElement

  // Light theme primary overrides
  root.style.setProperty("--primary", `oklch(0.55 0.2 ${hue})`)
  root.style.setProperty("--primary-foreground", `oklch(1 0 0)`)
  root.style.setProperty("--ring", `oklch(0.55 0.2 ${hue} / 0.4)`)
  root.style.setProperty("--sidebar-primary", `oklch(0.55 0.2 ${hue})`)
  root.style.setProperty("--sidebar-primary-foreground", `oklch(1 0 0)`)
  root.style.setProperty("--sidebar-ring", `oklch(0.55 0.2 ${hue} / 0.4)`)
  root.style.setProperty("--chart-1", `oklch(0.55 0.2 ${hue})`)
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const savedHue = localStorage.getItem("anizone:accentHue")
      if (savedHue) {
        const hue = Number(savedHue)
        if (!isNaN(hue)) {
          applyAccentHue(hue)
        }
      }
    } catch {}

    const handleAccentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.hue !== undefined) {
        applyAccentHue(detail.hue)
      }
    }

    window.addEventListener("anizone:accent-changed", handleAccentChange)
    return () => window.removeEventListener("anizone:accent-changed", handleAccentChange)
  }, [])

  return <>{children}</>
}
