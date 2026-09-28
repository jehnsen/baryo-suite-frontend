"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/hooks/use-data"
import { simulateLatency } from "@/lib/store/actions"
import { transitionsFrom, type WorkflowDefinition, type WorkflowTransition } from "@/lib/workflows"
import { ConfirmDialog } from "./confirm-dialog"

interface WorkflowActionsProps<S extends string> {
  workflow: WorkflowDefinition<S>
  status: S
  /** Perform the transition. Return a string to block it with an error message. */
  onTransition: (to: S, values: { remarks?: string } & Record<string, string | undefined>) => string | void | Promise<string | void>
  /** Optional guard: return a reason to disable a transition (e.g. missing documents). */
  disabledReason?: (t: WorkflowTransition<S>) => string | undefined
  recordLabel?: string
}

/** Buttons for every transition the current user may perform, with a confirmation + remarks step. */
export function WorkflowActions<S extends string>({ workflow, status, onTransition, disabledReason, recordLabel }: WorkflowActionsProps<S>) {
  const { can } = useCurrentUser()
  const [active, setActive] = useState<WorkflowTransition<S> | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const transitions = transitionsFrom(workflow, status, can)
  if (transitions.length === 0) return null

  const primary = transitions.filter((t) => !t.destructive)
  const secondary = transitions.filter((t) => t.destructive)
  const missing = active
    ? (active.requiresRemarks && !values.remarks?.trim()) || (active.fields ?? []).some((f) => f.required && !values[f.name]?.trim())
    : false

  const open = (t: WorkflowTransition<S>) => {
    setValues({})
    setError(null)
    setActive(t)
  }

  return (
    <>
      {secondary.map((t) => (
        <Button key={t.label} variant="outline" onClick={() => open(t)} disabled={Boolean(disabledReason?.(t))} title={disabledReason?.(t)}>
          {t.label}
        </Button>
      ))}
      {primary.map((t, i) => (
        <Button
          key={t.label}
          variant={i === primary.length - 1 ? "default" : "outline"}
          onClick={() => open(t)}
          disabled={Boolean(disabledReason?.(t))}
          title={disabledReason?.(t)}
        >
          {t.label}
        </Button>
      ))}
      <ConfirmDialog
        open={Boolean(active)}
        onOpenChange={(o) => !o && setActive(null)}
        title={active ? `${active.label}?` : ""}
        description={
          active && (
            <>
              {recordLabel && <span className="font-medium text-foreground">{recordLabel}. </span>}
              {active.description}
            </>
          )
        }
        confirmLabel={active?.label}
        destructive={active?.destructive}
        confirmDisabled={missing}
        onConfirm={async () => {
          if (!active) return false
          await simulateLatency(450)
          const result = await onTransition(active.to, { ...values, remarks: values.remarks?.trim() || undefined })
          if (typeof result === "string") {
            setError(result)
            return false
          }
          toast.success(`${workflow.name} ${active.to.toLowerCase()}`, { description: recordLabel })
        }}
      >
        <div className="space-y-3">
          {(active?.fields ?? []).map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`wf-${f.name}`}>
                {f.label} {f.required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={`wf-${f.name}`}
                value={values[f.name] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="wf-remarks">
              Remarks {active?.requiresRemarks ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id="wf-remarks"
              rows={3}
              value={values.remarks ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, remarks: e.target.value }))}
              placeholder="Recorded in the approval timeline"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </ConfirmDialog>
    </>
  )
}
