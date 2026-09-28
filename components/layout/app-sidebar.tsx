"use client"

import { useSettings } from "@/hooks/use-data"
import { Brand } from "./brand"
import { SidebarNav } from "./sidebar-nav"

export function SidebarFooterInfo() {
  const settings = useSettings()
  return (
    <div className="rounded-lg border bg-background/60 p-3 text-xs">
      <p className="font-medium">Barangay {settings.barangayName}</p>
      <p className="text-muted-foreground">
        {settings.municipality}, {settings.province}
      </p>
      <p className="mt-1 text-muted-foreground">PSGC {settings.barangayCode}</p>
    </div>
  )
}

export function AppSidebar() {
  const settings = useSettings()
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Brand subtitle={`Brgy. ${settings.barangayName}, ${settings.municipality}`} />
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        <SidebarNav />
      </div>
      <div className="p-3">
        <SidebarFooterInfo />
      </div>
    </aside>
  )
}
