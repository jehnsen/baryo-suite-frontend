"use client"

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface DetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Badges/meta shown under the title. */
  meta?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

/** Read-only quick view for a record without leaving the list. */
export function DetailDrawer({ open, onOpenChange, title, description, meta, footer, children }: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="app-content gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b bg-accent/40 px-6 py-6 pr-12">
          <SheetTitle className="text-lg tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
          {meta && <div className="flex flex-wrap items-center gap-1.5 pt-1">{meta}</div>}
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <SheetFooter className="shrink-0 flex-row flex-wrap justify-end gap-2 border-t bg-muted/35 px-6 py-4">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
