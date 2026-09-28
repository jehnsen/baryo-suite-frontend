"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Eye, Pencil } from "lucide-react"
import type { PPA } from "@/types"
import { Money } from "@/components/shared/money"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useLookups, useSettings } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import type { LoadStatus } from "@/hooks/use-page-load"
import { BUDGET_CATEGORIES, PPA_STATUSES, PPA_TYPES, toOptions } from "@/lib/constants"
import { officialName } from "@/lib/format"
import type { BudgetMetrics } from "@/lib/finance"

type Row = PPA & { m: BudgetMetrics; physical: number }
const col = createAppColumnHelper<Row>()

/**
 * Budget-monitoring table of PPAs (approved, obligated, disbursed, available,
 * utilization, physical progress). Shared by Allocations, Programs & Projects
 * and Financial Reports.
 */
export function PPATable({
  ppas,
  status,
  onRetry,
  hideCategory,
  pageSize = 10,
}: {
  ppas: PPA[]
  status?: LoadStatus
  onRetry?: () => void
  hideCategory?: boolean
  pageSize?: number
}) {
  const router = useRouter()
  const ledger = useLedger()
  const { officials, projects } = useLookups()
  const { budgetThresholds } = useSettings()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canEdit = can("finance")

  const rows: Row[] = useMemo(() => {
    const projectByPpa = new Map([...projects.values()].map((p) => [p.ppaId, p]))
    return ppas.map((p) => ({ ...p, m: ledger.forPPA(p), physical: projectByPpa.get(p.id)?.physicalProgress ?? p.physicalProgress }))
  }, [ppas, ledger, projects])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("code", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/ppas/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "PPA Code" },
          enableHiding: false,
        }),
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => (
            <div className="min-w-52">
              <p className="font-medium">{row.original.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TagBadge className="h-4 px-1 text-[10px]">{row.original.type}</TagBadge> {officialName(officials.get(row.original.responsibleOfficialId))}
              </p>
            </div>
          ),
          meta: { label: "Name" },
        }),
        ...(hideCategory
          ? []
          : [
              col.accessor("category", {
                header: "Category",
                cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
                meta: { label: "Budget Category" },
              }),
            ]),
        col.accessor((r) => r.m.approved, {
          id: "approved",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Approved" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Approved Budget", className: "text-right" },
        }),
        col.accessor((r) => r.m.obligated, {
          id: "obligated",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Obligated" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Obligated", className: "text-right" },
        }),
        col.accessor((r) => r.m.disbursed, {
          id: "disbursed",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Disbursed" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Disbursed", className: "text-right" },
        }),
        col.accessor((r) => r.m.available, {
          id: "available",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Available" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Available Balance", className: "text-right" },
        }),
        col.accessor((r) => r.m.utilization, {
          id: "utilization",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Utilization" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} thresholds={budgetThresholds} className="w-32" />,
          meta: { label: "Utilization %" },
        }),
        col.accessor("physical", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Physical" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} tone="info" className="w-28" />,
          meta: { label: "Physical Progress" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "Open monitoring", icon: Eye, onSelect: () => router.push(`/ppas/${row.original.id}`) },
                { label: "Edit PPA", icon: Pencil, onSelect: () => open({ type: "ppa", record: row.original }), hidden: !canEdit },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, hideCategory, budgetThresholds, router, open, canEdit],
  )

  const filters: DataTableFilter<Row>[] = useMemo(
    () => [
      ...(hideCategory ? [] : [{ id: "category", label: "Category", options: toOptions(BUDGET_CATEGORIES), getValue: (r: Row) => r.category }]),
      { id: "type", label: "Type", options: toOptions(PPA_TYPES), getValue: (r) => r.type },
      { id: "status", label: "Status", options: toOptions(PPA_STATUSES), getValue: (r) => r.status },
    ],
    [hideCategory],
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      status={status}
      onRetry={onRetry}
      search={{ placeholder: "Search PPA code or name…", getText: (r) => `${r.code} ${r.name} ${r.category}` }}
      filters={filters}
      onRowClick={(r) => router.push(`/ppas/${r.id}`)}
      initialSorting={[{ id: "code", desc: false }]}
      initialVisibility={{ physical: false }}
      pageSize={pageSize}
      empty={{ icon: ClipboardList, title: "No PPAs yet", description: "Programs, projects and activities funded by this budget will appear here." }}
    />
  )
}
