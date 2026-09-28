"use client"

import { useSettings } from "@/hooks/use-data"
import { MapPin } from "lucide-react"
import { Brand } from "./brand"
import { SidebarNav } from "./sidebar-nav"

export function SidebarFooterInfo() {
  const settings = useSettings()
  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4 text-xs text-sidebar-foreground">
      <MapPin className="mb-3 size-4 text-sidebar-primary" aria-hidden="true" />
      <p className="font-semibold">Barangay {settings.barangayName}</p>
      <p className="mt-1 text-sidebar-foreground/70">
        {settings.municipality}, {settings.province}
      </p>
      <p className="mt-3 border-t border-sidebar-border pt-3 text-[10px] tracking-wide text-sidebar-foreground/60">PSGC {settings.barangayCode}</p>
    </div>
  )
}

export function AppSidebar() {
  const settings = useSettings()
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b border-sidebar-border px-4">
        <Brand subtitle={`Brgy. ${settings.barangayName}, ${settings.municipality}`} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <SidebarNav />
      </div>
      <div className="shrink-0 p-4">
        <SidebarFooterInfo />
      </div>
    </aside>
  )
}
