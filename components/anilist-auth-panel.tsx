"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { useAniList } from "@/contexts/anilist-context"

export function AniListAuthPanel() {
  const { user, login, logout, isLoading } = useAniList()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Account AniList</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Caricamento...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Account AniList</CardTitle>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar?.large || user.avatar?.medium || undefined} />
                <AvatarFallback>
                  <User size={24} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm">
                  Connesso come <span className="font-medium">{user.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">AniList ID: {user.id}</div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Accedi con il tuo account AniList per sincronizzare le tue liste anime e manga
            </p>
            <Button onClick={login} className="w-full">
              Accedi con AniList
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
