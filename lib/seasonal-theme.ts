export type Season = "winter" | "spring" | "summer" | "autumn"

export interface ParticleLayer {
  depth: "far" | "mid" | "near"
  size: number
  speedY: [number, number]
  driftX: [number, number]
  opacity: number
  count: number
}

export interface SeasonalTheme {
  season: Season
  colors: {
    primary: string
    accent: string
    background: string
  }
  particles: {
    emoji: string          // backward-compatible
    count: number          // backward-compatible

    // new depth system (optional)
    layers?: ParticleLayer[]
  }
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1

  if (month >= 9 && month <= 11) return "autumn"
  if (month === 12 || month <= 2) return "winter"
  if (month >= 3 && month <= 5) return "spring"
  return "summer"
}

export function getSeasonalTheme(season: Season): SeasonalTheme {
  const themes: Record<Season, SeasonalTheme> = {
    autumn: {
      season: "autumn",
      colors: {
        primary: "oklch(0.55 0.15 40)",
        accent: "oklch(0.45 0.12 30)",
        background: "oklch(0.08 0.02 40 / 0.05)",
      },
      particles: {
        emoji: "🍂",
        count: 15,
        layers: [
          { depth: "far",  size: 0.6, speedY: [0.4,1.2], driftX: [-0.2,0.2], opacity: 0.35, count: 5 },
          { depth: "mid",  size: 1,   speedY: [1,2],    driftX: [-0.5,0.5], opacity: 0.7,  count: 7 },
          { depth: "near", size: 1.4, speedY: [2,3.2],  driftX: [-1,1],     opacity: 1,    count: 5 },
        ]
      },
    },

    winter: {
      season: "winter",
      colors: {
        primary: "oklch(0.7 0.1 240)",
        accent: "oklch(0.85 0.05 200)",
        background: "oklch(0.08 0.02 240 / 0.05)",
      },
      particles: {
        emoji: "❄️",
        count: 20,
        layers: [
          { depth: "far",  size: 0.5, speedY: [0.2,0.6], driftX: [-0.1,0.1], opacity: 0.25, count: 7 },
          { depth: "mid",  size: 0.9, speedY: [0.7,1.4], driftX: [-0.3,0.3], opacity: 0.6,  count: 9 },
          { depth: "near", size: 1.2, speedY: [1.2,2],   driftX: [-0.4,0.4], opacity: 1,    count: 7 },
        ]
      },
    },

    spring: {
      season: "spring",
      colors: {
        primary: "oklch(0.65 0.15 140)",
        accent: "oklch(0.75 0.12 330)",
        background: "oklch(0.08 0.02 140 / 0.05)",
      },
      particles: {
        emoji: "🌸",
        count: 12,
        layers: [
          { depth: "far",  size: 0.5, speedY: [0.3,1],   driftX: [-0.1,0.1], opacity: 0.35, count: 4 },
          { depth: "mid",  size: 1,   speedY: [0.7,1.4], driftX: [-0.2,0.2], opacity: 0.7,  count: 5 },
          { depth: "near", size: 1.3, speedY: [1.2,2],   driftX: [-0.4,0.4], opacity: 1,    count: 4 },
        ]
      },
    },

    summer: {
      season: "summer",
      colors: {
        primary: "oklch(0.7 0.2 60)",
        accent: "oklch(0.6 0.18 180)",
        background: "oklch(0.08 0.02 60 / 0.05)",
      },
      particles: {
        emoji: "☀️",
        count: 8,
        layers: [
          { depth: "far",  size: 0.5, speedY: [-0.2,0.2], driftX: [-0.1,0.1], opacity: 0.3,  count: 2 },
          { depth: "mid",  size: 1,   speedY: [0.1,0.4],  driftX: [-0.1,0.2], opacity: 0.7,  count: 3 },
          { depth: "near", size: 1.3, speedY: [0.4,0.8],  driftX: [-0.2,0.3], opacity: 1,    count: 3 },
        ]
      },
    },
  }

  return themes[season]
}
