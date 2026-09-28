"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Eye, NotebookPen, Plus } from "lucide-react"
import type { BarangaySession } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useCurrentUser, useMinutes, useOrdinances, useResolutions, useSessions } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { SESSION_STATUSES, SESSION_TYPES, toOptions } from "@/lib/constants"
import { formatDate, formatTime, toISODate } from "@/lib/format"

type Row = BarangaySession & { legislation: number; minutesId?: string; present: number }
const col = createAppColumnHelper<Row>()

export function SessionsView() {
  const router = useRouter()
  const load = usePageLoad()
  const sessions = useSessions()
  const minutes = useMinutes()
  const ordinances = useOrdinances()
  const resolutions = useResolutions()
  const { can } = useCurrentUser()

  const rows: Row[] = useMemo(
    () =>
      sessions.map((s) => ({
        ...s,
        legislation: ordinances.filter((o) => o.sessionId === s.id).length + resolutions.filter((r) => r.sessionId === s.id).length,
        minutesId: minutes.find((m) => m.sessionId === s.id)?.id,
        present: s.attendance.filter((a) => a.status === "Present" || a.status === "Late").length,
      })),
    [sessions, minutes, ordinances, resolutions],
  )
  const today = toISODate(new Date())
  const next = [...sessions].filter((s) => s.status === "Scheduled" && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("sessionNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Session No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/governance/sessions/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Session Number" },
          enableHiding: false,
        }),
        col.accessor("title", {
          header: "Title",
          cell: ({ row, getValue }) => (
            <div className="min-w-48">
              <p className="font-medium">{getValue()}</p>
              <p className="text-xs text-muted-foreground">{row.original.agenda.length} agenda items</p>
            </div>
          ),
          meta: { label: "Title" },
        }),
        col.accessor("type", { header: "Type", cell: ({ getValue }) => <TagBadge>{getValue()}</TagBadge>, meta: { label: "Session Type" } }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ row, getValue }) => (
            <span className="whitespace-nowrap tabular-nums">
              {formatDate(getValue(), "EEE, MMM d, yyyy")} <span className="text-muted-foreground">{formatTime(row.original.time)}</span>
            </span>
          ),
          meta: { label: "Date" },
        }),
        col.accessor("venue", {
          header: "Venue",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Venue" },
        }),
        col.accessor("present", {
          header: "Attendance",
          cell: ({ row, getValue }) =>
            row.original.attendance.length ? (
              <span className="tabular-nums">
                {getValue()}/{row.original.attendance.length}
              </span>
            ) : (
              "—"
            ),
          meta: { label: "Attendance" },
        }),
        col.accessor("legislation", {
          header: "Legislation",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue() || "—"}</span>,
          meta: { label: "Linked legislation" },
        }),
        col.accessor("minutesId", {
          header: "Minutes",
          cell: ({ getValue }) =>
            getValue() ? (
              <Link
                href={`/governance/minutes/${getValue()}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs hover:underline"
              >
                <NotebookPen className="size-3.5" /> View
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
          meta: { label: "Minutes" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/governance/sessions/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [router],
  )

  const filters: DataTableFilter<Row>[] = useMemo(
    () => [
      { id: "type", label: "Type", options: toOptions(SESSION_TYPES), getValue: (r) => r.type },
      { id: "status", label: "Status", options: toOptions(SESSION_STATUSES), getValue: (r) => r.status },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Barangay Sessions"
        description="Sessions of the Sangguniang Barangay, their agenda, attendance and actions."
        breadcrumbs={[{ label: "Governance" }, { label: "Sessions" }]}
        actions={
          can("governance") && (
            <Button asChild>
              <Link href="/governance/sessions/new">
                <Plus /> Schedule session
              </Link>
            </Button>
          )
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            emphasis="primary"
            label="Next session"
            value={next ? formatDate(next.date, "MMM d") : "—"}
            icon={CalendarDays}
            hint={next ? `${next.sessionNumber} · ${formatTime(next.time)}` : "None scheduled"}
            href={next ? `/governance/sessions/${next.id}` : undefined}
          />
          <StatCard
            label="Held this year"
            value={rows.filter((s) => s.status === "Completed" && s.date.startsWith(today.slice(0, 4))).length}
            hint="Regular, special and emergency"
          />
          <StatCard label="Measures acted on" value={rows.reduce((s, r) => s + r.legislation, 0)} hint="Ordinances and resolutions" />
          <StatCard
            emphasis="secondary"
            label="Minutes pending approval"
            value={minutes.filter((m) => m.status !== "Approved").length}
            href="/governance/minutes"
          />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : rows}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search session no., title, agenda…",
          getText: (r) => `${r.sessionNumber} ${r.title} ${r.agenda.map((a) => a.title).join(" ")}`,
        }}
        filters={filters}
        dateFilter={{ getDate: (r) => r.date }}
        onRowClick={(r) => router.push(`/governance/sessions/${r.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        initialVisibility={{ venue: false }}
        empty={{ icon: CalendarDays, title: "No sessions yet" }}
      />
    </div>
  )
}
