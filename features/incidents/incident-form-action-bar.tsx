"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Sticky submit/cancel bar for the full-page incident create/edit forms. */
export function IncidentFormActionBar({
  formId,
  submitLabel,
  isSubmitting,
  onCancel,
}: {
  formId: string
  submitLabel: string
  isSubmitting: boolean
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
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
