import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AniListProvider } from "@/contexts/anilist-context"
import { SeasonalBackground } from "@/components/seasonal-background"
import { ThemeProvider } from "@/components/theme-provider"
import { AccentColorProvider } from "@/components/accent-color-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Anizone - Guarda e leggi Anime & Manga in italiano",
  description: "Cerca Anime & Manga con episodi sub/dub e scans ITA",
  generator: "pal",
  icons: {
    icon: "/favicon.ico",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1820" },
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: "Anizone - Guarda e leggi Anime & Manga in italiano",
    description: "Cerca Anime & Manga con episodi sub/dub e scans ITA",
    url: "/",
    siteName: "Anizone",
    type: "website",
    images: [
      {
        url: "/favicon.ico",
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
    <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased overscroll-none">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AccentColorProvider>
            <SeasonalBackground />
            <AniListProvider>{children}</AniListProvider>
            <Toaster />
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
