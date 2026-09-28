"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, Gavel, Pencil, Plus } from "lucide-react"
import type { BlotterCase } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useBlotters, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { BLOTTER_INCIDENT_TYPES, BLOTTER_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, formatTime, officialName, toISODate } from "@/lib/format"

const col = createAppColumnHelper<BlotterCase>()

export function BlotterView() {
  const router = useRouter()
  const load = usePageLoad()
  const blotters = useBlotters()
  const { officials } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canWrite = can("write")

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("blotterNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Blotter No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/blotter/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Blotter No." },
          enableHiding: false,
        }),
        col.accessor((b) => `${b.date}T${b.time}`, {
          id: "date",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ row }) => (
            <span className="whitespace-nowrap tabular-nums">
              {formatDate(row.original.date)} <span className="text-muted-foreground">{formatTime(row.original.time)}</span>
            </span>
          ),
          meta: { label: "Date" },
        }),
        col.accessor((b) => b.complainant.name, {
          id: "complainant",
          header: "Complainant",
          cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Complainant" },
        }),
        col.accessor((b) => b.respondent.name, {
          id: "respondent",
          header: "Respondent",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Respondent" },
        }),
        col.accessor("incidentType", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Incident Type" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Incident Type" },
        }),
        col.accessor((b) => officialName(officials.get(b.assignedOfficerId ?? "")), {
          id: "officer",
          header: "Assigned Officer",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Assigned Officer" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "View case", icon: Eye, onSelect: () => router.push(`/blotter/${row.original.id}`) },
                {
                  label: "Edit case",
                  icon: Pencil,
                  onSelect: () => open({ type: "blotter", record: row.original }),
                  hidden: !canWrite || ["Closed", "Settled", "Referred"].includes(row.original.status),
                },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, router, open, canWrite],
  )

  const filters: DataTableFilter<BlotterCase>[] = useMemo(
    () => [
      { id: "status", label: "Status", options: toOptions(BLOTTER_STATUSES), getValue: (b) => b.status },
      { id: "type", label: "Incident Type", options: toOptions(BLOTTER_INCIDENT_TYPES), getValue: (b) => b.incidentType },
    ],
    [],
  )

  const counts = useMemo(() => {
    const today = toISODate(new Date())
    return {
      open: blotters.filter((b) => ["Reported", "Under Investigation"].includes(b.status)).length,
      mediation: blotters.filter((b) => b.status === "For Mediation").length,
      hearings: blotters.flatMap((b) => b.hearings).filter((h) => h.status === "Scheduled" && h.date >= today).length,
      resolved: blotters.filter((b) => ["Settled", "Closed"].includes(b.status)).length,
    }
  }, [blotters])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barangay Blotter"
        description="Electronic blotter of complaints under the Katarungang Pambarangay."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Blotter" }]}
        actions={
          canWrite && (
            <Button onClick={() => open({ type: "blotter" })}>
              <Plus /> New blotter entry
            </Button>
          )
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open cases" value={counts.open} hint="Reported or under investigation" />
          <StatCard label="For mediation" value={counts.mediation} hint="Before the Punong Barangay / Lupon" />
          <StatCard label="Upcoming hearings" value={counts.hearings} hint="Scheduled from today" />
          <StatCard label="Settled / closed" value={counts.resolved} hint="Resolved at barangay level" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : blotters}
        getRowId={(b) => b.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search blotter no., parties, location…",
          getText: (b) => `${b.blotterNumber} ${b.complainant.name} ${b.respondent.name} ${b.location} ${b.incidentType}`,
        }}
        filters={filters}
        dateFilter={{ getDate: (b) => b.date }}
        onRowClick={(b) => router.push(`/blotter/${b.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        empty={{
          icon: Gavel,
          title: "No blotter entries",
          description: "Recorded complaints will appear here.",
          action: canWrite ? (
            <Button size="sm" onClick={() => open({ type: "blotter" })}>
              New blotter entry
            </Button>
          ) : undefined,
        }}
      />
    </div>
  )
}
