import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Source_Sans_3 as Source_Sans_Pro } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { SeasonalBackground } from "@/components/seasonal-background"

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "700"],
})

const sourceSansPro = Source_Sans_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "600"],
})

// --- Dynamic, domain-agnostic metadata ---
export const metadata: Metadata = {
  title: "Anizone - Guarda e leggi Anime & Manga in italiano",
  description: "Cerca Anime & Manga con episodi sub/dub e scans ITA",
  generator: "pal",
  icons: {
    icon: "/favicon.ico", // browser favicon
  },
  openGraph: {
    title: "Anizone - Guarda e leggi Anime & Manga in italiano",
    description: "Cerca Anime & Manga con episodi sub/dub e scans ITA",
    url: "/", // relative path works dynamically in Next.js
    siteName: "Anizone",
    type: "website",
    images: [
      {
        url: "/favicon.ico", // relative OG image, Next.js will resolve
        width: 64,
        height: 64,
        alt: "Anizone Logo",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${playfairDisplay.variable} ${sourceSansPro.variable}`}>
      <body className="font-sans antialiased">
        <SeasonalBackground />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
