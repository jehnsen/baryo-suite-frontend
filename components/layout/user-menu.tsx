"use client"

import Link from "next/link"
import { KeyRound, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { useCurrentUser } from "@/hooks/use-data"
import { authActions } from "@/lib/store/auth-actions"

/** Account menu: who is signed in, access overview (Administrator) and sign-out. */
export function UserMenu() {
  const { user, canAccess } = useCurrentUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 gap-2.5 px-1.5" aria-label={`Account menu for ${user.name}`}>
          <PersonAvatar name={user.name} size="sm" />
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-36 truncate text-sm font-medium">{user.name}</span>
            <span className="block text-[11px] text-muted-foreground">{user.role}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{user.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canAccess("users") && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users?tab=access">
              <KeyRound /> Access & permissions
            </Link>
          </DropdownMenuItem>
        )}
        {/* SessionGate sends the signed-out tab to /login. */}
        <DropdownMenuItem onSelect={() => authActions.signOut()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
