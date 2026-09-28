"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, CheckCircle2, Eye, Gavel, Pencil, Plus, ShieldAlert } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import type { Incident, IncidentStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DetailDrawer } from "@/components/shared/detail-drawer"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { Timeline } from "@/components/shared/timeline"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { markdownPreviewComponents } from "@/components/forms"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useIncidents, useLookups, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, INCIDENT_TYPES, toOptions } from "@/lib/constants"
import { formatDate, formatDateTime, formatTime, officialName } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { incidentActions } from "@/lib/store/actions"

const col = createAppColumnHelper<Incident>()

const NEXT: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  Reported: ["Investigating", "Resolved"],
  Investigating: ["Resolved", "Closed"],
  Resolved: ["Closed"],
}

export function IncidentsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const load = usePageLoad()
  const incidents = useIncidents()
  const settings = useSettings()
  const { officials, users } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canWrite = can("write")
  // Row clicks set local state; deep links (e.g. from global search) use ?open=<id>.
  const [viewId, setViewId] = useState<string | null>(null)
  const viewing = incidents.find((i) => i.id === (viewId ?? searchParams.get("open")))

  const escalate = (i: Incident) =>
    open({ type: "blotter", defaults: { incidentId: i.id, date: i.date, time: i.time, location: i.location, narrative: i.description } })

  const setStatus = (i: Incident, s: IncidentStatus) => {
    incidentActions.setStatus(i.id, s)
    toast.success(`Incident marked ${s.toLowerCase()}`, { description: i.incidentNumber })
  }

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("incidentNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Incident No." />,
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Incident No." },
          enableHiding: false,
        }),
        col.accessor((i) => `${i.date}T${i.time}`, {
          id: "date",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ row }) => (
            <span className="whitespace-nowrap tabular-nums">
              {formatDate(row.original.date)} <span className="text-muted-foreground">{formatTime(row.original.time)}</span>
            </span>
          ),
          meta: { label: "Date" },
        }),
        col.accessor("type", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
          cell: ({ row, getValue }) => (
            <span className="flex items-center gap-2 whitespace-nowrap">
              {getValue()} {row.original.severity !== "Low" && <StatusBadge status={row.original.severity} showDot={false} />}
            </span>
          ),
          meta: { label: "Type" },
        }),
        col.accessor("location", {
          header: "Location",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-60">{getValue()}</span>,
          meta: { label: "Location" },
        }),
        col.accessor("description", {
          header: "Description",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-72 text-muted-foreground">{getValue()}</span>,
          enableSorting: false,
          meta: { label: "Description" },
        }),
        col.accessor((i) => i.personsInvolved.join(", "), {
          id: "persons",
          header: "Persons Involved",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-56">{getValue() || "—"}</span>,
          meta: { label: "Persons Involved" },
        }),
        col.accessor((i) => officialName(officials.get(i.assignedOfficerId ?? "")), {
          id: "officer",
          header: "Assigned Officer",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Assigned Officer" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => {
            const i = row.original
            return (
              <RowActions
                actions={[
                  { label: "Quick view", icon: Eye, onSelect: () => setViewId(i.id) },
                  { label: "Edit", icon: Pencil, onSelect: () => router.push(`/incidents/${i.id}/edit`), hidden: !canWrite },
                  ...(NEXT[i.status] ?? []).map((s) => ({
                    label: `Mark ${s.toLowerCase()}`,
                    icon: CheckCircle2,
                    onSelect: () => setStatus(i, s),
                    hidden: !canWrite,
                  })),
                  { label: "Escalate to blotter", icon: Gavel, onSelect: () => escalate(i), hidden: !canWrite || Boolean(i.blotterId), separator: true },
                ]}
              />
            )
          },
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers close over stable store actions
    [officials, open, router, canWrite],
  )

  const filters: DataTableFilter<Incident>[] = useMemo(
    () => [
      { id: "type", label: "Type", options: toOptions(INCIDENT_TYPES), getValue: (i) => i.type },
      { id: "status", label: "Status", options: toOptions(INCIDENT_STATUSES), getValue: (i) => i.status },
      { id: "severity", label: "Severity", options: toOptions(INCIDENT_SEVERITIES), getValue: (i) => i.severity },
      { id: "purok", label: "Purok", options: settings.puroks.map((p) => ({ label: p.name, value: p.name })), getValue: (i) => i.purok },
    ],
    [settings.puroks],
  )

  const closeDrawer = () => {
    setViewId(null)
    if (searchParams.get("open")) router.replace("/incidents")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Records"
        description="Operational log of incidents — separate from formal blotter complaints."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Incidents" }]}
        actions={
          canWrite && (
            <Button onClick={() => router.push("/incidents/new")}>
              <Plus /> Report incident
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : incidents}
        getRowId={(i) => i.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search incident no., location, persons…",
          getText: (i) => `${i.incidentNumber} ${i.location} ${i.description} ${i.personsInvolved.join(" ")} ${i.reportedBy}`,
        }}
        filters={filters}
        dateFilter={{ getDate: (i) => i.date }}
        onRowClick={(i) => setViewId(i.id)}
        initialSorting={[{ id: "date", desc: true }]}
        initialVisibility={{ description: false, persons: false }}
        empty={{
          icon: ShieldAlert,
          title: "No incidents recorded",
          description: "Incidents reported to the barangay — accidents, fires, thefts — are logged here.",
          action: canWrite ? (
            <Button size="sm" onClick={() => router.push("/incidents/new")}>
              Report incident
            </Button>
          ) : undefined,
        }}
      />

      <DetailDrawer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && closeDrawer()}
        title={viewing ? `${viewing.type}` : ""}
        description={viewing && <span className="font-mono">{viewing.incidentNumber}</span>}
        meta={
          viewing && (
            <>
              <StatusBadge status={viewing.status} />
              <StatusBadge status={viewing.severity} showDot={false} />
              {viewing.purok && <TagBadge>{viewing.purok}</TagBadge>}
            </>
          )
        }
        footer={
          viewing &&
          canWrite && (
            <>
              <Button variant="outline" onClick={() => router.push(`/incidents/${viewing.id}/edit`)}>
                <Pencil /> Edit
              </Button>
              {!viewing.blotterId && (
                <Button variant="outline" onClick={() => escalate(viewing)}>
                  <Gavel /> Escalate to blotter
                </Button>
              )}
              {(NEXT[viewing.status] ?? []).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>Update status</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(NEXT[viewing.status] ?? []).map((s) => (
                      <DropdownMenuItem key={s} onSelect={() => setStatus(viewing, s)}>
                        Mark {s.toLowerCase()}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )
        }
      >
        {viewing && (
          <>
            <DetailList
              items={[
                { label: "Date", value: formatDate(viewing.date, "MMMM d, yyyy") },
                { label: "Time", value: formatTime(viewing.time) },
                { label: "Location", value: viewing.location, full: true },
                {
                  label: "Description",
                  value: (
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown components={markdownPreviewComponents}>{viewing.description}</ReactMarkdown>
                    </div>
                  ),
                  full: true,
                },
                { label: "Persons involved", value: viewing.personsInvolved.length ? viewing.personsInvolved.join(", ") : undefined, full: true },
                { label: "Reported by", value: viewing.reportedBy },
                { label: "Assigned officer", value: officialName(officials.get(viewing.assignedOfficerId ?? "")) },
                {
                  label: "Blotter case",
                  value: viewing.blotterId ? (
                    <Link href={`/blotter/${viewing.blotterId}`} className="inline-flex items-center gap-1 hover:underline">
                      View linked case <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : (
                    "Not escalated"
                  ),
                  full: true,
                },
              ]}
            />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Status history</h3>
              <Timeline
                items={viewing.history.map((h, idx) => ({
                  id: `${h.status}-${idx}`,
                  title: h.status,
                  tone: toneFor(h.status),
                  timestamp: formatDateTime(h.at),
                  description: h.byUserId ? `by ${users.get(h.byUserId)?.name ?? "Staff"}` : undefined,
                }))}
              />
            </div>
          </>
        )}
      </DetailDrawer>
    </div>
  )
}
