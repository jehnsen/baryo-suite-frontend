"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import type { Certificate } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatPeso } from "@/lib/format"
import { certificateActions, simulateLatency } from "@/lib/store/actions"

export type CertificateTransition = "submit" | "approve" | "release" | "cancel"

/** Which workflow actions a certificate in a given status allows. */
export function availableTransitions(c: Certificate): CertificateTransition[] {
  switch (c.status) {
    case "Draft":
      return ["submit", "cancel"]
    case "Pending":
      return ["approve", "cancel"]
    case "Approved":
      return ["release", "cancel"]
    default:
      return []
  }
}

export const TRANSITION_LABELS: Record<CertificateTransition, string> = {
  submit: "Submit for approval",
  approve: "Approve",
  release: "Release",
  cancel: "Cancel certificate",
}

/**
 * Confirmation dialog for certificate lifecycle actions. Release captures the
 * O.R. number for paid documents; cancel captures a reason.
 */
export function CertificateTransitionDialog({
  certificate,
  transition,
  onOpenChange,
}: {
  certificate: Certificate | null
  transition: CertificateTransition | null
  onOpenChange: (open: boolean) => void
}) {
  const [orNumber, setOrNumber] = useState("")
  const [reason, setReason] = useState("")
  const open = Boolean(certificate && transition)
  const c = certificate
  const needsOr = transition === "release" && (c?.fee ?? 0) > 0

  const copy: Record<CertificateTransition, { title: string; description: string; confirm: string }> = {
    submit: { title: "Submit for approval?", description: "The certificate will be queued for the Punong Barangay's approval.", confirm: "Submit" },
    approve: {
      title: "Approve certificate?",
      description: "Approving confirms the document is signed and ready to be released to the resident.",
      confirm: "Approve",
    },
    release: { title: "Release certificate?", description: "Mark the document as claimed by the resident.", confirm: "Mark as released" },
    cancel: {
      title: "Cancel certificate?",
      description: "Cancelled certificates stay on record but can no longer be printed or released.",
      confirm: "Cancel certificate",
    },
  }
  const t = transition ? copy[transition] : null

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOrNumber("")
          setReason("")
        }
        onOpenChange(o)
      }}
      title={t?.title ?? ""}
      description={
        c && (
          <>
            <span className="font-mono">{c.certificateNumber}</span> · {c.type}. {t?.description}
          </>
        )
      }
      confirmLabel={t?.confirm}
      destructive={transition === "cancel"}
      confirmDisabled={(needsOr && !orNumber.trim()) || (transition === "cancel" && !reason.trim())}
      onConfirm={async () => {
        if (!c || !transition) return
        await simulateLatency(450)
        if (transition === "submit") certificateActions.setStatus(c.id, "Pending")
        if (transition === "approve") certificateActions.setStatus(c.id, "Approved")
        if (transition === "release") certificateActions.setStatus(c.id, "Released", needsOr ? { orNumber: orNumber.trim() } : {})
        if (transition === "cancel") certificateActions.setStatus(c.id, "Cancelled", { remarks: reason.trim() })
        toast.success(
          { submit: "Submitted for approval", approve: "Certificate approved", release: "Certificate released", cancel: "Certificate cancelled" }[transition],
          { description: c.certificateNumber },
        )
      }}
    >
      {needsOr && (
        <div className="space-y-1.5">
          <Label htmlFor="or-number">
            Official Receipt No. <span className="text-destructive">*</span>
          </Label>
          <Input id="or-number" value={orNumber} onChange={(e) => setOrNumber(e.target.value)} placeholder="e.g. OR-0045821" autoFocus />
          <p className="text-xs text-muted-foreground">Fee collected: {formatPeso(c!.fee)}</p>
        </div>
      )}
      {transition === "cancel" && (
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Erroneous entry – wrong purpose"
            autoFocus
          />
        </div>
      )}
    </ConfirmDialog>
  )
}

/** Local state helper for opening the transition dialog from lists and detail pages. */
export function useCertificateTransition() {
  const [state, setState] = useState<{ certificate: Certificate; transition: CertificateTransition } | null>(null)
  const start = useCallback((certificate: Certificate, transition: CertificateTransition) => setState({ certificate, transition }), [])
  return {
    start,
    dialog: (
      <CertificateTransitionDialog certificate={state?.certificate ?? null} transition={state?.transition ?? null} onOpenChange={(o) => !o && setState(null)} />
    ),
  }
}
