import { startOfMonth, startOfYear } from "date-fns"
import {
  ASSET_CONDITIONS,
  BLOTTER_INCIDENT_TYPES,
  BUDGET_CATEGORIES,
  CERTIFICATE_TYPES,
  CIVIL_STATUSES,
  CLASSIFICATION_LABELS,
  GENDERS,
  HOUSING_TYPES,
  INCOME_RANGES,
  PAYMENT_METHODS,
  SERVICE_TYPES,
  toOptions,
} from "@/lib/constants"
import { formatDate, officialName, toISODate } from "@/lib/format"
import type { ReportData } from "./data"
import { REPORT_AGE_GROUPS } from "./metrics"
import type { FilterOptionsSource, ReportFilterId, ReportFilterSpec, ReportFilterState } from "./types"

export type ReportFilterKind = "multi" | "dateRange" | "fiscalYear" | "search"

interface FilterMeta {
  label: string
  kind: ReportFilterKind
  options?: FilterOptionsSource
}

/** The shared filter vocabulary. Reports pick filters by id and bind them to their records. */
export const REPORT_FILTERS: Record<ReportFilterId, FilterMeta> = {
  search: { label: "Search", kind: "search" },
  dateRange: { label: "Date range", kind: "dateRange" },
  fiscalYear: { label: "Fiscal year", kind: "fiscalYear" },
  purok: { label: "Purok", kind: "multi", options: (d) => d.settings.puroks.map((p) => ({ label: p.name, value: p.name })) },
  status: { label: "Status", kind: "multi" },
  category: { label: "Category", kind: "multi" },
  gender: { label: "Gender", kind: "multi", options: GENDERS },
  ageGroup: { label: "Age group", kind: "multi", options: REPORT_AGE_GROUPS.map((g) => g.label) },
  civilStatus: { label: "Civil status", kind: "multi", options: CIVIL_STATUSES },
  classification: {
    label: "Classification",
    kind: "multi",
    options: () => Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => ({ label, value })),
  },
  voterStatus: { label: "Voter status", kind: "multi", options: ["Registered", "Not Registered"] },
  certificateType: { label: "Certificate type", kind: "multi", options: CERTIFICATE_TYPES },
  serviceType: { label: "Service type", kind: "multi", options: SERVICE_TYPES },
  incidentType: { label: "Incident type", kind: "multi", options: BLOTTER_INCIDENT_TYPES },
  budgetCategory: { label: "Budget category", kind: "multi", options: BUDGET_CATEGORIES },
  fundSource: {
    label: "Fund source",
    kind: "multi",
    options: (d) => [...d.fundSources].sort((a, b) => b.fiscalYear - a.fiscalYear).map((f) => ({ label: f.name, value: f.id })),
  },
  ppa: { label: "PPA", kind: "multi", options: (d) => d.ppas.map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id })) },
  project: {
    label: "Project",
    kind: "multi",
    options: (d) => d.projects.filter(d.scope.project).map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id })),
  },
  official: {
    label: "Responsible official",
    kind: "multi",
    options: (d) => [...d.officials].sort((a, b) => a.rank - b.rank).map((o) => ({ label: officialName(o), value: o.id })),
  },
  committee: { label: "Committee", kind: "multi", options: (d) => d.committees.filter(d.scope.committeeVisible).map((c) => ({ label: c.name, value: c.id })) },
  paymentMethod: { label: "Payment method", kind: "multi", options: PAYMENT_METHODS },
  condition: { label: "Condition", kind: "multi", options: ASSET_CONDITIONS },
  incomeRange: { label: "Income range", kind: "multi", options: INCOME_RANGES },
  housingType: { label: "Housing type", kind: "multi", options: HOUSING_TYPES },
  transactionType: { label: "Transaction type", kind: "multi", options: ["Stock In", "Stock Out", "Adjustment"] },
}

export const filterLabel = <S>(spec: ReportFilterSpec<S>) => spec.label ?? REPORT_FILTERS[spec.id].label
export const filterKind = <S>(spec: ReportFilterSpec<S>) => REPORT_FILTERS[spec.id].kind

export function filterOptions<S>(spec: ReportFilterSpec<S>, d: ReportData) {
  const source = spec.options ?? REPORT_FILTERS[spec.id].options ?? []
  return typeof source === "function" ? source(d) : toOptions(source)
}

function defaultRange(kind: ReportFilterSpec<unknown>["defaultRange"], now: Date) {
  if (!kind) return {}
  const today = toISODate(now)
  const from = kind === "today" ? today : toISODate(kind === "month" ? startOfMonth(now) : startOfYear(now))
  return { from, to: today }
}

/** Initial (and Reset) state: declared defaults, and the shared finance fiscal year. */
export function defaultFilterState<S>(specs: ReportFilterSpec<S>[] = [], ctx: { now: Date; fiscalYear: number }): ReportFilterState {
  const values: Record<string, string[]> = {}
  let range = {}
  specs.forEach((s) => {
    if (s.defaultValues) values[s.id] = s.defaultValues
    if (s.defaultRange) range = defaultRange(s.defaultRange, ctx.now)
  })
  return { values, range, fiscalYear: specs.some((s) => s.id === "fiscalYear") ? ctx.fiscalYear : null, search: "" }
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

const asArray = (v: string | number | string[] | null | undefined) => (Array.isArray(v) ? v : v === null || v === undefined ? [] : [String(v)])

/** Apply the report's filters to its source records. */
export function applyReportFilters<S>(items: S[], specs: ReportFilterSpec<S>[] = [], state: ReportFilterState, d: ReportData): S[] {
  const q = normalize(state.search.trim())
  const active = specs.filter((s) => {
    const kind = filterKind(s)
    if (kind === "multi") return (state.values[s.id]?.length ?? 0) > 0
    if (kind === "dateRange") return Boolean(state.range.from || state.range.to)
    if (kind === "fiscalYear") return state.fiscalYear !== null
    return q.length > 0
  })
  if (!active.length) return items
  return items.filter((item) =>
    active.every((s) => {
      switch (filterKind(s)) {
        case "multi":
          return asArray(s.get?.(item, d)).some((v) => state.values[s.id].includes(v))
        case "fiscalYear":
          return asArray(s.get?.(item, d)).includes(String(state.fiscalYear))
        case "dateRange": {
          const date = s.getDate?.(item)?.slice(0, 10)
          if (!date) return false
          return (!state.range.from || date >= state.range.from) && (!state.range.to || date <= state.range.to)
        }
        case "search":
          return normalize(s.getText?.(item, d) ?? "").includes(q)
      }
    }),
  )
}

/** Human-readable period and criteria lines for the print header, exports and run history. */
export function describeFilters<S>(specs: ReportFilterSpec<S>[] = [], state: ReportFilterState, d: ReportData) {
  const criteria: string[] = []
  let period = `As of ${formatDate(d.now, "MMMM d, yyyy")}`
  specs.forEach((s) => {
    switch (filterKind(s)) {
      case "fiscalYear":
        if (state.fiscalYear !== null) period = `Fiscal Year ${state.fiscalYear}`
        break
      case "multi": {
        const selected = state.values[s.id] ?? []
        if (!selected.length) break
        const options = filterOptions(s, d)
        criteria.push(`${filterLabel(s)}: ${selected.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ")}`)
        break
      }
      case "search":
        if (state.search.trim()) criteria.push(`Search: “${state.search.trim()}”`)
        break
    }
  })
  // A date range is more specific than a fiscal year, so it wins as the period line.
  const { from, to } = state.range
  if (from || to) {
    period =
      from && to && from === to
        ? formatDate(from, "MMMM d, yyyy")
        : `${from ? formatDate(from, "MMMM d, yyyy") : "Beginning"} – ${to ? formatDate(to, "MMMM d, yyyy") : formatDate(d.now, "MMMM d, yyyy")}`
    if (state.fiscalYear !== null) criteria.unshift(`Fiscal Year ${state.fiscalYear}`)
  }
  return { period, criteria }
}

const canonical = (s: ReportFilterState) =>
  JSON.stringify({
    ...s,
    values: Object.entries(s.values)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => [k, [...v].sort()])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
    range: [s.range.from ?? null, s.range.to ?? null],
    search: s.search.trim(),
  })

export const sameFilterState = (a: ReportFilterState, b: ReportFilterState) => canonical(a) === canonical(b)
