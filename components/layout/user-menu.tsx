"use client"

import { Check, LogOut, UserCog } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { useCurrentUser, useUsers } from "@/hooks/use-data"
import { sessionActions } from "@/lib/store/actions"
import { ROLES } from "@/lib/constants"

/** Account menu with a mock "view as role" switcher for demonstrating RBAC. */
export function UserMenu() {
  const { user } = useCurrentUser()
  const users = useUsers()
  const demoUsers = ROLES.map((role) => users.find((u) => u.role === role && u.status === "Active")).filter(Boolean)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5">
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog /> View as role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Demo role-based access</DropdownMenuLabel>
              {demoUsers.map((u) => (
                <DropdownMenuItem
                  key={u!.id}
                  onSelect={() => {
                    sessionActions.switchUser(u!.id)
                    toast.success(`Now viewing as ${u!.role}`, { description: u!.name })
                  }}
                >
                  <span className="flex-1">
                    <span className="block">{u!.role}</span>
                    <span className="block text-xs text-muted-foreground">{u!.name}</span>
                  </span>
                  {u!.id === user.id && <Check />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast.info("Sign-out is disabled in the demo", { description: "Authentication will be connected in a later phase." })}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
