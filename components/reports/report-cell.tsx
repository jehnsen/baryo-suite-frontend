import { Money } from "@/components/shared/money"
import { UtilizationBar, type ThresholdConfig } from "@/components/shared/progress-metric"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCellText } from "@/lib/reports/format"
import type { ReportData } from "@/lib/reports/data"
import type { Primitive, ReportColumn } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

/** Screen rendering of a formatted value (badges, bars, money). Print uses formatCellText. */
export function ReportValue({
  value,
  format = "text",
  thresholds,
}: {
  value: Primitive
  format?: ReportColumn<unknown>["format"]
  thresholds?: ThresholdConfig
}) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>
  switch (format) {
    case "peso":
      return <Money value={Number(value)} />
    case "status":
      return <StatusBadge status={String(value)} />
    case "progress":
      return <UtilizationBar value={Number(value)} tone="info" label="Progress" className="w-32" />
    case "utilization":
      return <UtilizationBar value={Number(value)} thresholds={thresholds} className="w-32" />
    case "mono":
      return <span className="font-mono text-xs whitespace-nowrap">{value}</span>
    case "number":
    case "percent":
    case "hours":
      return <span className="tabular-nums">{formatCellText(value, format)}</span>
    case "date":
      return <span className="whitespace-nowrap">{formatCellText(value, format)}</span>
    default:
      return <>{formatCellText(value, format)}</>
  }
}

export function ReportCell<R>({ column, row, d, thresholds }: { column: ReportColumn<R>; row: R; d: ReportData; thresholds?: ThresholdConfig }) {
  const detail = column.detail?.(row, d)
  const main = column.render ? column.render(row, d) : <ReportValue value={column.value(row, d)} format={column.format} thresholds={thresholds} />
  if (detail === undefined || detail === null || detail === "") return <>{main}</>
  return (
    <div className="min-w-0">
      <div className={cn(column.format === "text" || !column.format ? "font-medium" : undefined)}>{main}</div>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
