import type { ReactNode } from "react"
import type { ModuleKey, ReportSectionId } from "@/types"
import type { ReportTag } from "@/lib/permissions"
import type { Tone } from "@/lib/status"
import type { ReportData } from "./data"

/**
 * Configuration-driven reports. A definition declares where its records come
 * from, which shared filters apply, how filtered records aggregate into rows,
 * and how rows are shown. <ReportPage> renders any definition, so there are no
 * per-report pages.
 *
 *   source(data) → filters → rows(items) → columns / summary / charts / print / export
 */

export type Primitive = string | number | null | undefined

export type ColumnFormat =
  | "text"
  | "mono" // ids and document numbers
  | "number"
  | "peso"
  | "percent"
  | "date"
  | "status" // StatusBadge via lib/status
  | "progress" // 0–100 bar (neutral tone)
  | "utilization" // 0–100 bar against the budget thresholds in Settings
  | "hours" // durations, shown as hours or days

export interface ReportColumn<R> {
  id: string
  header: string
  /** Raw value used for sorting, totals, print and export. `d` resolves relations (names, codes). */
  value: (row: R, d: ReportData) => Primitive
  format?: ColumnFormat
  /** Secondary line under the value (screen and print). */
  detail?: (row: R, d: ReportData) => Primitive
  /** Totals row: sum or count of the column, or a custom aggregate (e.g. weighted utilization). */
  total?: "sum" | "count" | ((rows: R[], d: ReportData) => Primitive)
  /** Hidden on screen by default (still printable/exportable via the Columns menu). */
  hidden?: boolean
  /** Omit from print (wide free text, bars that print poorly). */
  screenOnly?: boolean
  /** Custom screen cell; print/export always use `value`. */
  render?: (row: R, d: ReportData) => ReactNode
}

export interface ReportMetric {
  label: string
  value: number | string
  format?: "number" | "peso" | "percent" | "hours" | "text"
  hint?: string
  tone?: Tone
}

export type ReportFilterId =
  | "search"
  | "dateRange"
  | "fiscalYear"
  | "purok"
  | "status"
  | "category"
  | "gender"
  | "ageGroup"
  | "civilStatus"
  | "classification"
  | "voterStatus"
  | "certificateType"
  | "serviceType"
  | "incidentType"
  | "budgetCategory"
  | "fundSource"
  | "ppa"
  | "project"
  | "official"
  | "committee"
  | "paymentMethod"
  | "condition"
  | "incomeRange"
  | "housingType"
  | "transactionType"

export type FilterOptionsSource = readonly string[] | ((d: ReportData) => { label: string; value: string }[])

/** A shared filter (see REPORT_FILTERS) bound to a report's source records. */
export interface ReportFilterSpec<S> {
  id: ReportFilterId
  label?: string
  options?: FilterOptionsSource
  /** Faceted and fiscal-year filters: the record's value(s). */
  get?: (item: S, d: ReportData) => string | number | string[] | null | undefined
  /** Date range filter: ISO date of the record. */
  getDate?: (item: S) => string | undefined
  /** Search filter: text to match. */
  getText?: (item: S, d: ReportData) => string
  /** Initial selection (Reset returns here). */
  defaultValues?: string[]
  /** Initial date range. */
  defaultRange?: "today" | "month" | "year"
}

export interface ReportFilterState {
  values: Record<string, string[]>
  range: { from?: string; to?: string }
  /** null = all years. */
  fiscalYear: number | null
  search: string
}

interface ChartBase {
  title: string
  description?: string
  /** Occupy the full row instead of half. */
  wide?: boolean
  valueFormat?: "number" | "peso" | "percent"
  height?: number
}

export type ChartInput<S, R> = { items: S[]; rows: R[]; d: ReportData }
export type Datum = { label: string; value: number }

export type ReportChart<S, R> =
  | (ChartBase & { type: "bar" | "hbar" | "trend"; data: (i: ChartInput<S, R>) => Datum[]; seriesName: string })
  | (ChartBase & {
      type: "grouped"
      horizontal?: boolean
      series: { key: string; name: string }[]
      data: (i: ChartInput<S, R>) => Array<{ label: string } & Record<string, number | string>>
    })
  | (ChartBase & { type: "proportion"; data: (i: ChartInput<S, R>) => Datum[] })

export interface ReportGrouping<R> {
  id: string
  label: string
  by: (row: R, d: ReportData) => string
  /** Fixed group order (e.g. workflow statuses); other groups follow alphabetically. */
  order?: readonly string[]
  /** Order groups by this key of their first row instead (e.g. ISO date for date labels). */
  sortKey?: (row: R) => string
  descending?: boolean
  /** Start collapsed to subtotals only (summary view). */
  summary?: boolean
}

export type Signatory = "preparedBy" | "secretary" | "treasurer" | "punongBarangay"

export interface ReportDefinition<S, R = S> {
  id: string
  title: string
  description: string
  section: ReportSectionId
  /** Route slug inside the section (/reports/<slug>?report=<id>). */
  slug: string
  /** Access tags; defaults to the section. */
  access?: ReportTag[]
  filename?: string
  source: (d: ReportData) => S[]
  filters?: ReportFilterSpec<S>[]
  /** Aggregate filtered records into table rows (defaults to the records). */
  rows?: (items: S[], d: ReportData, filters: ReportFilterState) => R[]
  rowId: (row: R) => string
  columns: ReportColumn<R>[]
  summary?: (items: S[], rows: R[], d: ReportData) => ReportMetric[]
  charts?: ReportChart<S, R>[]
  groupings?: ReportGrouping<R>[]
  defaultGrouping?: string
  /** Rows open the operational record when the user can access its module. */
  rowLink?: { module: ModuleKey; href: (row: R) => string }
  orientation?: "portrait" | "landscape"
  signatories?: Signatory[]
  /** Definitions and methodology, shown under the table and in print. */
  note?: string
  /** Label for the table (e.g. "Records", "By purok"). */
  tableTitle?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyReport = ReportDefinition<any, any>

/** Keeps S/R inference at the definition site and erases them for the registry. */
export const defineReport = <S, R = S>(def: ReportDefinition<S, R>): AnyReport => def as AnyReport
