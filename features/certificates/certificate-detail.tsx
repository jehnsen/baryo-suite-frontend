"use client"

import Link from "next/link"
import type { Certificate } from "@/types"
import { Ban, CheckCircle2, FilePen, FileText, PackageCheck, Pencil, Printer, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DetailList } from "@/components/shared/detail-list"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline, type TimelineItem } from "@/components/shared/timeline"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCertificates, useCurrentUser, useLookups, useServiceRequests, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatPeso, fullName, officialName } from "@/lib/format"
import { CertificateDocument } from "./certificate-document"
import { availableTransitions, TRANSITION_LABELS, useCertificateTransition } from "./certificate-workflow"

const STEPS = [
  { status: "Draft", title: "Prepared", icon: FilePen },
  { status: "Pending", title: "Submitted for approval", icon: Send },
  { status: "Approved", title: "Approved & signed", icon: CheckCircle2 },
  { status: "Released", title: "Released to resident", icon: PackageCheck },
] as const

export function CertificateDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const certificate = useCertificates().find((c) => c.id === id)
  return (
    <LoadState load={load}>
      {certificate ? (
        <CertificateDetailContent c={certificate} />
      ) : (
        <RecordNotFound entity="Certificate" backHref="/certificates" backLabel="Back to certificates" />
      )}
    </LoadState>
  )
}

function CertificateDetailContent({ c }: { c: Certificate }) {
  const requests = useServiceRequests()
  const settings = useSettings()
  const { residents, officials } = useLookups()
  const { can } = useCurrentUser()
  const { open } = useEntityDialogs()
  const transition = useCertificateTransition()
  const resident = residents.get(c.residentId)
  const request = c.requestId ? requests.find((r) => r.id === c.requestId) : undefined
  const reached = STEPS.findIndex((s) => s.status === c.status)
  const timeline: TimelineItem[] =
    c.status === "Cancelled"
      ? [
          { id: "prepared", title: "Prepared", icon: FilePen, tone: "info", timestamp: formatDate(c.createdAt) },
          { id: "cancelled", title: "Cancelled", icon: Ban, tone: "danger", description: c.remarks },
        ]
      : STEPS.map((s, i) => ({
          id: s.status,
          title: s.title,
          icon: s.icon,
          tone: i === reached ? (c.status === "Released" ? "success" : "info") : "success",
          pending: i > reached,
          timestamp: i === 0 ? formatDate(c.createdAt) : s.status === "Released" && c.status === "Released" ? formatDate(c.dateIssued) : undefined,
        }))
  const transitions = availableTransitions(c).filter((t) => (t === "approve" ? can("approve") : can("write")))
  const printable = c.status === "Approved" || c.status === "Released"

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Certificates", href: "/certificates" }, { label: c.certificateNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.type} <StatusBadge status={c.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{c.certificateNumber}</span> · for{" "}
            <Link href={`/residents/${c.residentId}`} className="font-medium text-foreground hover:underline">
              {fullName(resident)}
            </Link>
          </>
        }
        actions={
          <>
            {can("write") && (c.status === "Draft" || c.status === "Pending") && (
              <Button variant="outline" onClick={() => open({ type: "certificate", record: c })}>
                <Pencil /> Edit
              </Button>
            )}
            <Button variant="outline" asChild disabled={!printable}>
              <Link
                href={printable ? `/certificates/${c.id}/print` : "#"}
                target="_blank"
                aria-disabled={!printable}
                className={!printable ? "pointer-events-none opacity-50" : undefined}
              >
                <Printer /> Print
              </Link>
            </Button>
            {transitions
              .filter((t) => t !== "cancel")
              .map((t) => (
                <Button key={t} onClick={() => transition.start(c, t)}>
                  {t === "approve" ? <CheckCircle2 /> : t === "release" ? <PackageCheck /> : <Send />}
                  {TRANSITION_LABELS[t]}
                </Button>
              ))}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard
          title="Print preview"
          description={printable ? "This is how the document will print on A4." : "Preview only — printing is enabled once the certificate is approved."}
          actions={<FileText className="size-4 text-muted-foreground" />}
          contentClassName="overflow-x-auto bg-muted/40 py-6"
        >
          {resident ? (
            <div className="min-w-[620px]">
              <CertificateDocument
                certificate={c}
                resident={resident}
                settings={settings}
                punongBarangay={officials.get(settings.punongBarangayId)}
                preparedBy={officials.get(c.issuedById)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Resident record unavailable.</p>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Details">
            <DetailList
              columns={1}
              items={[
                {
                  label: "Resident",
                  value: (
                    <Link href={`/residents/${c.residentId}`} className="font-medium hover:underline">
                      {fullName(resident)}
                    </Link>
                  ),
                },
                { label: "Purpose", value: c.purpose },
                { label: "Date", value: formatDate(c.dateIssued, "MMMM d, yyyy") },
                { label: "Valid until", value: c.validUntil ? formatDate(c.validUntil, "MMMM d, yyyy") : "No expiry" },
                { label: "Fee", value: c.fee > 0 ? formatPeso(c.fee) : "Free of charge" },
                { label: "O.R. number", value: c.orNumber },
                { label: "Issuing officer", value: officialName(officials.get(c.issuedById)) },
                {
                  label: "Service request",
                  value: request ? (
                    <Link href={`/requests/${request.id}`} className="font-mono text-xs hover:underline">
                      {request.requestNumber}
                    </Link>
                  ) : (
                    "Walk-in (no request)"
                  ),
                },
                { label: "Remarks", value: c.remarks },
              ]}
            />
          </SectionCard>
          <SectionCard title="Lifecycle">
            <Timeline items={timeline} />
          </SectionCard>
          {transitions.includes("cancel") && (
            <Button variant="destructive" className="w-full" onClick={() => transition.start(c, "cancel")}>
              <Ban /> Cancel certificate
            </Button>
          )}
        </div>
      </div>
      {transition.dialog}
    </div>
  )
}
