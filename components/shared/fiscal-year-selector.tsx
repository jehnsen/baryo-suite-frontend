"use client"

import { CalendarRange } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "./status-badge"
import { useBudgets } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"

/** Shared fiscal-year context for finance screens. */
export function FiscalYearSelector() {
  const { fiscalYear, fiscalYears, setFiscalYear } = useFiscalYear()
  const budgets = useBudgets()
  return (
    <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))}>
      <SelectTrigger className="h-10 w-48 rounded-xl border-primary/15 bg-card shadow-xs" aria-label="Fiscal year">
        <CalendarRange className="text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
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
