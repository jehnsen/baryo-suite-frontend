"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2, CircleDot, FileBadge, PackageCheck, SearchCheck, Send, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { RequestStatus, ServiceRequest } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { NotesPanel } from "@/components/shared/notes-panel"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline, type TimelineItem } from "@/components/shared/timeline"
import { useCurrentUser, useLookups, useServiceRequests, useUsers } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { REQUEST_FLOW, SERVICE_TO_CERTIFICATE } from "@/lib/constants"
import { formatAddress, formatDateTime, formatPeso, fullName } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { requestActions, simulateLatency } from "@/lib/store/actions"

const STEP_ICONS: Record<RequestStatus, typeof CircleDot> = {
  Submitted: Send,
  "Under Review": SearchCheck,
  Approved: CheckCircle2,
  "Ready for Release": FileBadge,
  Completed: PackageCheck,
  Rejected: XCircle,
}

interface Step {
  to: RequestStatus
  label: string
  description: string
  destructive?: boolean
  requiresNote?: boolean
}

/** Next workflow steps allowed from the current status. */
function nextSteps(r: ServiceRequest): Step[] {
  const isDocument = Boolean(SERVICE_TO_CERTIFICATE[r.service])
  switch (r.status) {
    case "Submitted":
      return [{ to: "Under Review", label: "Start review", description: "Verify identity, residency and requirements." }]
    case "Under Review":
      return [
        {
          to: "Approved",
          label: "Approve",
          description: isDocument ? "A certificate will be created for processing." : "The service request will be approved.",
        },
        { to: "Rejected", label: "Reject", description: "The resident will be informed of the reason.", destructive: true, requiresNote: true },
      ]
    case "Approved":
      return isDocument
        ? [{ to: "Ready for Release", label: "Mark ready for release", description: "The certificate is printed and signed; it will be marked Approved." }]
        : [{ to: "Completed", label: "Mark completed", description: "The service has been rendered." }]
    case "Ready for Release":
      return [{ to: "Completed", label: "Release & complete", description: "The resident has claimed the document; the certificate will be marked Released." }]
    default:
      return []
  }
}

export function RequestDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const request = useServiceRequests().find((r) => r.id === id)
  return (
    <LoadState load={load}>
      {request ? <RequestDetailContent r={request} /> : <RecordNotFound entity="Service request" backHref="/requests" backLabel="Back to requests" />}
    </LoadState>
  )
}

function RequestDetailContent({ r }: { r: ServiceRequest }) {
  const { residents, users, certificates } = useLookups()
  const allUsers = useUsers()
  const { can } = useCurrentUser()
  const [step, setStep] = useState<Step | null>(null)
  const [note, setNote] = useState("")
  const [orNumber, setOrNumber] = useState("")
  const resident = residents.get(r.residentId)
  const certificate = r.certificateId ? certificates.get(r.certificateId) : undefined
  // Releasing a paid document through the request still needs the official receipt.
  const needsOr = step?.to === "Completed" && Boolean(certificate && certificate.fee > 0)
  const steps = nextSteps(r).filter((s) => (s.to === "Approved" || s.to === "Rejected" ? can("approve") : can("write")))

  // Timeline: completed history, then the remaining happy-path steps as pending.
  const reachedFlow = r.history.map((h) => h.status)
  const timeline: TimelineItem[] = [
    ...r.history.map((h, i) => ({
      id: `${h.status}-${i}`,
      title: h.status,
      icon: STEP_ICONS[h.status],
      tone: toneFor(h.status),
      timestamp: formatDateTime(h.at),
      description: (
        <>
          {h.byUserId ? `by ${users.get(h.byUserId)?.name ?? "Staff"}` : "Filed by resident"}
          {h.note && <span className="mt-0.5 block text-foreground/80">“{h.note}”</span>}
        </>
      ),
    })),
    ...(r.status === "Rejected"
      ? []
      : REQUEST_FLOW.filter((s) => !reachedFlow.includes(s)).map((s) => ({ id: s, title: s, icon: STEP_ICONS[s], pending: true }))),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Service Requests", href: "/requests" }, { label: r.requestNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {r.service} <StatusBadge status={r.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{r.requestNumber}</span> · filed {formatDateTime(r.dateRequested)} via {r.channel.toLowerCase()}
          </>
        }
        actions={steps.map((s) => (
          <Button key={s.to} variant={s.destructive ? "destructive" : "default"} onClick={() => setStep(s)}>
            {s.label}
          </Button>
        ))}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Request">
            <DetailList
              items={[
                { label: "Service", value: r.service },
                { label: "Channel", value: r.channel },
                { label: "Purpose", value: r.purpose, full: true },
                { label: "Details", value: r.details, full: true },
                {
                  label: "Certificate",
                  value: certificate ? (
                    <Link href={`/certificates/${certificate.id}`} className="inline-flex items-center gap-2 hover:underline">
                      <span className="font-mono text-xs">{certificate.certificateNumber}</span> <StatusBadge status={certificate.status} />
                    </Link>
                  ) : SERVICE_TO_CERTIFICATE[r.service] ? (
                    <span className="text-muted-foreground">Created automatically on approval</span>
                  ) : (
                    "Not applicable"
                  ),
                },
              ]}
            />
          </SectionCard>
          <SectionCard title="Internal notes" description="Visible to barangay staff only.">
            <NotesPanel
              notes={r.notes}
              users={users}
              onAdd={
                can("write")
                  ? async (body) => {
                      await simulateLatency(300)
                      requestActions.addNote(r.id, body)
                    }
                  : undefined
              }
            />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Resident">
            {resident ? (
              <div className="space-y-3">
                <Link href={`/residents/${resident.id}`} className="flex items-center gap-3 hover:underline">
                  <PersonAvatar name={fullName(resident)} size="md" />
                  <span>
                    <span className="block font-medium">{fullName(resident)}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{resident.residentNumber}</span>
                  </span>
                </Link>
                <DetailList
                  columns={1}
                  items={[
                    { label: "Address", value: formatAddress(resident.address) },
                    { label: "Contact", value: resident.contactNumber },
                  ]}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Resident record unavailable.</p>
            )}
          </SectionCard>
          <SectionCard title="Assigned staff">
            <Select
              value={r.assignedToId ?? ""}
              disabled={!can("write") || r.status === "Completed" || r.status === "Rejected"}
              onValueChange={(v) => {
                requestActions.assign(r.id, v)
                toast.success("Request reassigned", { description: users.get(v)?.name })
              }}
            >
              <SelectTrigger className="w-full" aria-label="Assigned staff">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter((u) => u.status === "Active" && u.role === "Secretary")
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </SectionCard>
          <SectionCard title="Status timeline">
            <Timeline items={timeline} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(step)}
        onOpenChange={(o) => {
          if (!o) {
            setStep(null)
            setNote("")
            setOrNumber("")
          }
        }}
        title={step ? `${step.label}?` : ""}
        description={step?.description}
        confirmLabel={step?.label}
        destructive={step?.destructive}
        confirmDisabled={(step?.requiresNote && !note.trim()) || (needsOr && !orNumber.trim())}
        onConfirm={async () => {
          if (!step) return
          await simulateLatency(450)
          requestActions.setStatus(r.id, step.to, note.trim() || undefined, { orNumber: orNumber.trim() || undefined })
          toast.success(`Request ${step.to.toLowerCase()}`, {
            description: step.to === "Approved" && SERVICE_TO_CERTIFICATE[r.service] ? "Certificate created and queued for approval." : r.requestNumber,
          })
          setNote("")
          setOrNumber("")
        }}
      >
        {needsOr && (
          <div className="space-y-1.5">
            <Label htmlFor="request-or">
              Official Receipt No. <span className="text-destructive">*</span>
            </Label>
            <Input id="request-or" value={orNumber} onChange={(e) => setOrNumber(e.target.value)} placeholder="e.g. OR-0045821" />
            <p className="text-xs text-muted-foreground">Fee collected: {formatPeso(certificate!.fee)}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="step-note">
            {step?.requiresNote ? "Reason" : "Note"}{" "}
            {step?.requiresNote ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
          </Label>
          <Textarea
            id="step-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={step?.requiresNote ? "e.g. Incomplete requirements – no valid ID" : "Visible in the status timeline"}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
