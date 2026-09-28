"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "./confirm-dialog"
import { UtilizationBar } from "./progress-metric"

/** Update a 0–100% accomplishment figure with an optional remark. */
export function ProgressUpdateDialog({
  open,
  onOpenChange,
  title = "Update physical progress",
  current,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  current: number
  onSave: (value: number, remarks?: string) => void | Promise<void>
}) {
  const [value, setValue] = useState(String(current))
  const [remarks, setRemarks] = useState("")
  const n = Number(value)
  const valid = value !== "" && Number.isFinite(n) && n >= 0 && n <= 100
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(String(current))
        onOpenChange(o)
      }}
      title={title}
      description="Based on the latest inspection or accomplishment report."
      confirmLabel="Save progress"
      confirmDisabled={!valid}
      onConfirm={() => onSave(Math.round(n), remarks.trim() || undefined)}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="progress-value">Accomplishment (%)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="progress-value"
              type="range"
              min={0}
              max={100}
              step={5}
              value={valid ? n : 0}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 flex-1 px-0"
            />
            <Input type="number" min={0} max={100} value={value} onChange={(e) => setValue(e.target.value)} className="w-20" aria-label="Progress percent" />
          </div>
          <UtilizationBar value={valid ? n : 0} tone="info" />
          {!valid && <p className="text-xs text-destructive">Enter a value from 0 to 100.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="progress-remarks">Remarks</Label>
          <Textarea
            id="progress-remarks"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Per inspection report dated…"
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}
