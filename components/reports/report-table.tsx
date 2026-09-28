"use client"

import { Fragment, useMemo } from "react"
import type { RowData } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ThresholdConfig } from "@/components/shared/progress-metric"
import { DataTable } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { columnTotal, formatCellText, hasTotals, isNumeric } from "@/lib/reports/format"
import type { ReportData } from "@/lib/reports/data"
import type { Primitive, ReportColumn, ReportGrouping } from "@/lib/reports/types"
import { cn } from "@/lib/utils"
import { ReportCell, ReportValue } from "./report-cell"

/** Numeric text columns align right; bars stay left so they line up. */
const alignClass = <R,>(c: ReportColumn<R>) => (isNumeric(c.format) && c.format !== "progress" && c.format !== "utilization" ? "text-right" : undefined)

/** Rows split into ordered groups (declared order first, then alphabetical). */
export function groupRows<R>(rows: R[], grouping: ReportGrouping<R>, d: ReportData) {
  const groups = new Map<string, R[]>()
  rows.forEach((r) => {
    const k = grouping.by(r, d)
    groups.set(k, [...(groups.get(k) ?? []), r])
  })
  const order = grouping.order ?? []
  const { sortKey } = grouping
  const direction = grouping.descending ? -1 : 1
  return [...groups.entries()]
    .sort(([a, ra], [b, rb]) => {
      if (sortKey) return direction * sortKey(ra[0]).localeCompare(sortKey(rb[0]))
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
      return direction * a.localeCompare(b)
    })
    .map(([key, list]) => ({ key, rows: list }))
}

/** Totals cell: the first column carries the label (with its count/total when it has one). */
function totalFor<R>(columns: ReportColumn<R>[], index: number, rows: R[], d: ReportData, label: string): { value: Primitive; isLabel: boolean } {
  const value = columnTotal(columns[index], rows, d)
  if (index === 0) return { value: value === undefined ? label : `${label} (${formatCellText(value)})`, isLabel: true }
  return { value, isLabel: false }
}

interface ReportTableProps<R> {
  columns: ReportColumn<R>[]
  rows: R[]
  rowId: (row: R) => string
  d: ReportData
  grouping?: ReportGrouping<R>
  /** Grouped view: show member rows under each subtotal. */
  showDetails?: boolean
  thresholds?: ThresholdConfig
  onRowClick?: (row: R) => void
}

/** Report data table: the shared DataTable for flat reports; a grouped table with subtotals when grouped. */
export function ReportTable<R extends RowData>({ columns, rows, rowId, d, grouping, showDetails = true, thresholds, onRowClick }: ReportTableProps<R>) {
  const totals = hasTotals(columns)
  const tableColumns = useMemo(() => {
    const col = createAppColumnHelper<R>()
    return columns.map((c, i) =>
      col.accessor((r: R) => c.value(r, d) ?? undefined, {
        id: c.id,
        header: ({ column }) => <DataTableColumnHeader column={column} title={c.header} />,
        cell: ({ row }) => <ReportCell column={c} row={row.original} d={d} thresholds={thresholds} />,
        footer: totals
          ? () => {
              const t = totalFor(columns, i, rows, d, "Total")
              return t.isLabel ? <span>{t.value}</span> : <ReportValue value={t.value} format={c.format} thresholds={thresholds} />
            }
          : undefined,
        sortUndefined: "last",
        enableHiding: i > 0,
        meta: { label: c.header, className: alignClass(c) },
      }),
    )
  }, [columns, rows, d, totals, thresholds])

  if (!grouping) {
    return (
      <DataTable
        columns={tableColumns}
        data={rows}
        getRowId={rowId}
        onRowClick={onRowClick}
        pageSize={20}
        exportable={false}
        showFooter={totals}
        initialVisibility={Object.fromEntries(columns.filter((c) => c.hidden).map((c) => [c.id, false]))}
      />
    )
  }

  return (
    <StaticReportTable
      columns={columns.filter((c) => !c.hidden)}
      rows={rows}
      rowId={rowId}
      d={d}
      grouping={grouping}
      showDetails={showDetails}
      thresholds={thresholds}
      onRowClick={onRowClick}
    />
  )
}

interface StaticProps<R> {
  columns: ReportColumn<R>[]
  rows: R[]
  rowId: (row: R) => string
  d: ReportData
  grouping?: ReportGrouping<R>
  showDetails?: boolean
  /** "print" renders plain text (no badges or bars) and keeps the grand total out of the repeating <tfoot>. */
  variant?: "screen" | "print"
  thresholds?: ThresholdConfig
  onRowClick?: (row: R) => void
}

/**
 * Unpaginated table with optional groups (subtotal per group) and a grand
 * total. Used for grouped reports on screen and for every report in print.
 */
export function StaticReportTable<R>({ columns, rows, rowId, d, grouping, showDetails = true, variant = "screen", thresholds, onRowClick }: StaticProps<R>) {
  const groups = grouping ? groupRows(rows, grouping, d) : [{ key: "", rows }]
  const withTotals = hasTotals(columns)
  const print = variant === "print"
  const showGrand = Boolean(grouping) || withTotals
  const grandLabel = grouping ? "Grand total" : "Total"

  const summaryRow = (label: string, list: R[], key: string, strong?: boolean) => (
    <TableRow key={key} className={cn("break-inside-avoid hover:bg-transparent", strong ? "bg-muted/60 font-semibold" : "bg-muted/30 font-medium")}>
      {columns.map((c, i) => {
        const t = totalFor(columns, i, list, d, label)
        return (
          <TableCell key={c.id} className={cn(print ? "py-1.5" : "py-2.5", alignClass(c))}>
            {t.isLabel ? (
              t.value
            ) : print ? (
              t.value === undefined ? (
                ""
              ) : (
                formatCellText(t.value, c.format)
              )
            ) : (
              <ReportValue value={t.value} format={c.format} thresholds={thresholds} />
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )

  return (
    <div className={cn(!print && "overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs")}>
      <Table>
        <TableHeader className={cn(!print && "bg-muted/40")}>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.id} className={cn("text-xs font-semibold text-muted-foreground", print ? "h-8" : "h-11", alignClass(c))}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <Fragment key={g.key || "all"}>
              {grouping && showDetails && (
                <TableRow className="break-after-avoid hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="bg-accent/40 py-2 text-xs font-semibold tracking-wide text-accent-foreground uppercase">
                    {grouping.label}: {g.key} · {g.rows.length} {g.rows.length === 1 ? "record" : "records"}
                  </TableCell>
                </TableRow>
              )}
              {(showDetails || !grouping) &&
                g.rows.map((r) => (
                  <TableRow
                    key={rowId(r)}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn("break-inside-avoid", onRowClick && "cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.id} className={cn(print ? "py-1.5 whitespace-normal" : "py-3", alignClass(c))}>
                        {print ? <PrintCell column={c} row={r} d={d} /> : <ReportCell column={c} row={r} d={d} thresholds={thresholds} />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {grouping && summaryRow(showDetails ? `Subtotal – ${g.key}` : g.key, g.rows, `sub-${g.key}`)}
            </Fragment>
          ))}
          {print && showGrand && summaryRow(grandLabel, rows, "grand", true)}
        </TableBody>
        {!print && showGrand && <TableFooter>{summaryRow(grandLabel, rows, "grand", true)}</TableFooter>}
      </Table>
    </div>
  )
}

function PrintCell<R>({ column, row, d }: { column: ReportColumn<R>; row: R; d: ReportData }) {
  const detail = column.detail?.(row, d)
  return (
    <>
      {formatCellText(column.value(row, d), column.format)}
      {detail !== undefined && detail !== null && detail !== "" && <span className="block text-[10px] text-neutral-500">{detail}</span>}
    </>
  )
}
