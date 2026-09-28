import {
  Banknote,
  BellRing,
  Boxes,
  CalendarDays,
  ChartColumn,
  ChartPie,
  FileBadge,
  FileClock,
  FilePen,
  FolderKanban,
  Gavel,
  HandCoins,
  Home,
  LayoutDashboard,
  Monitor,
  NotebookPen,
  PiggyBank,
  Receipt,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  UserCog,
  Users,
  UsersRound,
  Vote,
  Wallet,
  type LucideIcon,
} from "lucide-react"
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
    label: "Finance & Treasury",
    items: [
      { title: "Finance Dashboard", href: "/finance", icon: Wallet, module: "finance-dashboard" },
      { title: "Annual Budget", href: "/finance/budget", icon: PiggyBank, module: "budget" },
      { title: "Budget Allocations", href: "/finance/allocations", icon: ChartPie, module: "allocations" },
      { title: "Collections", href: "/finance/collections", icon: HandCoins, module: "collections" },
      { title: "Obligations", href: "/finance/obligations", icon: FilePen, module: "obligations" },
      { title: "Disbursements", href: "/finance/disbursements", icon: Banknote, module: "disbursements" },
      { title: "Expenses", href: "/finance/expenses", icon: Receipt, module: "expenses" },
      { title: "Financial Reports", href: "/finance/reports", icon: ChartColumn, module: "financial-reports" },
    ],
  },
  {
    label: "Governance",
    items: [
      { title: "Barangay Sessions", href: "/governance/sessions", icon: CalendarDays, module: "sessions" },
      { title: "Ordinances", href: "/governance/ordinances", icon: ScrollText, module: "ordinances" },
      { title: "Resolutions", href: "/governance/resolutions", icon: Stamp, module: "resolutions" },
      { title: "Committees", href: "/governance/committees", icon: UsersRound, module: "committees" },
      { title: "Minutes", href: "/governance/minutes", icon: NotebookPen, module: "minutes" },
      { title: "Barangay Assemblies", href: "/governance/assemblies", icon: Vote, module: "assemblies" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Programs & Projects", href: "/projects", icon: FolderKanban, module: "projects" },
      { title: "Assets", href: "/assets", icon: Monitor, module: "assets" },
      { title: "Inventory", href: "/inventory", icon: Boxes, module: "inventory" },
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

/**
 * Routes not in the sidebar that belong to a module. A PPA is budget data
 * (finance roles) and also the parent of a project (operations roles), so
 * either module grants access.
 */
const EXTRA_ROUTES: { prefix: string; title: string; modules: ModuleKey[] }[] = [
  { prefix: "/ppas", title: "Programs, Projects & Activities", modules: ["allocations", "projects"] },
]

export interface RouteAccess {
  title: string
  modules: ModuleKey[]
}

/** Resolve which module(s) a pathname belongs to (longest prefix wins). */
export function accessForPath(pathname: string): RouteAccess | undefined {
  const extra = EXTRA_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
  if (extra) return extra
  const item = ALL_NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]
  return item ? { title: item.title, modules: [item.module] } : undefined
}
