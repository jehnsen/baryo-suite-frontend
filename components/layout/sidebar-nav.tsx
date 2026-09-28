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
    <nav className="flex flex-col gap-4" aria-label="Main">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) => canAccess(i.module))
        if (items.length === 0) return null
        return (
          <div key={group.label} className="space-y-0.5">
            <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
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
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className={cn("size-4", active ? "text-sidebar-primary" : "text-muted-foreground")} />
                  <span className="flex-1 truncate">{item.title}</span>
                  {badge ? (
                    <span className="rounded-full bg-sidebar-primary/10 px-1.5 text-[11px] font-semibold text-sidebar-primary tabular-nums">{badge}</span>
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
