"use client"

import { Check, RotateCcw, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRangeFilter } from "@/components/shared/date-range-filter"
import { FacetedFilter } from "@/components/shared/filter-bar"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { SearchInput } from "@/components/shared/search-input"
import { StatusBadge } from "@/components/shared/status-badge"
import type { ReportData } from "@/lib/reports/data"
import { filterKind, filterLabel, filterOptions } from "@/lib/reports/filters"
import type { ReportFilterSpec, ReportFilterState } from "@/lib/reports/types"

interface ReportFiltersProps<S> {
  specs: ReportFilterSpec<S>[]
  draft: ReportFilterState
  onDraftChange: (next: ReportFilterState) => void
  /** Draft differs from what is applied. */
  dirty: boolean
  /** Applied state differs from the report's defaults. */
  canReset: boolean
  onApply: () => void
  onReset: () => void
  /** "Period · criteria" of the applied filters. */
  appliedSummary: string
  d: ReportData
}

/**
 * Shared report filters. Changes are drafted and take effect on Apply, so a
 * long report is recomputed once per change set (and print/export always match
 * what is on screen).
 */
export function ReportFilters<S>({ specs, draft, onDraftChange, dirty, canReset, onApply, onReset, appliedSummary, d }: ReportFiltersProps<S>) {
  if (!specs.length) return null
  const ordered = [...specs].sort((a, b) => rank(filterKind(a)) - rank(filterKind(b)))
  return (
    <form
      className="no-print space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-xs"
      onSubmit={(e) => {
        e.preventDefault()
        if (dirty) onApply()
      }}
      aria-label="Report filters"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SlidersHorizontal className="mr-1 hidden size-4 text-muted-foreground sm:block" aria-hidden />
          {ordered.map((spec) => {
            switch (filterKind(spec)) {
              case "search":
                return (
                  <SearchInput
                    key={spec.id}
                    value={draft.search}
                    onChange={(search) => onDraftChange({ ...draft, search })}
                    placeholder={spec.label ?? "Search…"}
                    className="sm:w-60 [&_input]:h-8 [&_input]:min-h-8"
                  />
                )
              case "fiscalYear":
                return (
                  <FiscalYearSelector
                    key={spec.id}
                    size="sm"
                    allowAll
                    value={draft.fiscalYear}
                    onChange={(fiscalYear) => onDraftChange({ ...draft, fiscalYear })}
                  />
                )
              case "dateRange":
                return <DateRangeFilter key={spec.id} label={filterLabel(spec)} value={draft.range} onChange={(range) => onDraftChange({ ...draft, range })} />
              case "multi":
                return (
                  <FacetedFilter
                    key={spec.id}
                    label={filterLabel(spec)}
                    options={filterOptions(spec, d)}
                    selected={draft.values[spec.id] ?? []}
                    onChange={(v) => onDraftChange({ ...draft, values: { ...draft.values, [spec.id]: v } })}
                  />
                )
            }
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onReset} disabled={!canReset && !dirty}>
            <RotateCcw /> Reset
          </Button>
          <Button type="submit" size="sm" className="h-8" disabled={!dirty}>
            <Check /> Apply filters
          </Button>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Showing:</span> {appliedSummary}
        {dirty && <StatusBadge status="Changes not applied" tone="warning" />}
      </p>
    </form>
  )
}

const rank = (kind: string) => ({ search: 0, fiscalYear: 1, dateRange: 2, multi: 3 })[kind] ?? 4
