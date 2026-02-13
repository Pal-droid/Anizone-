"use client"

import Link from "next/link"
import { SlideOutMenu } from "@/components/slide-out-menu"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect } from "react"

function MaintenanceNotice() {
  useEffect(() => {
    // Prevent scrolling when popup is open
    document.body.style.overflow = 'hidden'
    
    // Create and append overlay directly to body
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(4px) !important;
      z-index: 99999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `
    
    const modal = document.createElement('div')
    modal.style.cssText = `
      max-width: 448px !important;
      width: 100% !important;
      background: white !important;
      border-radius: 8px !important;
      padding: 24px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      z-index: 100000000 !important;
      position: relative !important;
      text-align: center !important;
    `
    
    modal.innerHTML = `
      <div style="color: #eab308; margin-bottom: 16px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0f172a;">Ricerca Manga in Manutenzione</h2>
      <p style="color: #64748b; margin-bottom: 24px; line-height: 1.5;">
        La funzionalità di ricerca manga è attualmente in manutenzione per miglioramenti del sistema. 
        Riprova più tardi. Puoi comunque accedere ai manga direttamente dalle altre sezioni del sito.
      </p>
      <a href="/" style="
        display: inline-block;
        width: 100%;
        padding: 8px 16px;
        background: #0f172a;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: background-color 0.2s;
      " onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
        Torna alla Home
      </a>
    `
    
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    
    return () => {
      document.body.style.overflow = 'unset'
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay)
      }
    }
  }, [])

  return null // Render nothing in React, we're using DOM manipulation
}

export default function MangaSearchPage() {
  return (
    <main className="min-h-screen">
      <SlideOutMenu />

      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Anizone
          </Link>
        </div>
      </header>

      <MaintenanceNotice />
    </main>
  )
}
