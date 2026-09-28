"use client"

import { CalendarRange } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "./status-badge"
import { useBudgets } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { cn } from "@/lib/utils"

interface FiscalYearSelectorProps {
  /** Controlled mode (e.g. a report filter draft). Omit to read/write the shared finance fiscal year. */
  value?: number | null
  onChange?: (fiscalYear: number | null) => void
  /** Offer "All fiscal years" (controlled mode only). */
  allowAll?: boolean
  size?: "sm" | "default"
  className?: string
}

/** Fiscal-year picker. Uncontrolled it is the shared finance context; controlled it is a filter. */
export function FiscalYearSelector({ value, onChange, allowAll, size = "default", className }: FiscalYearSelectorProps) {
  const { fiscalYear, fiscalYears, setFiscalYear } = useFiscalYear()
  const budgets = useBudgets()
  const controlled = onChange !== undefined
  const current = controlled ? value : fiscalYear
  return (
    <Select
      value={current === null || current === undefined ? "all" : String(current)}
      onValueChange={(v) => {
        const next = v === "all" ? null : Number(v)
        if (controlled) onChange(next)
        else if (next !== null) setFiscalYear(next)
      }}
    >
      <SelectTrigger
        size={size}
        className={cn(size === "sm" ? "h-8 min-h-8 w-auto min-w-40" : "h-10 w-48 rounded-xl border-primary/15 bg-card shadow-xs", className)}
        aria-label="Fiscal year"
      >
        <CalendarRange className={cn(size === "sm" ? "text-muted-foreground" : "text-primary")} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align={size === "sm" ? "start" : "end"}>
        {controlled && allowAll && <SelectItem value="all">All fiscal years</SelectItem>}
        {fiscalYears.map((fy) => {
          const b = budgets.find((x) => x.fiscalYear === fy)
          return (
            <SelectItem key={fy} value={String(fy)}>
              <span className="flex w-full items-center justify-between gap-3">
                FY {fy} {b && <StatusBadge status={b.status} showDot={false} className="h-4 px-1.5 text-[10px]" />}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
