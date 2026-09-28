import type { AnnualBudget, BudgetAllocation, Collection, Disbursement, Expense, FundSource, Obligation, PPA } from "@/types"
import {
  BUDGET_CATEGORIES,
  COLLECTION_STATUSES,
  COLLECTION_TYPES,
  COMMITTED_OBLIGATION_STATUSES,
  DISBURSEMENT_METHODS,
  DISBURSEMENT_STATUSES,
  OBLIGATION_STATUSES,
  PAYMENT_METHODS,
  PPA_STATUSES,
} from "@/lib/constants"
import type { BudgetMetrics } from "@/lib/finance"
import { formatDate, formatPeso, formatPesoCompact, officialName } from "@/lib/format"
import type { ReportData } from "@/lib/reports/data"
import { monthKey, monthLabel, monthsOfYear, percent, sum, sumBy, yearOf } from "@/lib/reports/metrics"
import { defineReport, type ReportColumn, type ReportFilterSpec } from "@/lib/reports/types"

/*
 * Finance — every amount is read from the Phase 2 records through the shared
 * ledger (lib/finance). Nothing here stores or re-derives totals differently:
 *   Available = Approved − Obligated · Utilization = Obligated ÷ Approved
 */

const FINANCE_PUBLIC = ["finance" as const, "public" as const]

/* Fiscal year of a record, through its PPA's budget (the ledger's grouping). */
const ppaYear = (ppaId: string | undefined, d: ReportData) => {
  const ppa = ppaId ? d.by.ppa.get(ppaId) : undefined
  return ppa ? d.by.budget.get(ppa.budgetId)?.fiscalYear : undefined
}
const obligationPpaId = (obligationId: string, d: ReportData) => d.by.obligation.get(obligationId)?.ppaId

const ppaLabel = (ppaId: string | undefined, d: ReportData) => {
  const p = ppaId ? d.by.ppa.get(ppaId) : undefined
  return p ? `${p.code} · ${p.name}` : undefined
}
const fundName = (id: string | undefined, d: ReportData) => (id ? d.by.fundSource.get(id)?.name : undefined)

/* Ledger figures as columns (Budget/Allocation, Obligated, Disbursed, Available, Utilization). */
function ledgerColumns<R>(metrics: (row: R, d: ReportData) => BudgetMetrics, approvedHeader: string): ReportColumn<R>[] {
  const pick = (k: keyof BudgetMetrics) => (r: R, d: ReportData) => metrics(r, d)[k]
  const totalOf = (k: keyof BudgetMetrics) => (rows: R[], d: ReportData) => sum(rows, (r) => metrics(r, d)[k])
  return [
    { id: "approved", header: approvedHeader, format: "peso", value: pick("approved"), total: "sum" },
    { id: "obligated", header: "Obligated", format: "peso", value: pick("obligated"), total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: pick("disbursed"), total: "sum" },
    { id: "available", header: "Available", format: "peso", value: pick("available"), total: "sum" },
    {
      id: "utilization",
      header: "Utilization",
      format: "utilization",
      value: pick("utilization"),
      total: (rows, d) => percent(totalOf("obligated")(rows, d), totalOf("approved")(rows, d)),
    },
  ]
}

const utilizationNote =
  "Utilization = obligated ÷ approved. Obligated counts approved, partially and fully disbursed obligations; disbursed counts released vouchers."

/* ------------------------------------------------------------------ budget -- */

type BudgetRow = AnnualBudget & { m: BudgetMetrics }

export const budgetSummary = defineReport<AnnualBudget, BudgetRow>({
  id: "budget-summary",
  title: "Annual Budget Summary",
  description: "Approved budget, appropriations, obligations, disbursements and available balance per fiscal year.",
  section: "finance",
  slug: "finance",
  access: FINANCE_PUBLIC,
  source: (d) => [...d.budgets].sort((a, b) => b.fiscalYear - a.fiscalYear),
  filters: [{ id: "fiscalYear", get: (b) => b.fiscalYear }],
  rows: (items, d) => items.map((b) => ({ ...b, m: d.ledger.forBudget(b.id) })),
  rowId: (b) => b.id,
  columns: [
    { id: "fiscalYear", header: "Fiscal Year", value: (b) => `FY ${b.fiscalYear}`, detail: (b) => b.title },
    { id: "budget", header: "Approved Budget", format: "peso", value: (b) => b.approvedBudget, total: "sum" },
    { id: "appropriated", header: "Appropriated", format: "peso", value: (b) => b.m.approved, total: "sum" },
    { id: "obligated", header: "Obligated", format: "peso", value: (b) => b.m.obligated, total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: (b) => b.m.disbursed, total: "sum" },
    { id: "available", header: "Available Balance", format: "peso", value: (b) => b.m.available, total: "sum" },
    { id: "utilization", header: "Utilization", format: "utilization", value: (b) => b.m.utilization },
    { id: "status", header: "Status", format: "status", value: (b) => b.status },
  ],
  summary: (_items, rows) => {
    const t = (k: "approved" | "obligated" | "disbursed" | "available") => sum(rows, (r) => r.m[k])
    return [
      { label: "Approved budget", value: sum(rows, (r) => r.approvedBudget), format: "peso" },
      { label: "Appropriated", value: t("approved"), format: "peso", hint: "Sum of category allocations" },
      { label: "Obligated", value: t("obligated"), format: "peso", hint: `${percent(t("obligated"), t("approved")).toFixed(1)}% utilization` },
      { label: "Disbursed", value: t("disbursed"), format: "peso", hint: `${percent(t("disbursed"), t("approved")).toFixed(1)}% of appropriations` },
      { label: "Available balance", value: t("available"), format: "peso", hint: "Appropriated − obligated" },
    ]
  },
  note: `Appropriated is the sum of the year's category allocations; any difference from the approved budget is unappropriated. ${utilizationNote}`,
})

type AllocationRow = BudgetAllocation & { m: BudgetMetrics }

const fyOfBudget = (budgetId: string, d: ReportData) => d.by.budget.get(budgetId)?.fiscalYear

export const budgetAllocation = defineReport<BudgetAllocation, AllocationRow>({
  id: "budget-allocation",
  title: "Budget Allocation Report",
  description: "Allocation per budget category against obligations, disbursements and available balance.",
  section: "finance",
  slug: "finance",
  access: FINANCE_PUBLIC,
  source: (d) => d.allocations,
  filters: [
    { id: "fiscalYear", get: (a, d) => fyOfBudget(a.budgetId, d) },
    { id: "budgetCategory", get: (a) => a.category },
  ],
  rows: (items, d) =>
    items
      .map((a) => ({ ...a, m: d.ledger.forAllocation(a) }))
      .sort((a, b) => BUDGET_CATEGORIES.indexOf(a.category) - BUDGET_CATEGORIES.indexOf(b.category) || a.budgetId.localeCompare(b.budgetId)),
  rowId: (a) => a.id,
  columns: [
    {
      id: "category",
      header: "Budget Category",
      value: (a) => a.category,
      detail: (a, d) => (a.revisedAmount ? `Revised from ${formatPeso(a.approvedAmount)}` : `FY ${fyOfBudget(a.budgetId, d)}`),
    },
    ...ledgerColumns<AllocationRow>((a) => a.m, "Allocation"),
  ],
  summary: (_items, rows, d) => {
    const approved = sum(rows, (r) => r.m.approved)
    const obligated = sum(rows, (r) => r.m.obligated)
    const t = d.settings.budgetThresholds
    return [
      { label: "Allocated", value: approved, format: "peso" },
      { label: "Obligated", value: obligated, format: "peso" },
      { label: "Utilization", value: percent(obligated, approved), format: "percent" },
      {
        label: `At or above ${t.warning}%`,
        value: rows.filter((r) => r.m.utilization >= t.warning).length,
        tone: "warning",
        hint: "Categories nearing their limit",
      },
    ]
  },
  charts: [
    {
      type: "grouped",
      title: "Allocation vs obligated vs disbursed",
      wide: true,
      horizontal: true,
      valueFormat: "peso",
      series: [
        { key: "allocation", name: "Allocation" },
        { key: "obligated", name: "Obligated" },
        { key: "disbursed", name: "Disbursed" },
      ],
      data: ({ rows }) => rows.map((r) => ({ label: r.category, allocation: r.m.approved, obligated: r.m.obligated, disbursed: r.m.disbursed })),
    },
  ],
  note: utilizationNote,
})

/* --------------------------------------------------------------------- PPAs -- */

const pf = {
  year: { id: "fiscalYear", get: (p, d) => fyOfBudget(p.budgetId, d) },
  category: { id: "budgetCategory", get: (p) => p.category },
  fund: { id: "fundSource", get: (p) => p.fundSourceId },
  ppa: { id: "ppa", get: (p) => p.id },
  official: { id: "official", get: (p) => p.responsibleOfficialId },
  status: { id: "status", options: PPA_STATUSES, get: (p) => p.status },
} satisfies Record<string, ReportFilterSpec<PPA>>

type PPARow = PPA & { m: BudgetMetrics }
const toPPARows = (items: PPA[], d: ReportData): PPARow[] => items.map((p) => ({ ...p, m: d.ledger.forPPA(p) })).sort((a, b) => a.code.localeCompare(b.code))

const ppaNameColumn: ReportColumn<PPARow> = { id: "ppa", header: "PPA", value: (p) => p.name, detail: (p) => `${p.code} · ${p.type}`, total: "count" }

export const budgetUtilization = defineReport<PPA, PPARow>({
  id: "budget-utilization",
  title: "Budget Utilization",
  description: "Utilization of programmed PPA budgets by category, PPA and fund source.",
  section: "finance",
  slug: "finance",
  source: (d) => d.ppas,
  filters: [pf.year, pf.category, pf.fund, pf.ppa],
  rows: toPPARows,
  rowId: (p) => p.id,
  groupings: [
    { id: "category", label: "Category", by: (p) => p.category, order: BUDGET_CATEGORIES, summary: true },
    { id: "fund", label: "Fund source", by: (p, d) => fundName(p.fundSourceId, d) ?? "—", summary: true },
  ],
  defaultGrouping: "category",
  columns: [ppaNameColumn, ...ledgerColumns<PPARow>((p) => p.m, "Budget")],
  summary: (_items, rows, d) => {
    const approved = sum(rows, (r) => r.m.approved)
    const obligated = sum(rows, (r) => r.m.obligated)
    const disbursed = sum(rows, (r) => r.m.disbursed)
    return [
      { label: "Programmed budget", value: approved, format: "peso", hint: `${rows.length} PPAs` },
      { label: "Obligation utilization", value: percent(obligated, approved), format: "percent" },
      { label: "Disbursement utilization", value: percent(disbursed, approved), format: "percent" },
      {
        label: "PPAs over warning level",
        value: rows.filter((r) => r.m.utilization >= d.settings.budgetThresholds.warning).length,
        tone: "warning",
        hint: `≥ ${d.settings.budgetThresholds.warning}% obligated`,
      },
    ]
  },
  charts: [
    {
      type: "hbar",
      title: "Utilization by category",
      valueFormat: "percent",
      seriesName: "Utilization",
      data: ({ rows }) =>
        BUDGET_CATEGORIES.map((c) => {
          const list = rows.filter((r) => r.category === c)
          return {
            label: c,
            value:
              Math.round(
                percent(
                  sum(list, (r) => r.m.obligated),
                  sum(list, (r) => r.m.approved),
                ) * 10,
              ) / 10,
            n: list.length,
          }
        })
          .filter((x) => x.n > 0)
          .map(({ label, value }) => ({ label, value })),
    },
    {
      type: "hbar",
      title: "Utilization by fund source",
      valueFormat: "percent",
      seriesName: "Utilization",
      data: ({ rows, d }) =>
        [...new Set(rows.map((r) => r.fundSourceId))].map((id) => {
          const list = rows.filter((r) => r.fundSourceId === id)
          return {
            label: fundName(id, d) ?? "—",
            value:
              Math.round(
                percent(
                  sum(list, (r) => r.m.obligated),
                  sum(list, (r) => r.m.approved),
                ) * 10,
              ) / 10,
          }
        }),
    },
    {
      type: "hbar",
      title: "Top PPAs by utilization",
      wide: true,
      valueFormat: "percent",
      seriesName: "Utilization",
      data: ({ rows }) =>
        [...rows]
          .sort((a, b) => b.m.utilization - a.m.utilization)
          .slice(0, 10)
          .map((r) => ({ label: r.name, value: Math.round(r.m.utilization * 10) / 10 })),
    },
  ],
  note: `Budget is the PPA's approved (or revised) amount, so category subtotals cover programmed PPAs only; the Budget Allocation report measures against the full category allocation. ${utilizationNote}`,
})

type VarianceRow = BudgetAllocation & { m: BudgetMetrics }

export const budgetVsActual = defineReport<BudgetAllocation, VarianceRow>({
  id: "budget-vs-actual",
  title: "Budget vs Actual",
  description: "Approved allocation compared with obligations and actual disbursements, per category.",
  section: "finance",
  slug: "finance",
  access: FINANCE_PUBLIC,
  source: (d) => d.allocations,
  filters: [
    { id: "fiscalYear", get: (a, d) => fyOfBudget(a.budgetId, d) },
    { id: "budgetCategory", get: (a) => a.category },
  ],
  rows: (items, d) =>
    items.map((a) => ({ ...a, m: d.ledger.forAllocation(a) })).sort((a, b) => BUDGET_CATEGORIES.indexOf(a.category) - BUDGET_CATEGORIES.indexOf(b.category)),
  rowId: (a) => a.id,
  columns: [
    { id: "category", header: "Category", value: (a) => a.category },
    { id: "approved", header: "Approved", format: "peso", value: (a) => a.m.approved, total: "sum" },
    { id: "obligated", header: "Obligated", format: "peso", value: (a) => a.m.obligated, total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: (a) => a.m.disbursed, total: "sum" },
    { id: "variance", header: "Variance", format: "peso", value: (a) => a.m.approved - a.m.disbursed, total: "sum" },
    {
      id: "obligationRate",
      header: "Obligated %",
      format: "percent",
      value: (a) => a.m.utilization,
      total: (rows) =>
        percent(
          sum(rows, (r) => r.m.obligated),
          sum(rows, (r) => r.m.approved),
        ),
    },
    {
      id: "disbursementRate",
      header: "Disbursed %",
      format: "percent",
      value: (a) => a.m.disbursementRate,
      total: (rows) =>
        percent(
          sum(rows, (r) => r.m.disbursed),
          sum(rows, (r) => r.m.approved),
        ),
    },
  ],
  summary: (_items, rows) => {
    const approved = sum(rows, (r) => r.m.approved)
    const obligated = sum(rows, (r) => r.m.obligated)
    const disbursed = sum(rows, (r) => r.m.disbursed)
    return [
      { label: "Approved", value: approved, format: "peso" },
      { label: "Obligated", value: obligated, format: "peso", hint: `${percent(obligated, approved).toFixed(1)}% of approved` },
      { label: "Disbursed", value: disbursed, format: "peso", hint: `${percent(disbursed, approved).toFixed(1)}% of approved` },
      { label: "Unpaid obligations", value: obligated - disbursed, format: "peso", hint: "Obligated, not yet released" },
    ]
  },
  charts: [
    {
      type: "grouped",
      title: "Approved vs obligated vs disbursed",
      wide: true,
      horizontal: true,
      valueFormat: "peso",
      series: [
        { key: "approved", name: "Approved" },
        { key: "obligated", name: "Obligated" },
        { key: "disbursed", name: "Disbursed" },
      ],
      data: ({ rows }) => rows.map((r) => ({ label: r.category, approved: r.m.approved, obligated: r.m.obligated, disbursed: r.m.disbursed })),
    },
  ],
  orientation: "landscape",
})

export const ppaFinancialStatus = defineReport<PPA, PPARow>({
  id: "ppa-financial-status",
  title: "PPA Financial Status",
  description: "Budget, obligations, disbursements and balance of every program, project and activity.",
  section: "finance",
  slug: "finance",
  source: (d) => d.ppas,
  filters: [{ id: "search", label: "PPA code or name", getText: (p) => `${p.code} ${p.name}` }, pf.year, pf.category, pf.fund, pf.official, pf.status],
  rows: toPPARows,
  rowId: (p) => p.id,
  columns: [
    ppaNameColumn,
    { id: "category", header: "Category", value: (p) => p.category },
    { id: "budget", header: "Budget", format: "peso", value: (p) => p.m.approved, total: "sum" },
    { id: "obligated", header: "Obligated", format: "peso", value: (p) => p.m.obligated, total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: (p) => p.m.disbursed, total: "sum" },
    { id: "balance", header: "Balance", format: "peso", value: (p) => p.m.available, total: "sum" },
    {
      id: "utilization",
      header: "Utilization",
      format: "utilization",
      value: (p) => p.m.utilization,
      total: (rows) =>
        percent(
          sum(rows, (r) => r.m.obligated),
          sum(rows, (r) => r.m.approved),
        ),
    },
    { id: "fund", header: "Fund Source", value: (p, d) => fundName(p.fundSourceId, d), hidden: true },
    { id: "responsible", header: "Responsible", value: (p, d) => officialName(d.by.official.get(p.responsibleOfficialId)), hidden: true },
    { id: "status", header: "Status", format: "status", value: (p) => p.status },
  ],
  rowLink: { module: "allocations", href: (p) => `/ppas/${p.id}` },
  orientation: "landscape",
  note: utilizationNote,
})

/* ------------------------------------------------------------- collections -- */

const colf = {
  year: { id: "fiscalYear", get: (c) => yearOf(c.date) },
  range: { id: "dateRange", label: "Collection date", getDate: (c) => c.date },
  type: { id: "category", label: "Collection type", options: COLLECTION_TYPES, get: (c) => c.type },
  method: { id: "paymentMethod", options: PAYMENT_METHODS, get: (c) => c.paymentMethod },
  status: { id: "status", options: COLLECTION_STATUSES, get: (c) => c.status },
} satisfies Record<string, ReportFilterSpec<Collection>>

const valid = (c: Collection) => c.status !== "Cancelled"
const collectorName = (c: Collection, d: ReportData) => d.by.user.get(c.collectorId)?.name

type ShareRow = { label: string; count: number; amount: number; share: number }

export const collectionsSummary = defineReport<Collection, ShareRow>({
  id: "collections-summary",
  title: "Collections Summary",
  description: "Barangay collections by type, month and payment method.",
  section: "finance",
  slug: "finance",
  access: FINANCE_PUBLIC,
  source: (d) => d.collections.filter(valid),
  filters: [colf.year, colf.range, colf.type, colf.method],
  rows: (items) =>
    COLLECTION_TYPES.map((type) => {
      const list = items.filter((c) => c.type === type)
      return {
        label: type,
        count: list.length,
        amount: sum(list, (c) => c.amount),
        share: percent(
          sum(list, (c) => c.amount),
          sum(items, (c) => c.amount),
        ),
      }
    }),
  rowId: (r) => r.label,
  tableTitle: "Collections by type",
  columns: [
    { id: "label", header: "Collection Type", value: (r) => r.label },
    { id: "count", header: "Receipts", format: "number", value: (r) => r.count, total: "sum" },
    { id: "amount", header: "Amount", format: "peso", value: (r) => r.amount, total: "sum" },
    { id: "share", header: "Share", format: "progress", value: (r) => r.share },
  ],
  summary: (items) => {
    const total = sum(items, (c) => c.amount)
    const deposited = sum(
      items.filter((c) => c.status !== "Recorded"),
      (c) => c.amount,
    )
    return [
      { label: "Total collections", value: total, format: "peso" },
      { label: "Official receipts", value: items.length },
      { label: "Average per receipt", value: items.length ? total / items.length : 0, format: "peso" },
      { label: "Deposited", value: percent(deposited, total), format: "percent", hint: "Deposited or reconciled" },
    ]
  },
  charts: [
    {
      type: "bar",
      title: "Collections by month",
      wide: true,
      valueFormat: "peso",
      seriesName: "Collections",
      data: ({ items }) =>
        sumBy(
          items,
          (c) => monthKey(c.date),
          (c) => c.amount,
        )
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((x) => ({ label: monthLabel(x.label, "MMM yy"), value: x.value })),
    },
    {
      type: "hbar",
      title: "Collections by type",
      valueFormat: "peso",
      seriesName: "Amount",
      data: ({ rows }) => rows.map((r) => ({ label: r.label, value: r.amount })),
    },
    {
      type: "hbar",
      title: "Collections by payment method",
      valueFormat: "peso",
      seriesName: "Amount",
      data: ({ items }) =>
        sumBy(
          items,
          (c) => c.paymentMethod,
          (c) => c.amount,
          PAYMENT_METHODS,
        ).filter((x) => x.value > 0),
    },
  ],
  note: "Cancelled receipts are excluded.",
})

export const dailyCollections = defineReport<Collection>({
  id: "daily-collections",
  title: "Daily Collections Report",
  description: "Official receipts issued per day with collector and daily totals.",
  section: "finance",
  slug: "finance",
  source: (d) => [...d.collections].sort((a, b) => (b.date + b.orNumber).localeCompare(a.date + a.orNumber)),
  filters: [{ ...colf.range, defaultRange: "month" }, colf.type, colf.method, colf.status],
  rowId: (c) => c.id,
  groupings: [{ id: "date", label: "Date", by: (c) => formatDate(c.date, "EEE, MMM d, yyyy"), sortKey: (c) => c.date, descending: true }],
  defaultGrouping: "date",
  columns: [
    { id: "date", header: "Date", format: "date", value: (c) => c.date },
    { id: "orNumber", header: "O.R. Number", format: "mono", value: (c) => c.orNumber, total: "count" },
    { id: "payer", header: "Payer", value: (c) => c.payerName, detail: (c) => c.businessName },
    { id: "type", header: "Type", value: (c) => c.type },
    { id: "method", header: "Method", value: (c) => c.paymentMethod, hidden: true },
    { id: "collector", header: "Collector", value: collectorName },
    { id: "amount", header: "Amount", format: "peso", value: (c) => c.amount, total: (rows) => sum(rows.filter(valid), (c) => c.amount) },
    { id: "status", header: "Status", format: "status", value: (c) => c.status },
  ],
  summary: (items) => {
    const days = new Set(items.map((c) => c.date)).size
    const total = sum(items.filter(valid), (c) => c.amount)
    return [
      { label: "Collected", value: total, format: "peso", hint: "Excludes cancelled receipts" },
      { label: "Receipts", value: items.filter(valid).length },
      { label: "Days covered", value: days },
      { label: "Daily average", value: days ? total / days : 0, format: "peso" },
      { label: "Cancelled", value: items.filter((c) => !valid(c)).length, tone: "danger" },
    ]
  },
  rowLink: { module: "collections", href: (c) => `/finance/collections?open=${c.id}` },
  note: "Totals exclude cancelled receipts, which are listed for audit.",
})

type MonthRow = { month: string; receipts: number; total: number } & Record<string, number | string>

export const monthlyCollections = defineReport<Collection, MonthRow>({
  id: "monthly-collections",
  title: "Monthly Collections Report",
  description: "Monthly collection totals by type for the year, with the trend.",
  section: "finance",
  slug: "finance",
  source: (d) => d.collections.filter(valid),
  filters: [colf.year, colf.type, colf.method],
  rows: (items, d, f) =>
    monthsOfYear(f.fiscalYear ?? d.now.getFullYear(), d.now).map((month) => {
      const list = items.filter((c) => monthKey(c.date) === month)
      return {
        month,
        receipts: list.length,
        ...Object.fromEntries(
          COLLECTION_TYPES.map((t) => [
            t,
            sum(
              list.filter((c) => c.type === t),
              (c) => c.amount,
            ),
          ]),
        ),
        total: sum(list, (c) => c.amount),
      }
    }),
  rowId: (r) => r.month,
  columns: [
    { id: "month", header: "Month", value: (r) => monthLabel(r.month, "MMMM yyyy") },
    { id: "receipts", header: "Receipts", format: "number", value: (r) => r.receipts, total: "sum" },
    ...COLLECTION_TYPES.map((t) => ({
      id: t,
      header: t.replace("Other Barangay Collection", "Other").replace("Barangay ", ""),
      format: "peso" as const,
      value: (r: MonthRow) => Number(r[t]),
      total: "sum" as const,
    })),
    { id: "total", header: "Total", format: "peso", value: (r) => r.total, total: "sum" },
  ],
  summary: (_items, rows) => {
    const total = sum(rows, (r) => r.total)
    const best = [...rows].sort((a, b) => b.total - a.total)[0]
    const last = rows.at(-1)
    const prev = rows.at(-2)
    return [
      { label: "Year to date", value: total, format: "peso" },
      { label: "Monthly average", value: rows.length ? total / rows.length : 0, format: "peso" },
      { label: "Best month", value: best ? monthLabel(best.month, "MMMM") : "—", hint: best ? formatPesoCompact(best.total) : undefined },
      {
        label: "Latest vs prior month",
        value: last && prev && prev.total ? percent(last.total - prev.total, prev.total) : 0,
        format: "percent",
        hint: last ? monthLabel(last.month, "MMMM") : undefined,
      },
    ]
  },
  charts: [
    {
      type: "trend",
      title: "Monthly collections",
      wide: true,
      valueFormat: "peso",
      seriesName: "Collections",
      data: ({ rows }) => rows.map((r) => ({ label: monthLabel(r.month, "MMM"), value: r.total })),
    },
  ],
  orientation: "landscape",
  note: "Cancelled receipts are excluded. The current year runs to the current month.",
})

/* ---------------------------------------------- obligations & disbursements -- */

export const obligationReport = defineReport<Obligation>({
  id: "obligation-report",
  title: "Obligation Report",
  description: "Obligation requests charged to PPAs, with fund source, amount and status.",
  section: "finance",
  slug: "finance",
  source: (d) => [...d.obligations].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "fiscalYear", get: (o, d) => ppaYear(o.ppaId, d) },
    { id: "dateRange", label: "Obligation date", getDate: (o) => o.date },
    { id: "status", options: OBLIGATION_STATUSES, get: (o) => o.status },
    { id: "budgetCategory", get: (o, d) => d.by.ppa.get(o.ppaId)?.category },
    { id: "fundSource", get: (o) => o.fundSourceId },
    { id: "ppa", get: (o) => o.ppaId },
  ],
  rowId: (o) => o.id,
  columns: [
    { id: "obligationNumber", header: "Obligation No.", format: "mono", value: (o) => o.obligationNumber, total: "count" },
    { id: "date", header: "Date", format: "date", value: (o) => o.date },
    { id: "payee", header: "Payee", value: (o) => o.payee, detail: (o) => o.description },
    { id: "ppa", header: "PPA", value: (o, d) => ppaLabel(o.ppaId, d) },
    { id: "fund", header: "Fund Source", value: (o, d) => fundName(o.fundSourceId, d) },
    { id: "amount", header: "Amount", format: "peso", value: (o) => o.amount, total: "sum" },
    { id: "status", header: "Status", format: "status", value: (o) => o.status },
  ],
  summary: (items) => [
    { label: "Obligations", value: items.length },
    {
      label: "Committed",
      value: sum(
        items.filter((o) => COMMITTED_OBLIGATION_STATUSES.includes(o.status)),
        (o) => o.amount,
      ),
      format: "peso",
      hint: "Approved and disbursed",
    },
    {
      label: "Pending approval",
      value: sum(
        items.filter((o) => o.status === "Draft" || o.status === "For Review"),
        (o) => o.amount,
      ),
      format: "peso",
      tone: "warning",
    },
    {
      label: "Cancelled",
      value: sum(
        items.filter((o) => o.status === "Cancelled"),
        (o) => o.amount,
      ),
      format: "peso",
    },
  ],
  groupings: [
    { id: "status", label: "Status", by: (o) => o.status, order: OBLIGATION_STATUSES },
    { id: "category", label: "Category", by: (o, d) => d.by.ppa.get(o.ppaId)?.category ?? "—", order: BUDGET_CATEGORIES },
  ],
  rowLink: { module: "obligations", href: (o) => `/finance/obligations/${o.id}` },
  orientation: "landscape",
  note: "Amount totals include every listed obligation; use the Status filter for committed amounts only.",
})

export const disbursementReport = defineReport<Disbursement>({
  id: "disbursement-report",
  title: "Disbursement Report",
  description: "Disbursement vouchers with payee, PPA, payment method and status.",
  section: "finance",
  slug: "finance",
  source: (d) => [...d.disbursements].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "fiscalYear", get: (v, d) => ppaYear(obligationPpaId(v.obligationId, d), d) },
    { id: "dateRange", label: "Voucher date", getDate: (v) => v.date },
    { id: "status", options: DISBURSEMENT_STATUSES, get: (v) => v.status },
    { id: "paymentMethod", options: DISBURSEMENT_METHODS, get: (v) => v.paymentMethod },
    { id: "fundSource", get: (v) => v.fundSourceId },
    { id: "ppa", get: (v, d) => obligationPpaId(v.obligationId, d) },
  ],
  rowId: (v) => v.id,
  columns: [
    { id: "voucherNumber", header: "Voucher No.", format: "mono", value: (v) => v.voucherNumber, total: "count" },
    { id: "date", header: "Date", format: "date", value: (v) => v.date },
    { id: "payee", header: "Payee", value: (v) => v.payee },
    { id: "ppa", header: "PPA", value: (v, d) => ppaLabel(obligationPpaId(v.obligationId, d), d) },
    { id: "amount", header: "Amount", format: "peso", value: (v) => v.amount, total: "sum" },
    { id: "method", header: "Payment Method", value: (v) => v.paymentMethod, detail: (v) => v.referenceNumber },
    { id: "status", header: "Status", format: "status", value: (v) => v.status },
  ],
  summary: (items) => [
    { label: "Vouchers", value: items.length },
    {
      label: "Released",
      value: sum(
        items.filter((v) => v.status === "Released"),
        (v) => v.amount,
      ),
      format: "peso",
      tone: "success",
    },
    {
      label: "In process",
      value: sum(
        items.filter((v) => !["Released", "Cancelled"].includes(v.status)),
        (v) => v.amount,
      ),
      format: "peso",
      tone: "warning",
      hint: "Draft to approved",
    },
    { label: "Cancelled", value: items.filter((v) => v.status === "Cancelled").length },
  ],
  groupings: [
    { id: "status", label: "Status", by: (v) => v.status, order: DISBURSEMENT_STATUSES },
    { id: "method", label: "Payment method", by: (v) => v.paymentMethod, order: DISBURSEMENT_METHODS },
  ],
  rowLink: { module: "disbursements", href: (v) => `/finance/disbursements/${v.id}` },
  orientation: "landscape",
})

/* ---------------------------------------------------------------- expenses -- */

export const expenseReport = defineReport<Expense>({
  id: "expense-report",
  title: "Expense Report",
  description: "Expenses recorded from released disbursements, by category, PPA and fund source.",
  section: "finance",
  slug: "finance",
  source: (d) => [...d.expenses].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "fiscalYear", get: (e, d) => ppaYear(e.ppaId, d) ?? yearOf(e.date) },
    { id: "dateRange", label: "Expense date", getDate: (e) => e.date },
    { id: "budgetCategory", get: (e) => e.category },
    { id: "fundSource", get: (e) => e.fundSourceId },
    { id: "ppa", get: (e) => e.ppaId },
  ],
  rowId: (e) => e.id,
  groupings: [
    { id: "category", label: "Category", by: (e) => e.category, order: BUDGET_CATEGORIES, summary: true },
    { id: "ppa", label: "PPA", by: (e, d) => ppaLabel(e.ppaId, d) ?? "No PPA", summary: true },
    { id: "fund", label: "Fund source", by: (e, d) => fundName(e.fundSourceId, d) ?? "—", summary: true },
    { id: "month", label: "Month", by: (e) => monthLabel(monthKey(e.date), "MMMM yyyy"), sortKey: (e) => e.date },
  ],
  columns: [
    { id: "expenseNumber", header: "Expense No.", format: "mono", value: (e) => e.expenseNumber, total: "count" },
    { id: "date", header: "Date", format: "date", value: (e) => e.date },
    { id: "category", header: "Category", value: (e) => e.category },
    { id: "ppa", header: "PPA", value: (e, d) => (e.ppaId ? d.by.ppa.get(e.ppaId)?.code : undefined) },
    { id: "payee", header: "Payee", value: (e) => e.payee },
    { id: "description", header: "Description", value: (e) => e.description },
    { id: "amount", header: "Amount", format: "peso", value: (e) => e.amount, total: "sum" },
    { id: "fund", header: "Fund Source", value: (e, d) => fundName(e.fundSourceId, d) },
  ],
  summary: (items) => {
    const top = sumBy(
      items,
      (e) => e.category,
      (e) => e.amount,
    ).sort((a, b) => b.value - a.value)[0]
    return [
      { label: "Total expenses", value: sum(items, (e) => e.amount), format: "peso" },
      { label: "Entries", value: items.length },
      { label: "Largest category", value: top?.label ?? "—", format: "text", hint: top ? formatPesoCompact(top.value) : undefined },
      { label: "Without receipt", value: items.filter((e) => e.attachments.length === 0).length, tone: "warning", hint: "For liquidation" },
    ]
  },
  charts: [
    {
      type: "hbar",
      title: "Expenses by category",
      valueFormat: "peso",
      seriesName: "Expenses",
      data: ({ items }) =>
        sumBy(
          items,
          (e) => e.category,
          (e) => e.amount,
          BUDGET_CATEGORIES,
        ).filter((x) => x.value > 0),
    },
    {
      type: "bar",
      title: "Expenses by month",
      valueFormat: "peso",
      seriesName: "Expenses",
      data: ({ items }) =>
        sumBy(
          items,
          (e) => monthKey(e.date),
          (e) => e.amount,
        )
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((x) => ({ label: monthLabel(x.label, "MMM"), value: x.value })),
    },
  ],
  orientation: "landscape",
  note: "Expenses are created when a disbursement is released, so they reconcile with released vouchers.",
})

/* ------------------------------------------------------------ fund sources -- */

type FundRow = FundSource & { allocated: number; obligated: number; disbursed: number; remaining: number }

export const fundSourceSummary = defineReport<FundSource, FundRow>({
  id: "fund-source-summary",
  title: "Fund Source Summary",
  description: "Amount received per fund source against what was allocated, obligated and disbursed from it.",
  section: "finance",
  slug: "finance",
  access: FINANCE_PUBLIC,
  source: (d) => d.fundSources,
  filters: [
    { id: "fiscalYear", get: (f) => f.fiscalYear },
    { id: "fundSource", get: (f) => f.id },
  ],
  rows: (items, d) =>
    items.map((f) => {
      const obligated = sum(
        d.obligations.filter((o) => o.fundSourceId === f.id && COMMITTED_OBLIGATION_STATUSES.includes(o.status)),
        (o) => o.amount,
      )
      return {
        ...f,
        allocated: sum(
          d.ppas.filter((p) => p.fundSourceId === f.id),
          (p) => p.revisedBudget ?? p.approvedBudget,
        ),
        obligated,
        disbursed: sum(
          d.disbursements.filter((v) => v.fundSourceId === f.id && v.status === "Released"),
          (v) => v.amount,
        ),
        remaining: f.amount - obligated,
      }
    }),
  rowId: (f) => f.id,
  columns: [
    { id: "name", header: "Fund Source", value: (f) => f.name, detail: (f) => `${f.type} · ${f.referenceNumber}` },
    { id: "received", header: "Amount Received", format: "peso", value: (f) => f.amount, total: "sum" },
    { id: "allocated", header: "Allocated", format: "peso", value: (f) => f.allocated, total: "sum" },
    { id: "obligated", header: "Obligated", format: "peso", value: (f) => f.obligated, total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: (f) => f.disbursed, total: "sum" },
    { id: "remaining", header: "Remaining", format: "peso", value: (f) => f.remaining, total: "sum" },
  ],
  summary: (_items, rows) => [
    { label: "Received", value: sum(rows, (r) => r.amount), format: "peso" },
    { label: "Allocated to PPAs", value: sum(rows, (r) => r.allocated), format: "peso" },
    { label: "Obligated", value: sum(rows, (r) => r.obligated), format: "peso" },
    { label: "Remaining", value: sum(rows, (r) => r.remaining), format: "peso", hint: "Received − obligated" },
  ],
  charts: [
    {
      type: "grouped",
      title: "Received vs obligated vs disbursed",
      wide: true,
      horizontal: true,
      valueFormat: "peso",
      series: [
        { key: "received", name: "Received" },
        { key: "obligated", name: "Obligated" },
        { key: "disbursed", name: "Disbursed" },
      ],
      data: ({ rows }) => rows.map((r) => ({ label: r.name, received: r.amount, obligated: r.obligated, disbursed: r.disbursed })),
    },
  ],
  orientation: "landscape",
  note: "Allocated is the sum of PPA budgets charged to the fund. Remaining = amount received − committed obligations.",
})

export const FINANCE_REPORTS = [
  budgetSummary,
  budgetAllocation,
  budgetUtilization,
  budgetVsActual,
  ppaFinancialStatus,
  collectionsSummary,
  dailyCollections,
  monthlyCollections,
  obligationReport,
  disbursementReport,
  expenseReport,
  fundSourceSummary,
]
