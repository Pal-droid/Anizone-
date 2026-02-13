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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=localStorage.getItem("anizone:accentHue");if(h){var n=Number(h);if(!isNaN(n)){var r=document.documentElement;r.style.setProperty("--primary","oklch(0.75 0.15 "+n+")");r.style.setProperty("--primary-foreground","oklch(0.15 0.02 "+n+")");r.style.setProperty("--ring","oklch(0.75 0.15 "+n+" / 0.5)");r.style.setProperty("--sidebar-primary","oklch(0.75 0.15 "+n+")");r.style.setProperty("--sidebar-primary-foreground","oklch(0.15 0.02 "+n+")");r.style.setProperty("--sidebar-ring","oklch(0.75 0.15 "+n+" / 0.5)");r.style.setProperty("--chart-1","oklch(0.75 0.15 "+n+")");r.style.setProperty("--accent","oklch(0.72 0.14 "+n+")");r.style.setProperty("--accent-foreground","oklch(0.15 0.02 "+n+")");r.style.setProperty("--sidebar-accent","oklch(0.72 0.14 "+n+")");r.style.setProperty("--sidebar-accent-foreground","oklch(0.15 0.02 "+n+")")}}}catch(e){}})();`,
          }}
        />
      </head>
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
