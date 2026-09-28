"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FileText, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportPage } from "@/components/reports/report-page"
import { EmptyState } from "@/components/shared/empty-state"
import { useCurrentUser } from "@/hooks/use-data"
import { sectionForSlug, type ReportSection } from "@/lib/reports/sections"
import type { AnyReport } from "@/lib/reports/types"
import { cn } from "@/lib/utils"
import { canViewReportAs, findReport, reportHref, reportsInSection } from "./registry"

/** /reports/[slug]: the section's report list plus the selected report (?report=<id>). */
export function ReportSectionView({ slug }: { slug: string }) {
  const section = sectionForSlug(slug)!
  const { role } = useCurrentUser()
  const params = useSearchParams()
  const reports = reportsInSection(section.id, role)
  const requested = findReport(params.get("report"))

  if (requested && requested.section === section.id && !canViewReportAs(role, requested)) {
    return (
      <EmptyState
        icon={Lock}
        title={`${requested.title} is not available for ${role}`}
        description="Your role does not include this report. Contact the barangay administrator if you need access."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">Back to reports</Link>
          </Button>
        }
        className="py-24"
      />
    )
  }

  const report = requested && requested.section === section.id ? requested : (reports.find((r) => r.slug === slug) ?? reports[0])
  if (!report) return <EmptyState icon={Lock} title="No reports available" description={`${role} has no reports in ${section.title}.`} className="py-24" />

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <ReportRail section={section} reports={reports} activeId={report.id} />
      <ReportPage
        key={report.id}
        report={report}
        sectionTitle={section.title}
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: section.title, href: `/reports/${section.slugs[0].slug}` }, { label: report.title }]}
      />
    </div>
  )
}

/** Report list for a section: sticky rail on desktop, a picker on small screens. */
function ReportRail({ section, reports, activeId }: { section: ReportSection; reports: AnyReport[]; activeId: string }) {
  const router = useRouter()
  const groups = section.slugs.map((s) => ({ ...s, reports: reports.filter((r) => r.slug === s.slug) })).filter((g) => g.reports.length > 0)
  const showLabels = groups.length > 1
  return (
    <>
      <div className="no-print lg:hidden">
        <Select value={activeId} onValueChange={(id) => router.push(reportHref(findReport(id)!))}>
          <SelectTrigger className="w-full bg-card" aria-label={`${section.title} reports`}>
            <FileText className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectGroup key={g.slug}>
                {showLabels && <SelectLabel>{g.label}</SelectLabel>}
                {g.reports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label={`${section.title} reports`} className="no-print hidden lg:block">
        <div className="sticky top-26 space-y-4 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center gap-2 px-2 pt-1">
            <section.icon className="size-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold tracking-tight">{section.title}</p>
          </div>
          {groups.map((g) => (
            <div key={g.slug} className="space-y-1">
              {showLabels && <p className="px-2 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</p>}
              {g.reports.map((r) => {
                const active = r.id === activeId
                return (
                  <Link
                    key={r.id}
                    href={reportHref(r)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-2 py-1.5 text-[13px] leading-snug transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {r.title}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}
