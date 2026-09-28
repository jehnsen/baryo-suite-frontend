"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface FormContainerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** id of the <form> rendered in children; the footer submit button targets it. */
  formId: string
  submitLabel?: string
  isSubmitting?: boolean
  children: React.ReactNode
}

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" } as const

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel = "Save",
  isSubmitting,
  children,
  size = "md",
}: FormContainerProps & { size?: keyof typeof SIZES }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className={cn("app-content flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0", SIZES[size])}>
        <DialogHeader className="shrink-0 border-b bg-accent/40 px-6 py-5 pr-12">
          <DialogTitle className="text-lg tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <DialogFooter className="m-0 shrink-0 rounded-none border-t bg-muted/35 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
