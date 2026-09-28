import { formatDate, formatNumber, formatPercent, formatPeso } from "@/lib/format"
import { formatHours } from "./metrics"
import type { ReportData } from "./data"
import type { ColumnFormat, Primitive, ReportColumn, ReportMetric } from "./types"

/** Formats whose values are numbers (right-aligned, totalled). */
export const NUMERIC_FORMATS: ColumnFormat[] = ["number", "peso", "percent", "progress", "utilization", "hours"]
export const isNumeric = (f: ColumnFormat = "text") => NUMERIC_FORMATS.includes(f)

/** Plain-text cell value (print view and screen fallback). */
export function formatCellText(value: Primitive, format: ColumnFormat = "text"): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") {
    switch (format) {
      case "peso":
        return formatPeso(value)
      case "percent":
      case "progress":
      case "utilization":
        return formatPercent(value)
      case "hours":
        return formatHours(value)
      default:
        return formatNumber(value)
    }
  }
  return format === "date" ? formatDate(value) : value
}

export function formatMetric(m: ReportMetric): string {
  if (typeof m.value === "string") return m.value
  switch (m.format) {
    case "peso":
      return formatPeso(m.value)
    case "percent":
      return formatPercent(m.value)
    case "hours":
      return formatHours(m.value)
    default:
      return formatNumber(Math.round(m.value * 10) / 10)
  }
}

/** Value of a column's total over rows, or undefined when the column has none. */
export function columnTotal<R>(column: ReportColumn<R>, rows: R[], d: ReportData): Primitive {
  if (!column.total) return undefined
  if (column.total === "count") return rows.length
  if (column.total === "sum") return rows.reduce((s, r) => s + (Number(column.value(r, d)) || 0), 0)
  return column.total(rows, d)
}

export const hasTotals = <R>(columns: ReportColumn<R>[]) => columns.some((c) => c.total)

/** Totals aligned to columns; the first column without a total reads "Total". */
export function totalsRow<R>(columns: ReportColumn<R>[], rows: R[], d: ReportData, label = "Total"): Primitive[] {
  const totals = columns.map((c) => columnTotal(c, rows, d))
  if (totals[0] === undefined) totals[0] = label
  else if (typeof totals[0] === "number") totals[0] = `${label}: ${totals[0]}`
  return totals
}
