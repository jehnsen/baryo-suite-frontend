"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Sticky submit/cancel bar for full-page create/edit forms. */
export function FormActionBar({
  formId,
  submitLabel,
  isSubmitting,
  onCancel,
  secondary,
}: {
  formId: string
  submitLabel: string
  isSubmitting: boolean
  onCancel: () => void
  /** Extra actions shown before Cancel (e.g. "Save as draft"). */
  secondary?: React.ReactNode
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-card/95 shadow-[0_-4px_24px_-12px_rgb(24_57_34/0.15)] backdrop-blur supports-backdrop-filter:bg-card/85 lg:left-60">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {secondary}
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
