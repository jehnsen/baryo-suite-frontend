"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { FileBadge, FilePlus2 } from "lucide-react"
import type { Certificate } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCertificates, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { CERTIFICATE_STATUSES, CERTIFICATE_TYPES, toOptions } from "@/lib/constants"
import { fullName } from "@/lib/format"
import { useCertificateColumns } from "./certificate-columns"
import { useCertificateTransition } from "./certificate-workflow"

export function CertificatesView() {
  const router = useRouter()
  const load = usePageLoad()
  const certificates = useCertificates()
  const { residents, officials } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const transition = useCertificateTransition()
  const canWrite = can("write")
  const canApprove = can("approve")
  const start = transition.start

  const options = useMemo(
    () => ({
      residents,
      officials,
      canWrite,
      canApprove,
      onView: (c: Certificate) => router.push(`/certificates/${c.id}`),
      onEdit: (c: Certificate) => open({ type: "certificate", record: c }),
      onTransition: start,
    }),
    [residents, officials, canWrite, canApprove, router, open, start],
  )
  const columns = useCertificateColumns(options)

  const filters: DataTableFilter<Certificate>[] = useMemo(
    () => [
      { id: "type", label: "Type", options: toOptions(CERTIFICATE_TYPES), getValue: (c) => c.type },
      { id: "status", label: "Status", options: toOptions(CERTIFICATE_STATUSES), getValue: (c) => c.status },
    ],
    [],
  )

  const counts = useMemo(() => {
    const by = (s: Certificate["status"]) => certificates.filter((c) => c.status === s).length
    return { draft: by("Draft"), pending: by("Pending"), approved: by("Approved"), released: by("Released") }
  }, [certificates])

  const data = load.demoEmpty ? [] : certificates

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Prepare, approve and release barangay certificates and clearances."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Certificates" }]}
        actions={
          canWrite && (
            <Button onClick={() => open({ type: "certificate" })}>
              <FilePlus2 /> Issue certificate
            </Button>
          )
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Drafts" value={counts.draft} hint="Not yet submitted" />
          <StatCard label="Awaiting approval" value={counts.pending} hint="Pending Punong Barangay" />
          <StatCard label="Ready for release" value={counts.approved} hint="Approved and signed" />
          <StatCard label="Released (all time)" value={counts.released} hint="Claimed by residents" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        getRowId={(c) => c.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search certificate no., resident, purpose…",
          getText: (c) => `${c.certificateNumber} ${fullName(residents.get(c.residentId))} ${c.purpose} ${c.type}`,
        }}
        filters={filters}
        dateFilter={{ label: "Date issued", getDate: (c) => c.dateIssued }}
        onRowClick={(c) => router.push(`/certificates/${c.id}`)}
        initialVisibility={{ issuedBy: false }}
        empty={{
          icon: FileBadge,
          title: "No certificates yet",
          description: "Issued certificates and clearances will appear here.",
          action: canWrite ? (
            <Button size="sm" onClick={() => open({ type: "certificate" })}>
              <FilePlus2 /> Issue certificate
            </Button>
          ) : undefined,
        }}
      />
      {transition.dialog}
    </div>
  )
}
