"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "./chart-tooltip"
import type { CategoryDatum } from "./bar-chart"

/** Single-series area trend with a hover crosshair. */
export function TrendChart({
  data,
  seriesName,
  height = 240,
  color = "var(--chart-1)",
}: {
  data: CategoryDatum[]
  seriesName: string
  height?: number
  color?: string
}) {
  const gradientId = `trend-${seriesName.replace(/\W/g, "")}`
  return (
    <div style={{ height }} role="img" aria-label={`${seriesName} trend chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} content={(p) => <ChartTooltip {...p} />} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
