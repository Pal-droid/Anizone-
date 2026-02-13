"use client"

import type React from "react"
import { useEffect } from "react"

export function applyAccentHue(hue: number) {
  const root = document.documentElement

  // These work in both light and dark because the CSS variables
  // are overridden on :root (which applies before .dark specificity
  // for inline styles). The dark theme uses different lightness values
  // but the hue is the same. We set all the hue-bearing tokens here.

  // Dark theme values (default theme)
  root.style.setProperty("--primary", `oklch(0.75 0.15 ${hue})`)
  root.style.setProperty("--primary-foreground", `oklch(0.15 0.02 ${hue})`)
  root.style.setProperty("--ring", `oklch(0.75 0.15 ${hue} / 0.5)`)
  root.style.setProperty("--sidebar-primary", `oklch(0.75 0.15 ${hue})`)
  root.style.setProperty("--sidebar-primary-foreground", `oklch(0.15 0.02 ${hue})`)
  root.style.setProperty("--sidebar-ring", `oklch(0.75 0.15 ${hue} / 0.5)`)
  root.style.setProperty("--chart-1", `oklch(0.75 0.15 ${hue})`)
  root.style.setProperty("--accent", `oklch(0.72 0.14 ${hue})`)
  root.style.setProperty("--accent-foreground", `oklch(0.15 0.02 ${hue})`)
  root.style.setProperty("--sidebar-accent", `oklch(0.72 0.14 ${hue})`)
  root.style.setProperty("--sidebar-accent-foreground", `oklch(0.15 0.02 ${hue})`)
}

export function removeAccentOverrides() {
  const root = document.documentElement
  const props = [
    "--primary", "--primary-foreground", "--ring",
    "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-ring",
    "--chart-1", "--accent", "--accent-foreground",
    "--sidebar-accent", "--sidebar-accent-foreground",
  ]
  props.forEach((p) => root.style.removeProperty(p))
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The blocking script in <head> already applied the hue before paint,
    // so this effect just wires up the listener for live changes.
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
