"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, Plus, Vote } from "lucide-react"
import type { BarangayAssembly } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAssemblies, useCurrentUser } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatNumber, formatTime } from "@/lib/format"

const col = createAppColumnHelper<BarangayAssembly>()

export function AssembliesView() {
  const router = useRouter()
  const load = usePageLoad()
  const assemblies = useAssemblies()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("title", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Assembly" />,
          cell: ({ row, getValue }) => (
            <Link href={`/governance/assemblies/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
              {getValue()}
            </Link>
          ),
          meta: { label: "Assembly Title" },
          enableHiding: false,
        }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ row, getValue }) => (
            <span className="whitespace-nowrap tabular-nums">
              {formatDate(getValue())} <span className="text-muted-foreground">{formatTime(row.original.time)}</span>
            </span>
          ),
          meta: { label: "Date" },
        }),
        col.accessor("venue", {
          header: "Venue",
          cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
          meta: { label: "Venue" },
        }),
        col.accessor("attendanceCount", {
          header: "Attendance",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue() ? formatNumber(getValue()) : "—"}</span>,
          meta: { label: "Attendance Count" },
        }),
        col.accessor((a) => a.decisions.length, {
          id: "decisions",
          header: "Decisions",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue() || "—"}</span>,
          meta: { label: "Decisions" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/governance/assemblies/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [router],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Vote}
        title="Barangay Assemblies"
        description="Semestral assemblies of residents (March and October)."
        breadcrumbs={[{ label: "Governance" }, { label: "Assemblies" }]}
        actions={
          can("governance") && (
            <Button onClick={() => open({ type: "assembly" })}>
              <Plus /> Schedule assembly
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : assemblies}
        getRowId={(a) => a.id}
        status={load.status}
        onRetry={load.retry}
        search={{ placeholder: "Search assemblies…", getText: (a) => `${a.title} ${a.topics.join(" ")}` }}
        onRowClick={(a) => router.push(`/governance/assemblies/${a.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        exportable={false}
        empty={{ icon: Vote, title: "No assemblies recorded" }}
      />
    </div>
  )
}
