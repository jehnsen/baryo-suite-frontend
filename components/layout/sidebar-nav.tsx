"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_GROUPS } from "@/lib/navigation"
import { useCurrentUser, useServiceRequests, useBlotters } from "@/hooks/use-data"
import { cn } from "@/lib/utils"

/** Role-filtered navigation shared by the desktop and mobile sidebars. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { canAccess } = useCurrentUser()
  const requests = useServiceRequests()
  const blotters = useBlotters()

  const badges: Record<string, number> = {
    "/requests": requests.filter((r) => r.status === "Submitted" || r.status === "Under Review").length,
    "/blotter": blotters.filter((b) => b.status === "Reported").length,
  }

  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) => canAccess(i.module))
        if (items.length === 0) return null
        return (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/55 uppercase">{group.label}</p>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/")
              const badge = badges[item.href]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon aria-hidden="true" className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
                  <span className="flex-1 truncate">{item.title}</span>
                  {badge ? (
                    <span className="rounded-md bg-sidebar-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary tabular-nums">{badge}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
