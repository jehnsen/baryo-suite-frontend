"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useSettings } from "@/hooks/use-data"
import { Brand } from "./brand"
import { SidebarFooterInfo } from "./app-sidebar"
import { SidebarNav } from "./sidebar-nav"

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const settings = useSettings()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="app-sidebar w-72 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
      >
        <SheetHeader className="h-24 justify-center border-b border-sidebar-border px-6">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <Brand subtitle={`Brgy. ${settings.barangayName}, ${settings.municipality}`} />
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="p-3">
          <SidebarFooterInfo />
        </div>
      </SheetContent>
    </Sheet>
  )
}
