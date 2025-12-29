"use client"

import type React from "react"

import { useState } from "react"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAniList } from "@/contexts/anilist-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QuickListManager } from "@/components/quick-list-manager"

interface ListEditButtonProps {
  mediaId?: number
  itemId: string
  itemTitle: string
  itemImage?: string
  itemPath?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ListEditButton({
  mediaId,
  itemId,
  itemTitle,
  itemImage,
  itemPath,
  className,
  size = "md",
}: ListEditButtonProps) {
  const { user } = useAniList()
  const [showDialog, setShowDialog] = useState(false)

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDialog(true)
  }

  if (!user) return null

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          sizeClasses[size],
          "rounded-full flex items-center justify-center",
          "bg-background/90 backdrop-blur-sm border border-border",
          "hover:scale-110 active:scale-95 transition-all duration-200",
          "text-muted-foreground hover:text-primary",
          className,
        )}
        aria-label="Edit lists"
      >
        <List size={iconSizes[size]} />
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{itemTitle}</DialogTitle>
            <DialogDescription>Gestisci le tue liste per questo elemento</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <QuickListManager
              itemId={itemId}
              itemTitle={itemTitle}
              itemImage={itemImage}
              anilistMediaId={mediaId}
              itemPath={itemPath}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
