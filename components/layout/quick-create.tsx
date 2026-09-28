"use client"

import { useRouter } from "next/navigation"
import { BellRing, CalendarDays, FileBadge, FileClock, FilePen, FolderKanban, Gavel, HandCoins, Home, Plus, ShieldAlert, UserPlus } from "lucide-react"
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
import type { Capability } from "@/lib/permissions"

type QuickCreateItem = { label: string; icon: typeof Plus; module: ModuleKey; capability?: Capability } & (
  { kind: "route"; key: string; href: string } | { kind: "dialog"; key: CreatableEntity }
)

const ITEMS: QuickCreateItem[] = [
  { kind: "route", key: "resident", label: "Resident", icon: UserPlus, module: "residents", href: "/residents/new" },
  { kind: "dialog", key: "household", label: "Household", icon: Home, module: "households" },
  { kind: "dialog", key: "certificate", label: "Certificate", icon: FileBadge, module: "certificates" },
  { kind: "dialog", key: "request", label: "Service Request", icon: FileClock, module: "requests" },
  { kind: "dialog", key: "blotter", label: "Blotter Case", icon: Gavel, module: "blotter" },
  { kind: "route", key: "incident", label: "Incident", icon: ShieldAlert, module: "incidents", href: "/incidents/new" },
  { kind: "dialog", key: "announcement", label: "Announcement", icon: BellRing, module: "announcements" },
  // Phase 2
  { kind: "dialog", key: "collection", label: "Collection", icon: HandCoins, module: "collections", capability: "finance" },
  { kind: "dialog", key: "obligation", label: "Obligation", icon: FilePen, module: "obligations", capability: "finance" },
  {
    kind: "route",
    key: "session",
    label: "Barangay Session",
    icon: CalendarDays,
    module: "sessions",
    capability: "governance",
    href: "/governance/sessions/new",
  },
  { kind: "dialog", key: "project", label: "Project", icon: FolderKanban, module: "projects", capability: "operations" },
]

export function QuickCreate() {
  const router = useRouter()
  const { open } = useEntityDialogs()
  const { canAccess, can } = useCurrentUser()
  const items = ITEMS.filter((i) => canAccess(i.module) && can(i.capability ?? "write"))
  if (items.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus /> <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
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
