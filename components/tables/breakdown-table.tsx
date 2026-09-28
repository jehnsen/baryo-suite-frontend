"use client"

import { useMemo } from "react"
import { Money } from "@/components/shared/money"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { DataTable } from "./data-table"
import { DataTableColumnHeader } from "./data-table-column-header"
import { createAppColumnHelper } from "./table-features"

export interface BreakdownRow {
  id: string
  label: string
  sublabel?: string
  count: number
  amount: number
}

const col = createAppColumnHelper<BreakdownRow & { share: number }>()

/** Grouped totals (by month, category, PPA, fund source…) with share of total. */
export function BreakdownTable({
  rows,
  labelHeader,
  countLabel = "Records",
  onRowClick,
}: {
  rows: BreakdownRow[]
  labelHeader: string
  countLabel?: string
  onRowClick?: (row: BreakdownRow) => void
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const data = useMemo(() => rows.map((r) => ({ ...r, share: total ? (r.amount / total) * 100 : 0 })), [rows, total])
  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("label", {
          header: ({ column }) => <DataTableColumnHeader column={column} title={labelHeader} />,
          cell: ({ row, getValue }) => (
            <div>
              <p className="font-medium">{getValue()}</p>
              {row.original.sublabel && <p className="text-xs text-muted-foreground">{row.original.sublabel}</p>}
            </div>
          ),
          meta: { label: labelHeader },
          enableHiding: false,
        }),
        col.accessor("count", {
          header: ({ column }) => <DataTableColumnHeader column={column} title={countLabel} />,
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: countLabel },
        }),
        col.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Amount" },
        }),
        col.accessor("share", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Share" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} tone="info" className="w-36" />,
          meta: { label: "Share of total" },
        }),
      ]),
    [labelHeader, countLabel],
  )
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={onRowClick}
      initialSorting={[{ id: "amount", desc: true }]}
      pageSize={20}
      exportable={false}
      empty={{ title: "Nothing to summarize" }}
    />
  )
}
