"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getCurrentSeason, getSeasonalTheme } from "@/lib/seasonal-theme"

interface Particle {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
}

export function SeasonalBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [hasPlayed, setHasPlayed] = useState(false)
  const season = getCurrentSeason()
  const theme = getSeasonalTheme(season)

  useEffect(() => {
    console.log("[v0] Current season:", season)
    console.log("[v0] Has played:", hasPlayed)

    if (hasPlayed || season !== "winter") return

    const newParticles: Particle[] = Array.from({ length: theme.particles.count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 20,
      animationDelay: Math.random() * 5,
      size: 0.8 + Math.random() * 0.4,
    }))

    console.log("[v0] Generated particles:", newParticles.length)
    setParticles(newParticles)
    setHasPlayed(true)
  }, [season, theme.particles.count, hasPlayed])

  if (season !== "winter") {
    return null
  }

  console.log("[v0] Rendering snow particles:", particles.length)

  return (
    <>
      {/* Seasonal color overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(ellipse at top, ${theme.colors.background} 0%, transparent 50%)`,
        }}
      />

      {/* Animated snow particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-fall-snow"
            style={{
              left: `${particle.left}%`,
              top: "-5%",
              animationDuration: `${particle.animationDuration}s`,
              animationDelay: `${particle.animationDelay}s`,
            }}
          >
            <div
              className="snowflake"
              style={
                {
                  "--size": `${particle.size}`,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>
    </>
  )
}
