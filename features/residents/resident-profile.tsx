"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Check, FileBadge, FileClock, Home, MapPin, MoreHorizontal, Pencil, Phone, X } from "lucide-react"
import { toast } from "sonner"
import type { Certificate, Resident } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable } from "@/components/tables/data-table"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAuditLogs, useCertificates, useCurrentUser, useHouseholdMembers, useLookups, useResidents, useServiceRequests } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { auditToActivity } from "@/lib/activity"
import { CLASSIFICATION_LABELS } from "@/lib/constants"
import { computeAge, formatAddress, formatDate, fullName } from "@/lib/format"
import { residentActions, simulateLatency } from "@/lib/store/actions"
import { cn } from "@/lib/utils"
import { useCertificateColumns } from "@/features/certificates/certificate-columns"
import { useCertificateTransition } from "@/features/certificates/certificate-workflow"
import { HouseholdMembersTable } from "@/features/households/household-members-table"
import { ResidentBadges } from "./resident-badges"

export function ResidentProfile({ id }: { id: string }) {
  const load = usePageLoad()
  const resident = useResidents().find((r) => r.id === id)
  return (
    <LoadState load={load}>
      {resident ? <ResidentProfileContent resident={resident} /> : <RecordNotFound entity="Resident" backHref="/residents" backLabel="Back to residents" />}
    </LoadState>
  )
}

function ResidentProfileContent({ resident: r }: { resident: Resident }) {
  const router = useRouter()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const { households, officials, residents, users } = useLookups()
  const allCertificates = useCertificates()
  const requests = useServiceRequests()
  const logs = useAuditLogs()
  const household = r.householdId ? households.get(r.householdId) : undefined
  const members = useHouseholdMembers(r.householdId)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const transition = useCertificateTransition()
  const canWrite = can("write")
  const canApprove = can("approve")
  const start = transition.start

  const certificates = useMemo(() => allCertificates.filter((c) => c.residentId === r.id), [allCertificates, r.id])
  const residentRequests = useMemo(() => requests.filter((q) => q.residentId === r.id), [requests, r.id])
  const activity = useMemo(() => {
    const related = new Set([r.id, ...certificates.map((c) => c.id), ...residentRequests.map((q) => q.id)])
    return logs
      .filter((l) => l.recordId && related.has(l.recordId))
      .slice(0, 20)
      .map((l) => auditToActivity(l, users))
  }, [logs, users, r.id, certificates, residentRequests])

  const certOptions = useMemo(
    () => ({
      residents,
      officials,
      canWrite,
      canApprove,
      hideResident: true,
      onView: (c: Certificate) => router.push(`/certificates/${c.id}`),
      onEdit: (c: Certificate) => open({ type: "certificate", record: c }),
      onTransition: start,
    }),
    [residents, officials, canWrite, canApprove, router, open, start],
  )
  const certColumns = useCertificateColumns(certOptions)
  const age = computeAge(r.birthDate)
  const active = r.status === "Active"

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Residents", href: "/residents" }, { label: fullName(r) }]} title="Resident profile" />

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-col gap-5 md:flex-row md:items-start">
          <PersonAvatar name={fullName(r)} src={r.photoUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{fullName(r)}</h2>
              <StatusBadge status={r.status} />
              <ResidentBadges classification={r.classification} full />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{r.residentNumber}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span>
                {age} years old · {r.gender}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {formatAddress(r.address)}
              </span>
              {r.contactNumber && (
                <a href={`tel:${r.contactNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="size-3.5" /> {r.contactNumber}
                </a>
              )}
              {household && (
                <Link href={`/households/${household.id}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Home className="size-3.5" /> {household.householdNumber}
                </Link>
              )}
            </div>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push(`/residents/${r.id}/edit`)}>
                <Pencil /> Edit
              </Button>
              {active && (
                <Button onClick={() => open({ type: "certificate", defaults: { residentId: r.id } })}>
                  <FileBadge /> Issue certificate
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {active && (
                    <DropdownMenuItem onSelect={() => open({ type: "request", defaults: { residentId: r.id } })}>
                      <FileClock /> New service request
                    </DropdownMenuItem>
                  )}
                  {r.status !== "Archived" ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => setArchiveOpen(true)}>
                      <Archive /> Archive resident
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={() => {
                        residentActions.restore(r.id)
                        toast.success("Resident restored")
                      }}
                    >
                      <Archive /> Restore resident
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      <ContentTabs
        tabs={[
          {
            value: "personal",
            label: "Personal Information",
            content: (
              <SectionCard>
                <DetailList
                  columns={3}
                  items={[
                    { label: "First name", value: r.firstName },
                    { label: "Middle name", value: r.middleName },
                    { label: "Last name", value: r.lastName },
                    { label: "Suffix", value: r.suffix },
                    { label: "Birth date", value: `${formatDate(r.birthDate, "MMMM d, yyyy")} (${age} yrs)` },
                    { label: "Birthplace", value: r.birthplace },
                    { label: "Sex", value: r.gender },
                    { label: "Civil status", value: r.civilStatus },
                    { label: "Nationality", value: r.nationality },
                    { label: "Occupation", value: r.occupation },
                    { label: "Contact number", value: r.contactNumber },
                    { label: "Email", value: r.email },
                    { label: "Registered", value: formatDate(r.createdAt) },
                    { label: "Last updated", value: formatDate(r.updatedAt) },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            value: "address",
            label: "Address",
            content: (
              <SectionCard>
                <DetailList
                  columns={3}
                  items={[
                    { label: "House / Lot No.", value: r.address.houseNumber },
                    { label: "Street", value: r.address.street },
                    { label: "Sitio", value: r.address.sitio },
                    { label: "Purok", value: r.address.purok },
                    { label: "Years of residency", value: `${r.yearsOfResidency} year${r.yearsOfResidency === 1 ? "" : "s"}` },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            value: "household",
            label: "Household",
            count: members.length || undefined,
            content: household ? (
              <div className="space-y-4">
                <SectionCard
                  title={
                    <Link href={`/households/${household.id}`} className="hover:underline">
                      Household {household.householdNumber}
                    </Link>
                  }
                  actions={<StatusBadge status={household.status} />}
                >
                  <DetailList
                    columns={3}
                    items={[
                      { label: "Household head", value: fullName(residents.get(household.headId)) },
                      { label: "Relationship to head", value: r.relationshipToHead },
                      { label: "Address", value: formatAddress(household.address) },
                      { label: "Housing type", value: household.housingType },
                      { label: "Ownership", value: household.ownershipStatus },
                      { label: "Income range", value: household.incomeRange },
                    ]}
                  />
                </SectionCard>
                <SectionCard title={`Members (${members.length})`} contentClassName="px-0">
                  <HouseholdMembersTable members={members} highlightId={r.id} />
                </SectionCard>
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={Home}
                  title="Not assigned to a household"
                  description="Assign this resident to an existing household from the household profile, or edit the resident."
                  action={
                    canWrite ? (
                      <Button size="sm" variant="outline" onClick={() => router.push(`/residents/${r.id}/edit`)}>
                        Assign household
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            ),
          },
          {
            value: "classification",
            label: "Classification",
            content: (
              <SectionCard>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {(Object.keys(CLASSIFICATION_LABELS) as (keyof typeof CLASSIFICATION_LABELS)[]).map((k) => {
                    const on = r.classification[k]
                    return (
                      <li
                        key={k}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                          on ? "border-primary/25 bg-accent/60" : "text-muted-foreground",
                        )}
                      >
                        <span className={cn("flex size-5 items-center justify-center rounded-full", on ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          {on ? <Check className="size-3" /> : <X className="size-3" />}
                        </span>
                        {CLASSIFICATION_LABELS[k]}
                      </li>
                    )
                  })}
                </ul>
              </SectionCard>
            ),
          },
          {
            value: "documents",
            label: "Documents",
            count: certificates.length,
            content: (
              <div className="space-y-4">
                <DataTable
                  columns={certColumns}
                  data={certificates}
                  getRowId={(c) => c.id}
                  exportable={false}
                  pageSize={5}
                  onRowClick={(c) => router.push(`/certificates/${c.id}`)}
                  initialVisibility={{ issuedBy: false }}
                  empty={{
                    icon: FileBadge,
                    title: "No certificates issued",
                    description: "Certificates issued to this resident will be listed here.",
                    action:
                      canWrite && active ? (
                        <Button size="sm" onClick={() => open({ type: "certificate", defaults: { residentId: r.id } })}>
                          Issue certificate
                        </Button>
                      ) : undefined,
                  }}
                />
                {residentRequests.length > 0 && (
                  <SectionCard title="Service requests">
                    <ul className="divide-y">
                      {residentRequests.map((q) => (
                        <li key={q.id}>
                          <Link href={`/requests/${q.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{q.service}</span>
                              <span className="block text-xs text-muted-foreground">
                                <span className="font-mono">{q.requestNumber}</span> · {formatDate(q.dateRequested)}
                              </span>
                            </span>
                            <StatusBadge status={q.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </div>
            ),
          },
          {
            value: "activity",
            label: "Activity",
            content: (
              <SectionCard>
                <ActivityFeed items={activity} emptyLabel="No recorded activity for this resident" />
              </SectionCard>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive resident?"
        description={`${fullName(r)} will be hidden from pickers and reports. The record can be restored later.`}
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          await simulateLatency(400)
          residentActions.archive(r.id)
          toast.success("Resident archived", { description: fullName(r) })
        }}
      />
      {transition.dialog}
    </div>
  )
}
