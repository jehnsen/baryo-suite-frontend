import type { ReportData } from "./data"
import { applyReportFilters, defaultFilterState } from "./filters"
import type { AnyReport, ReportFilterState } from "./types"

/** The report pipeline: source → filters → rows → summary. Pages, the overview and checks all run reports through here. */
export function runReport(report: AnyReport, d: ReportData, state: ReportFilterState, opts: { empty?: boolean } = {}) {
  const items: unknown[] = opts.empty ? [] : applyReportFilters(report.source(d), report.filters, state, d)
  const rows: unknown[] = report.rows ? report.rows(items, d, state) : items
  const metrics = report.summary?.(items, rows, d) ?? []
  return { items, rows, metrics }
}

/** Run with the report's default filters (as a user first opens it). */
export const runReportWithDefaults = (report: AnyReport, d: ReportData, fiscalYear: number) =>
  runReport(report, d, defaultFilterState(report.filters, { now: d.now, fiscalYear }))
