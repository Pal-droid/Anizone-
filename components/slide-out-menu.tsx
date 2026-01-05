"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation" // Added this
import { Menu, X, Film, BookOpen, Search, List, Calendar, Bug, ChevronRight, User, LogOut } from "lucide-react"
import { BugReportDialog } from "@/components/bug-report-dialog"
import { cn } from "@/lib/utils"
import { useAniList } from "@/contexts/anilist-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SlideOutMenuProps {
  hideButton?: boolean
}

export interface SlideOutMenuHandle {
  open: () => void
  close: () => void
}

export const SlideOutMenu = forwardRef<SlideOutMenuHandle, SlideOutMenuProps>(({ hideButton = false }, ref) => {
  const pathname = usePathname() // Use this instead of props
  const [isOpen, setIsOpen] = useState(false)
  const [showBugReport, setShowBugReport] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  const { user, logout, isLoading } = useAniList()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }))

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const menuItems = [
    { href: "/", icon: Film, label: "Anime", description: "Guarda serie e film", key: "anime" },
    { href: "/manga", icon: BookOpen, label: "Manga", description: "Leggi capitoli ITA", key: "manga" },
    { href: "/search", icon: Search, label: "Cerca", description: "Trova anime e manga", key: "search" },
    { href: "/lists", icon: List, label: "Le mie liste", description: "Preferiti e cronologia", key: "lists" },
    { href: "/schedule", icon: Calendar, label: "Calendario", description: "Prossime uscite", key: "schedule" },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const handleBugReport = () => {
    setShowBugReport(true)
    setIsOpen(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
    setIsOpen(false)
  }

  return (
    <>
      {!hideButton && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center text-foreground rounded-2xl transition-all duration-200 active:scale-95 hover:scale-110"
          aria-label="Apri menu"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          isOpen
            ? "bg-background/60 backdrop-blur-sm pointer-events-auto"
            : "bg-transparent backdrop-blur-none pointer-events-none",
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Menu Content */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 z-50 bg-card border-r border-border transform transition-transform duration-300 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                {!faviconError ? (
                  <img
                    src="/favicon.ico"
                    alt="Logo"
                    className="w-6 h-6 rounded-xl"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <span className="text-primary text-lg font-bold select-none">A</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Anizone</h2>
                <p className="text-xs text-muted-foreground">Streaming italiano</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* User Info Section */}
        {user && !isLoading && (
          <div className="px-3 pt-3 pb-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar?.large || user.avatar?.medium || undefined} />
                <AvatarFallback>
                  <User size={18} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-sm truncate">{user.name}</span>
                <span className="block text-xs text-muted-foreground">Account AniList</span>
              </div>
              <ChevronRight
                size={16}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ripple",
                    active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground group-hover:bg-muted",
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-sm">{item.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5 truncate">{item.description}</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={cn("text-muted-foreground transition-transform", "group-hover:translate-x-0.5")}
                  />
                </Link>
              )
            })}
          </div>

          <div className="my-4 mx-4 h-px bg-border" />

          {/* Logout Button */}
          {user && !isLoading && (
            <>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 w-full text-foreground hover:bg-muted/50 group ripple disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <LogOut size={20} />
                </div>
                <div className="flex-1 text-left">
                  <span className="block font-medium text-sm">{isLoggingOut ? "Uscendo..." : "Logout"}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Disconnetti account</span>
                </div>
              </button>

              <div className="my-4 mx-4 h-px bg-border" />
            </>
          )}

          {/* Bug Report */}
          <button
            onClick={handleBugReport}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 w-full text-foreground hover:bg-muted/50 group ripple"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <Bug size={20} />
            </div>
            <div className="flex-1 text-left">
              <span className="block font-medium text-sm">Segnala un bug</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Aiutaci a migliorare</span>
            </div>
          </button>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">Anizone v0.3.1 - Alpha</p>
        </div>
      </div>

      <BugReportDialog isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
    </>
  )
})

SlideOutMenu.displayName = "SlideOutMenu"
