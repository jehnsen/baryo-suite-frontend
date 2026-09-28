import { BellRing, FileBadge, FileClock, Gavel, Home, LayoutDashboard, Settings, ShieldAlert, ShieldCheck, UserCog, Users, type LucideIcon } from "lucide-react"
import type { ModuleKey } from "@/types"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  module: ModuleKey
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Sidebar structure. Future modules (Health, DRRM, Finance…) are added as new
 * groups here plus a ModuleKey — nothing else in the shell needs to change.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" }],
  },
  {
    label: "Residents",
    items: [
      { title: "Residents", href: "/residents", icon: Users, module: "residents" },
      { title: "Households", href: "/households", icon: Home, module: "households" },
    ],
  },
  {
    label: "Services",
    items: [
      { title: "Certificates", href: "/certificates", icon: FileBadge, module: "certificates" },
      { title: "Service Requests", href: "/requests", icon: FileClock, module: "requests" },
    ],
  },
  {
    label: "Peace & Order",
    items: [
      { title: "Blotter", href: "/blotter", icon: Gavel, module: "blotter" },
      { title: "Incidents", href: "/incidents", icon: ShieldAlert, module: "incidents" },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Officials", href: "/officials", icon: ShieldCheck, module: "officials" },
      { title: "Announcements", href: "/announcements", icon: BellRing, module: "announcements" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users", href: "/admin/users", icon: UserCog, module: "users" },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: FileClock, module: "audit-logs" },
      { title: "Settings", href: "/settings", icon: Settings, module: "settings" },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/** Resolve which module a pathname belongs to (longest prefix wins). */
export function moduleForPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]
}
