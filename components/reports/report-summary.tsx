import { TONE_CLASSES } from "@/lib/status"
import { formatMetric } from "@/lib/reports/format"
import type { ReportMetric } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

/** One compact figure (label, value, hint). Denser than StatCard; meant for report headers. */
export function MetricSummaryCard({ metric, className }: { metric: ReportMetric; className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-1 p-4", className)}>
      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
        {metric.tone && <span className={cn("size-1.5 shrink-0 rounded-full", TONE_CLASSES[metric.tone].dot)} aria-hidden />}
        {metric.label}
      </p>
      <p className="truncate text-xl font-semibold tracking-tight tabular-nums">{formatMetric(metric)}</p>
      {metric.hint && <p className="truncate text-xs text-muted-foreground">{metric.hint}</p>}
    </div>
  )
}

/** Summary strip: one bordered panel with the report's key figures separated by rules. */
export function ReportSummary({ metrics }: { metrics: ReportMetric[] }) {
  if (!metrics.length) return null
  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>*]:border-r [&>*]:border-b [&>*]:border-border/70"
    >
      {metrics.map((m) => (
        <MetricSummaryCard key={m.label} metric={m} className="-mr-px -mb-px" />
      ))}
    </section>
  )
}
