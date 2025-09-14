"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Film, BookOpen, Search, List, Calendar, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BugReportDialog } from "@/components/bug-report-dialog"

interface SlideOutMenuProps {
  currentPath?: string
}

export function SlideOutMenu({ currentPath = "/" }: SlideOutMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)

  const menuItems = [
    { href: "/", icon: Film, label: "Anime", key: "anime" },
    { href: "/manga", icon: BookOpen, label: "Manga", key: "manga" },
    { href: "/search", icon: Search, label: "Cerca", key: "search" },
    { href: "/lists", icon: List, label: "Liste", key: "lists" },
    { href: "/schedule", icon: Calendar, label: "Calendario", key: "schedule" },
  ]

  const isActive = (href: string) => {
    if (href === "/" && currentPath === "/") return true
    if (href !== "/" && currentPath.startsWith(href)) return true
    return false
  }

  const handleBugReport = () => {
    setShowBugReport(true)
    setIsOpen(false)
  }

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 glass-strong border border-border/30 text-foreground hover:text-primary transition-smooth hover:glow"
      >
        <Menu size={20} />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 glass-strong border-r border-border/30 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <h2 className="text-xl font-bold text-primary font-[var(--font-playfair)]">Anizone</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-smooth hover:glow group ${
                      active
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`group-hover:scale-110 transition-transform ${active ? "text-primary" : ""}`}
                    />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}

              {/* Bug Report Button */}
              <button
                onClick={handleBugReport}
                className="flex items-center gap-4 px-4 py-3 rounded-lg transition-smooth hover:glow group text-muted-foreground hover:text-primary hover:bg-muted/50 w-full text-left"
              >
                <Bug size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Segnala Bug</span>
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center">Guarda anime e manga in italiano</p>
          </div>
        </div>
      </div>

      {/* Bug Report Dialog */}
      <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
    </>
  )
}
