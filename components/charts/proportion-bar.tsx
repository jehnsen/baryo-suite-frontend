import { formatNumber } from "@/lib/format"

export interface ProportionSegment {
  label: string
  value: number
  color: string
}

/**
 * Part-to-whole for 2–4 categories as one stacked bar with a labelled legend
 * (identity is never color-alone). Better than a pie for small category counts.
 */
export function ProportionBar({ segments }: { segments: ProportionSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${formatNumber(s.value)}`} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {segments.map((s) => (
          <li key={s.label} className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums">{formatNumber(s.value)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{((s.value / total) * 100).toFixed(1)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
