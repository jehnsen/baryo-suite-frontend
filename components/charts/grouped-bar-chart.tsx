"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip, formatTick, type ValueFormat } from "./chart-tooltip"

export interface ChartSeries {
  key: string
  name: string
  /** Use categorical slots in fixed order: var(--chart-1), var(--chart-2)… */
  color: string
}

interface GroupedBarChartProps {
  data: Array<{ label: string } & Record<string, number | string>>
  series: ChartSeries[]
  height?: number
  horizontal?: boolean
  categoryWidth?: number
  valueFormat?: ValueFormat
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 }

/** Multi-series bars (e.g. Budget vs Obligated vs Disbursed) with an always-visible legend. */
export function GroupedBarChart({ data, series, height = 280, horizontal, categoryWidth = 120, valueFormat }: GroupedBarChartProps) {
  const tickFormatter = (v: number) => formatTick(v, valueFormat)
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <div style={{ height }} role="img" aria-label={`${series.map((s) => s.name).join(", ")} by category`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="24%"
            barGap={2}
          >
            <CartesianGrid stroke="var(--chart-grid)" vertical={Boolean(horizontal)} horizontal={!horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
                <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={categoryWidth} interval={0} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={tickFormatter} />
              </>
            )}
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...p} valueFormat={valueFormat} />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={14} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
