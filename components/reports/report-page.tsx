"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Info } from "lucide-react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChartSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { PageHeader } from "@/components/shared/page-header"
import type { Crumb } from "@/components/shared/breadcrumbs"
import { useCurrentUser } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { usePrintMode } from "@/hooks/use-print-mode"
import { useReportData } from "@/hooks/use-report-data"
import { EXPORT_LABELS, exportReport, type ExportFormat } from "@/lib/reports/export"
import { runReport } from "@/lib/reports/engine"
import { defaultFilterState, describeFilters, sameFilterState } from "@/lib/reports/filters"
import { hasTotals, totalsRow } from "@/lib/reports/format"
import type { AnyReport, ReportFilterState } from "@/lib/reports/types"
import { reportActions } from "@/lib/store/report-actions"
import { formatDateTime, pluralize } from "@/lib/format"
import { ReportChart } from "./report-chart"
import { ReportEmptyState } from "./report-empty-state"
import { ReportFilters } from "./report-filters"
import { ReportPrintView } from "./report-print-view"
import { ReportSummary } from "./report-summary"
import { ReportTable } from "./report-table"
import { ReportToolbar } from "./report-toolbar"

interface ReportPageProps {
  report: AnyReport
  sectionTitle: string
  breadcrumbs?: Crumb[]
}

/**
 * Renders any report definition: header + toolbar, shared filters, summary,
 * charts, table (flat or grouped), print layout and export. Remount with
 * `key={report.id}` when switching reports so filters reset.
 */
export function ReportPage({ report, sectionTitle, breadcrumbs }: ReportPageProps) {
  const d = useReportData()
  const load = usePageLoad(260)
  const router = useRouter()
  const { fiscalYear } = useFiscalYear()
  const { user, canAccess } = useCurrentUser()
  const { printing, print } = usePrintMode()
  const [openedAt] = useState(() => new Date())

  const defaults = useMemo(() => defaultFilterState(report.filters, { now: openedAt, fiscalYear }), [report, openedAt, fiscalYear])
  const [applied, setApplied] = useState<ReportFilterState>(defaults)
  const [draft, setDraft] = useState<ReportFilterState>(defaults)
  const [groupingId, setGroupingId] = useState(report.defaultGrouping ?? "none")
  const grouping = report.groupings?.find((g) => g.id === groupingId)
  const [showDetails, setShowDetails] = useState(!grouping?.summary)

  const { items, rows, metrics } = useMemo(() => runReport(report, d, applied, { empty: load.demoEmpty }), [report, d, applied, load.demoEmpty])
  const described = describeFilters(report.filters, applied, d)
  const appliedSummary = [described.period, ...described.criteria].join(" · ")

  const signatories =
    report.signatories ?? (report.section === "finance" ? ["preparedBy", "treasurer", "punongBarangay"] : ["preparedBy", "secretary", "punongBarangay"])
  const link = report.rowLink && canAccess(report.rowLink.module) ? report.rowLink : undefined
  const hasData = rows.length > 0

  const handlePrint = () => {
    reportActions.recordRun({ reportId: report.id, title: report.title, format: "print", criteria: appliedSummary, rowCount: rows.length })
    print()
  }

  const handleExport = (format: ExportFormat) => {
    const columns = report.columns.filter((c) => !c.screenOnly)
    const result = exportReport({
      format,
      filename: report.filename ?? report.id,
      columns: columns.map((c) => ({ header: c.header, value: (row: unknown) => c.value(row, d) })),
      rows,
      totals: hasTotals(columns) ? totalsRow(columns, rows, d) : undefined,
      preamble: [
        `Barangay ${d.settings.barangayName}, ${d.settings.municipality}, ${d.settings.province}`,
        report.title,
        appliedSummary,
        `Generated ${formatDateTime(new Date())} by ${user.name}`,
      ],
    })
    if (result.status === "downloaded") {
      reportActions.recordRun({ reportId: report.id, title: report.title, format: "csv", criteria: appliedSummary, rowCount: rows.length })
      toast.success(`Exported ${pluralize(result.rowCount, "row")}`, { description: result.filename })
    } else {
      toast.info(`${EXPORT_LABELS[format]} export queued`, {
        description: `${report.title} will be generated once the reporting service is connected. CSV and Print are available now.`,
      })
    }
  }

  const reset = () => {
    setDraft(defaults)
    setApplied(defaults)
  }

  return (
    <>
      <div className="no-print min-w-0 space-y-5">
        <PageHeader
          title={report.title}
          description={report.description}
          breadcrumbs={breadcrumbs}
          actions={<ReportToolbar onPrint={handlePrint} onExport={handleExport} disabled={load.isLoading || load.isError} />}
        />

        <ReportFilters
          specs={report.filters ?? []}
          draft={draft}
          onDraftChange={setDraft}
          dirty={!sameFilterState(draft, applied)}
          canReset={!sameFilterState(applied, defaults)}
          onApply={() => setApplied(draft)}
          onReset={reset}
          appliedSummary={appliedSummary}
          d={d}
        />

        {load.isError ? (
          <ErrorState onRetry={load.retry} className="py-20" />
        ) : load.isLoading ? (
          <div className="space-y-5">
            {report.charts?.length ? <ChartSkeleton /> : null}
            <TableSkeleton rows={8} columns={Math.min(report.columns.length, 6)} />
          </div>
        ) : (
          <>
            {hasData && <ReportSummary metrics={metrics} />}

            {hasData && report.charts?.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {report.charts.map((chart) => (
                  <ReportChart key={chart.title} chart={chart} items={items} rows={rows} d={d} />
                ))}
              </div>
            ) : null}

            <section aria-label={report.tableTitle ?? "Report data"} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">{report.tableTitle ?? "Report data"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {pluralize(rows.length, "row")} · {sectionTitle}
                  </p>
                </div>
                {hasData && report.groupings?.length ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={groupingId}
                      onValueChange={(v) => {
                        setGroupingId(v)
                        setShowDetails(!report.groupings?.find((g) => g.id === v)?.summary)
                      }}
                    >
                      <SelectTrigger size="sm" className="h-8 min-h-8 w-48" aria-label="Group rows by">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="none">No grouping</SelectItem>
                        {report.groupings.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            Group by {g.label.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {grouping && (
                      <div className="flex items-center gap-2">
                        <Switch id={`${report.id}-details`} checked={showDetails} onCheckedChange={setShowDetails} size="sm" />
                        <Label htmlFor={`${report.id}-details`} className="text-xs font-normal text-muted-foreground">
                          Show details
                        </Label>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {hasData ? (
                <ReportTable
                  columns={report.columns}
                  rows={rows}
                  rowId={report.rowId}
                  d={d}
                  grouping={grouping}
                  showDetails={showDetails}
                  thresholds={d.settings.budgetThresholds}
                  onRowClick={link ? (row) => router.push(link.href(row)) : undefined}
                />
              ) : (
                <ReportEmptyState filtered={(report.filters?.length ?? 0) > 0} onReset={reset} />
              )}
              {report.note && (
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {report.note}
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {printing && (
        <ReportPrintView
          title={report.title}
          sectionTitle={sectionTitle}
          reportId={report.id}
          period={described.period}
          criteria={described.criteria}
          columns={report.columns}
          rows={rows}
          rowId={report.rowId}
          metrics={metrics}
          grouping={grouping}
          showDetails={showDetails}
          note={report.note}
          orientation={report.orientation}
          signatories={signatories}
          d={d}
          generatedBy={user.name}
          generatedAt={new Date()}
        />
      )}
    </>
  )
}
