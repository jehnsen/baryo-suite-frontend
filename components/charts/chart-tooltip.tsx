"use client"

import type { TooltipContentProps } from "recharts"
import { formatNumber, formatPeso, formatPesoCompact } from "@/lib/format"

export type ValueFormat = "number" | "peso" | "percent"

/** Full value for tooltips. */
export const formatValue = (v: number, f: ValueFormat = "number") => (f === "peso" ? formatPeso(v) : f === "percent" ? `${v.toFixed(1)}%` : formatNumber(v))
/** Short value for axes and bar labels. */
export const formatTick = (v: number, f: ValueFormat = "number") =>
  f === "peso" ? formatPesoCompact(v) : f === "percent" ? `${Math.round(v)}%` : formatNumber(v)

/** Shared tooltip body: label + one row per series with a color key. */
export function ChartTooltip({ active, payload, label, unit, valueFormat }: Partial<TooltipContentProps> & { unit?: string; valueFormat?: ValueFormat }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-32 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-[2px]" style={{ background: (p.payload as { fill?: string })?.fill ?? p.color }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums">
              {formatValue(Number(p.value), valueFormat)}
              {unit ? ` ${unit}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
