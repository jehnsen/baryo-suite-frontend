"use client"

import { SimpleBarChart } from "@/components/charts/bar-chart"
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart"
import { ProportionBar } from "@/components/charts/proportion-bar"
import { TrendChart } from "@/components/charts/trend-chart"
import { SectionCard } from "@/components/shared/section-card"
import type { ReportData } from "@/lib/reports/data"
import type { ReportChart as ReportChartSpec } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

/** Categorical slots in fixed order — series colour follows the series, never its rank. */
const slot = (i: number) => `var(--chart-${(i % 8) + 1})`

/** Renders a declarative report chart with the shared chart components. */
export function ReportChart<S, R>({ chart, items, rows, d }: { chart: ReportChartSpec<S, R>; items: S[]; rows: R[]; d: ReportData }) {
  const input = { items, rows, d }
  let body: React.ReactNode
  switch (chart.type) {
    case "bar":
    case "hbar": {
      const data = chart.data(input)
      const horizontal = chart.type === "hbar"
      body = (
        <SimpleBarChart
          data={data}
          seriesName={chart.seriesName}
          horizontal={horizontal}
          valueFormat={chart.valueFormat}
          showValues={data.length <= 12}
          categoryWidth={horizontal ? Math.min(180, Math.max(64, ...data.map((x) => x.label.length * 6.2))) : undefined}
          height={chart.height ?? (horizontal ? Math.max(200, data.length * 34) : 240)}
        />
      )
      break
    }
    case "trend":
      body = <TrendChart data={chart.data(input)} seriesName={chart.seriesName} valueFormat={chart.valueFormat} height={chart.height ?? 240} />
      break
    case "grouped": {
      const data = chart.data(input)
      body = (
        <GroupedBarChart
          data={data}
          series={chart.series.map((s, i) => ({ ...s, color: slot(i) }))}
          horizontal={chart.horizontal}
          valueFormat={chart.valueFormat}
          categoryWidth={chart.horizontal ? Math.min(180, Math.max(80, ...data.map((x) => String(x.label).length * 6.2))) : undefined}
          height={chart.height ?? (chart.horizontal ? Math.max(220, data.length * 44) : 280)}
        />
      )
      break
    }
    case "proportion":
      body = <ProportionBar segments={chart.data(input).map((x, i) => ({ ...x, color: slot(i) }))} />
      break
  }
  return (
    <SectionCard title={chart.title} description={chart.description} className={cn(chart.wide && "lg:col-span-2")}>
      {body}
    </SectionCard>
  )
}
