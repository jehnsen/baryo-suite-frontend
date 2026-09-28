import { TONE_CLASSES, type Tone } from "@/lib/status"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface ThresholdConfig {
  warning: number
  critical: number
}

/** Tone for a utilization percentage against the configured thresholds. */
export function utilizationTone(value: number, t?: ThresholdConfig): Tone {
  if (!t) return "info"
  if (value >= t.critical) return "danger"
  if (value >= t.warning) return "warning"
  return "success"
}

interface UtilizationBarProps {
  /** 0–100+ (values above 100 render full and red). */
  value: number
  thresholds?: ThresholdConfig
  tone?: Tone
  showLabel?: boolean
  className?: string
  size?: "sm" | "md"
  label?: string
}

/** Horizontal bar with optional threshold markers — budget utilization, progress, stock level. */
export function UtilizationBar({ value, thresholds, tone, showLabel = true, className, size = "sm", label = "Utilization" }: UtilizationBarProps) {
  const t = tone ?? utilizationTone(value, thresholds)
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("relative flex-1 overflow-hidden rounded-full bg-muted", size === "sm" ? "h-2" : "h-2.5")}
        role="meter"
        aria-label={label}
        aria-valuetext={formatPercent(value)}
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full transition-all", TONE_CLASSES[t].dot)} style={{ width: `${width}%` }} />
        {thresholds &&
          [thresholds.warning, thresholds.critical].map((m) => (
            <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-background/90" style={{ left: `${m}%` }} />
          ))}
      </div>
      {showLabel && <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{formatPercent(value)}</span>}
    </div>
  )
}

/** Label + value + bar, stacked. */
export function ProgressMetric({
  label,
  value,
  detail,
  tone,
  thresholds,
  className,
}: {
  label: string
  value: number
  detail?: React.ReactNode
  tone?: Tone
  thresholds?: ThresholdConfig
  className?: string
}) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-border/70 bg-background/70 p-4", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tracking-tight tabular-nums">{formatPercent(value, 0)}</span>
      </div>
      <UtilizationBar label={label} value={value} tone={tone} thresholds={thresholds} showLabel={false} size="md" />
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

/** Physical vs financial progress, side by side — projects and PPAs. */
export function DualProgress({ physical, financial, className }: { physical: number; financial: number; className?: string }) {
  const gap = financial - physical
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <ProgressMetric label="Physical progress" value={physical} tone="info" />
      <ProgressMetric
        label="Financial progress"
        value={financial}
        tone={gap > 15 ? "warning" : "success"}
        detail={gap > 15 ? "Spending is ahead of physical accomplishment." : undefined}
      />
    </div>
  )
}
