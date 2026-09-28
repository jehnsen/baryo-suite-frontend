"use client"

import { useRouter } from "next/navigation"
import { BellRing, FileBadge, FileClock, Gavel, Home, Plus, ShieldAlert, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEntityDialogs, type CreatableEntity } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser } from "@/hooks/use-data"
import type { ModuleKey } from "@/types"

type QuickCreateItem =
  | { kind: "route"; key: string; label: string; icon: typeof Plus; module: ModuleKey; href: string }
  | { kind: "dialog"; key: CreatableEntity; label: string; icon: typeof Plus; module: ModuleKey }

const ITEMS: QuickCreateItem[] = [
  { kind: "route", key: "resident", label: "Resident", icon: UserPlus, module: "residents", href: "/residents/new" },
  { kind: "dialog", key: "household", label: "Household", icon: Home, module: "households" },
  { kind: "dialog", key: "certificate", label: "Certificate", icon: FileBadge, module: "certificates" },
  { kind: "dialog", key: "request", label: "Service Request", icon: FileClock, module: "requests" },
  { kind: "dialog", key: "blotter", label: "Blotter Case", icon: Gavel, module: "blotter" },
  { kind: "route", key: "incident", label: "Incident", icon: ShieldAlert, module: "incidents", href: "/incidents/new" },
  { kind: "dialog", key: "announcement", label: "Announcement", icon: BellRing, module: "announcements" },
]

export function QuickCreate() {
  const router = useRouter()
  const { open } = useEntityDialogs()
  const { canAccess, can } = useCurrentUser()
  const items = ITEMS.filter((i) => canAccess(i.module))
  if (!can("write") || items.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-10 gap-2 px-3.5 shadow-sm" aria-label="Create new record">
          <Plus /> <span className="hidden sm:inline">Quick create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Create new</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((i) => (
          <DropdownMenuItem key={i.key} onSelect={() => (i.kind === "route" ? router.push(i.href) : open({ type: i.key }))}>
            <i.icon /> {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
