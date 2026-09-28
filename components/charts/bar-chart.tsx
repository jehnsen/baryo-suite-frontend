"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "./chart-tooltip"

export interface CategoryDatum {
  label: string
  value: number
}

interface SimpleBarChartProps {
  data: CategoryDatum[]
  /** Series name shown in the tooltip. */
  seriesName: string
  height?: number
  horizontal?: boolean
  color?: string
  unit?: string
  /** Print the value at the end of each bar (use for ≤ ~8 bars). */
  showValues?: boolean
  /** Width reserved for category labels on horizontal charts. */
  categoryWidth?: number
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 }

/** Single-series bar chart — one hue, recessive grid, value labels optional. */
export function SimpleBarChart({
  data,
  seriesName,
  height = 240,
  horizontal,
  color = "var(--chart-1)",
  unit,
  showValues,
  categoryWidth = 64,
}: SimpleBarChartProps) {
  return (
    <div style={{ height }} role="img" aria-label={`${seriesName} bar chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: showValues && !horizontal ? 16 : 4, right: showValues && horizontal ? 28 : 8, bottom: 0, left: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke="var(--chart-grid)" vertical={Boolean(horizontal)} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={categoryWidth} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            </>
          )}
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...p} unit={unit} />} />
          <Bar dataKey="value" name={seriesName} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36}>
            {showValues && <LabelList dataKey="value" position={horizontal ? "right" : "top"} className="fill-muted-foreground text-[11px] tabular-nums" />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
