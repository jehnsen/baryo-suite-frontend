"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, ChartColumn, FileText, Printer } from "lucide-react"
import { ReportSummary } from "@/components/reports/report-summary"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCardsSkeleton } from "@/components/shared/loading-skeleton"
import { LoadState } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCurrentUser, useReportRuns } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { useReportData } from "@/hooks/use-report-data"
import { formatDateTime, formatRelative, pluralize } from "@/lib/format"
import { runReportWithDefaults } from "@/lib/reports/engine"
import { REPORT_SECTIONS, sectionById } from "@/lib/reports/sections"
import type { ReportMetric } from "@/lib/reports/types"
import { canViewReportAs, findReport, QUICK_LINK_IDS, reportHref, reportsInSection } from "./registry"

/** Headline figures, each read from a report's own summary so the overview always matches the report. */
const GLANCE: { reportId: string; metric: string; label: string }[] = [
  { reportId: "population-summary", metric: "Total population", label: "Population" },
  { reportId: "household-summary", metric: "Total households", label: "Households" },
  { reportId: "certificates-issued", metric: "Certificates", label: "Certificates released" },
  { reportId: "blotter-summary", metric: "Open cases", label: "Open blotter cases" },
  { reportId: "ordinance-register", metric: "In effect", label: "Ordinances in effect" },
  { reportId: "budget-allocation", metric: "Utilization", label: "Budget utilization" },
  { reportId: "collections-summary", metric: "Total collections", label: "Collections" },
  { reportId: "project-master", metric: "Projects", label: "Projects" },
  { reportId: "asset-registry", metric: "Assets", label: "Assets in service" },
  { reportId: "low-stock", metric: "Items to replenish", label: "Low-stock items" },
]

export function ReportsOverview() {
  const load = usePageLoad()
  const router = useRouter()
  const params = useSearchParams()
  const d = useReportData()
  const runs = useReportRuns()
  const { fiscalYear } = useFiscalYear()
  const { canAccess, accessContext } = useCurrentUser()

  // /reports?report=<id> (audit log links) opens the report in its section.
  const deepLink = findReport(params.get("report"))
  useEffect(() => {
    if (deepLink) router.replace(reportHref(deepLink))
  }, [deepLink, router])

  const sections = REPORT_SECTIONS.filter((s) => canAccess(s.module)).map((s) => ({ ...s, reports: reportsInSection(s.id, accessContext) }))

  const glance = useMemo(
    () =>
      GLANCE.flatMap(({ reportId, metric, label }): ReportMetric[] => {
        const report = findReport(reportId)
        if (!report || !canViewReportAs(accessContext, report)) return []
        const m = runReportWithDefaults(report, d, fiscalYear).metrics.find((x) => x.label === metric)
        const fy = report.filters?.some((f) => f.id === "fiscalYear") ? `FY ${fiscalYear}` : undefined
        return m ? [{ ...m, label, hint: fy ?? sectionById(report.section).title, tone: undefined }] : []
      }),
    [d, fiscalYear, accessContext],
  )

  const visibleRuns = runs.filter((r) => {
    const report = findReport(r.reportId)
    return report && canViewReportAs(accessContext, report)
  })
  const frequent = Object.entries(visibleRuns.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.reportId]: (acc[r.reportId] ?? 0) + 1 }), {}))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
  const maxRuns = frequent[0]?.[1] ?? 1
  const recent = [...visibleRuns].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  const quickLinks = QUICK_LINK_IDS.map(findReport).filter((r) => r && canViewReportAs(accessContext, r))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ChartColumn}
        title="Reports"
        description="Management reports built from the same records as every module — filter, print with the barangay letterhead, or export to CSV."
        breadcrumbs={[{ label: "Reports" }]}
      />

      <LoadState load={load} skeleton={<StatCardsSkeleton count={4} />}>
        {glance.length > 0 && <ReportSummary metrics={glance} />}

        <section aria-labelledby="report-categories" className="space-y-3">
          <h2 id="report-categories" className="text-lg font-semibold tracking-tight">
            Report categories
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((s) => (
              <SectionCard
                key={s.id}
                title={
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <s.icon className="size-4" aria-hidden />
                    </span>
                    {s.title}
                  </span>
                }
                description={s.description}
                actions={<span className="text-xs text-muted-foreground tabular-nums">{pluralize(s.reports.length, "report")}</span>}
              >
                <ul className="space-y-1">
                  {s.reports.slice(0, 4).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={reportHref(r)}
                        className="flex items-center gap-2 rounded-md py-1 text-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{r.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/reports/${s.slugs[0].slug}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {s.reports.length > 4 ? `All ${s.reports.length} reports` : "Open section"} <ArrowRight className="size-3" />
                </Link>
              </SectionCard>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Quick links" description="Commonly requested reports">
            {quickLinks.length ? (
              <ul className="grid gap-x-4 sm:grid-cols-2">
                {quickLinks.map((r) => (
                  <li key={r!.id}>
                    <Link
                      href={reportHref(r!)}
                      className="flex items-center justify-between gap-2 border-b py-2 text-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="truncate">{r!.title}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="No quick links for your role" />
            )}
          </SectionCard>

          <SectionCard title="Frequently used" description="Most printed and exported reports">
            {frequent.length ? (
              <ul className="space-y-3">
                {frequent.map(([id, count]) => {
                  const r = findReport(id)!
                  return (
                    <li key={id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Link href={reportHref(r)} className="truncate font-medium hover:text-primary">
                          {r.title}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{pluralize(count, "run")}</span>
                      </div>
                      <UtilizationBar value={(count / maxRuns) * 100} tone="info" showLabel={false} label={`${r.title} usage`} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState compact title="No report runs yet" description="Printed and exported reports appear here." />
            )}
          </SectionCard>
        </div>

        <SectionCard title="Recent reports" description="Latest printed and exported reports" contentClassName="px-0">
          {recent.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 text-xs">Report</TableHead>
                    <TableHead className="text-xs">Output</TableHead>
                    <TableHead className="text-xs">Filters</TableHead>
                    <TableHead className="text-right text-xs">Rows</TableHead>
                    <TableHead className="text-xs">Generated by</TableHead>
                    <TableHead className="pr-5 text-xs">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((run) => {
                    const r = findReport(run.reportId)!
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="pl-5">
                          <Link href={reportHref(r)} className="font-medium hover:text-primary">
                            {r.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{sectionById(r.section).title}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={run.format === "print" ? "Printed" : "CSV"}
                            tone={run.format === "print" ? "neutral" : "purple"}
                            showDot={false}
                            className="gap-1"
                          />
                        </TableCell>
                        <TableCell className="max-w-72 truncate text-xs text-muted-foreground" title={run.criteria}>
                          {run.criteria}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{run.rowCount}</TableCell>
                        <TableCell className="text-sm">{d.by.user.get(run.userId)?.name ?? "—"}</TableCell>
                        <TableCell className="pr-5 text-xs whitespace-nowrap text-muted-foreground" title={formatDateTime(run.at)}>
                          {formatRelative(run.at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState compact icon={Printer} title="No reports generated yet" />
          )}
        </SectionCard>
      </LoadState>
    </div>
  )
}
