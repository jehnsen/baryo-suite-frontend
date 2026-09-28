"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { FormContainerProps } from "./form-dialog"

/** Side-panel variant of FormDialog for long forms (residents, blotter). */
export function FormDrawer({ open, onOpenChange, title, description, formId, submitLabel = "Save", isSubmitting, children }: FormContainerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <SheetContent className="app-content gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b bg-accent/40 px-6 py-5 pr-12">
          <SheetTitle className="text-lg tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <SheetFooter className="shrink-0 flex-row flex-wrap justify-end border-t bg-muted/35 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
