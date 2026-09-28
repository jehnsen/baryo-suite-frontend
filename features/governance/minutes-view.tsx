"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, NotebookPen } from "lucide-react"
import type { MeetingMinutes } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useLookups, useMinutes } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, officialName } from "@/lib/format"

type Row = MeetingMinutes & { sessionNumber: string; sessionTitle: string; date: string; openItems: number }
const col = createAppColumnHelper<Row>()

export function MinutesView() {
  const router = useRouter()
  const load = usePageLoad()
  const minutes = useMinutes()
  const { sessions, officials } = useLookups()

  const rows: Row[] = useMemo(
    () =>
      minutes.map((m) => {
        const s = sessions.get(m.sessionId)
        return {
          ...m,
          sessionNumber: s?.sessionNumber ?? "—",
          sessionTitle: s?.title ?? "—",
          date: s?.date ?? "",
          openItems: m.actionItems.filter((a) => a.status !== "Done").length,
        }
      }),
    [minutes, sessions],
  )

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("sessionNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Session" />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/governance/minutes/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Session" },
          enableHiding: false,
        }),
        col.accessor("sessionTitle", { header: "Title", cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>, meta: { label: "Title" } }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        col.accessor((m) => m.actionItems.length, {
          id: "actions-count",
          header: "Action items",
          cell: ({ row, getValue }) => (
            <span className="tabular-nums">
              {getValue()} {row.original.openItems > 0 && <span className="text-xs text-muted-foreground">({row.original.openItems} open)</span>}
            </span>
          ),
          meta: { label: "Action Items" },
        }),
        col.accessor((m) => officialName(officials.get(m.preparedById)), {
          id: "prepared",
          header: "Prepared by",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Prepared By" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/governance/minutes/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, router],
  )

  const filters: DataTableFilter<Row>[] = useMemo(
    () => [{ id: "status", label: "Status", options: ["Draft", "For Approval", "Approved"].map((s) => ({ label: s, value: s })), getValue: (r) => r.status }],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={NotebookPen}
        title="Minutes"
        description="Minutes of Sangguniang Barangay sessions. Draft minutes from a completed session."
        breadcrumbs={[{ label: "Governance" }, { label: "Minutes" }]}
      />
      {!load.isLoading && !load.isError && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Approved" value={rows.filter((r) => r.status === "Approved").length} />
          <StatCard label="Awaiting approval" value={rows.filter((r) => r.status !== "Approved").length} />
          <StatCard label="Open action items" value={rows.reduce((s, r) => s + r.openItems, 0)} hint="Across all minutes" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : rows}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{ placeholder: "Search session…", getText: (r) => `${r.sessionNumber} ${r.sessionTitle}` }}
        filters={filters}
        dateFilter={{ getDate: (r) => r.date }}
        onRowClick={(r) => router.push(`/governance/minutes/${r.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        empty={{ icon: NotebookPen, title: "No minutes yet", description: "Open a completed session and choose Draft minutes." }}
      />
    </div>
  )
}
