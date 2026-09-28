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
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetHeader className="h-14 justify-center border-b px-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <Brand subtitle={`Brgy. ${settings.barangayName}, ${settings.municipality}`} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-2.5 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="p-3">
          <SidebarFooterInfo />
        </div>
      </SheetContent>
    </Sheet>
  )
}
