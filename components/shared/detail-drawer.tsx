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
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 pr-12">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
          {meta && <div className="flex flex-wrap items-center gap-1.5 pt-1">{meta}</div>}
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
