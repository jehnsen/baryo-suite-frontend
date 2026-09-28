import { format } from "date-fns"
import type { Primitive } from "./types"

/**
 * The one export path for the app (report pages and every DataTable).
 * CSV downloads now; Excel and PDF are queued placeholders until the
 * reporting service exists. Printing is handled by <ReportPrintView>.
 */

export type ExportFormat = "csv" | "excel" | "pdf"

export interface ExportColumn<R> {
  header: string
  value: (row: R) => Primitive
}

export interface ExportRequest<R> {
  format: ExportFormat
  filename: string
  columns: ExportColumn<R>[]
  rows: R[]
  /** Optional totals row, aligned with columns. */
  totals?: Primitive[]
  /** Title / period / criteria lines written above the header row. */
  preamble?: string[]
}

export type ExportResult = { status: "downloaded"; filename: string; rowCount: number } | { status: "queued"; format: ExportFormat; rowCount: number }

const escapeCell = (v: Primitive) => {
  if (v === null || v === undefined) return ""
  const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV<R>({ columns, rows, totals, preamble = [] }: Pick<ExportRequest<R>, "columns" | "rows" | "totals" | "preamble">): string {
  const lines = [
    ...preamble.map((p) => escapeCell(p)),
    ...(preamble.length ? [""] : []),
    columns.map((c) => escapeCell(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(",")),
    ...(totals ? [totals.map(escapeCell).join(",")] : []),
  ]
  return lines.join("\r\n")
}

export const exportFilename = (base: string, ext: string, now = new Date()) => `${base}-${format(now, "yyyyMMdd")}.${ext}`

function download(content: string, filename: string, type: string) {
  // BOM so Excel opens UTF-8 names (ñ, ₱) correctly.
  const blob = new Blob(["﻿", content], { type })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportReport<R>(req: ExportRequest<R>): ExportResult {
  if (req.format !== "csv") return { status: "queued", format: req.format, rowCount: req.rows.length }
  const filename = exportFilename(req.filename, "csv")
  download(toCSV(req), filename, "text/csv;charset=utf-8")
  return { status: "downloaded", filename, rowCount: req.rows.length }
}

export const EXPORT_LABELS: Record<ExportFormat, string> = { csv: "CSV", excel: "Excel", pdf: "PDF" }
