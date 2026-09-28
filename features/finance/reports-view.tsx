"use client"

import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart"
import { SimpleBarChart } from "@/components/charts/bar-chart"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DateRangeFilter, isWithinRange, type DateRangeValue } from "@/components/shared/date-range-filter"
import { FacetedFilter } from "@/components/shared/filter-bar"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { LoadState } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { BreakdownTable, type BreakdownRow } from "@/components/tables/breakdown-table"
import {
  useAllocations,
  useCollections,
  useCurrentUser,
  useDisbursements,
  useExpenses,
  useFundSources,
  useObligations,
  usePPAs,
  useSettings,
} from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { BUDGET_CATEGORIES, COLLECTION_TYPES, DISBURSEMENT_STATUSES, OBLIGATION_STATUSES, toOptions } from "@/lib/constants"
import { buildLedger } from "@/lib/finance"
import { formatDate, formatDateTime } from "@/lib/format"
import { PPATable } from "./ppa-table"

interface Filters {
  categories: string[]
  funds: string[]
  ppaIds: string[]
  range: DateRangeValue
}

const EMPTY: Filters = { categories: [], funds: [], ppaIds: [], range: {} }

const sumBy = <T,>(list: T[], key: (t: T) => string, amount: (t: T) => number, label: (k: string) => string = (k) => k): BreakdownRow[] => {
  const map = new Map<string, { count: number; amount: number }>()
  list.forEach((t) => {
    const k = key(t)
    const cur = map.get(k) ?? { count: 0, amount: 0 }
    map.set(k, { count: cur.count + 1, amount: cur.amount + amount(t) })
  })
  return [...map.entries()].map(([k, v]) => ({ id: k, label: label(k), ...v }))
}

export function ReportsView() {
  const load = usePageLoad()
  const { budget, fiscalYear } = useFiscalYear()
  const allPpas = usePPAs()
  const allocations = useAllocations()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  const expenses = useExpenses()
  const collections = useCollections()
  const fundSources = useFundSources()
  const settings = useSettings()
  const { user } = useCurrentUser()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [tab, setTab] = useState("budget")

  const f = useMemo(() => {
    const fy = String(fiscalYear)
    const inRange = (d: string) => isWithinRange(d, filters.range)
    const ppas = allPpas.filter(
      (p) =>
        p.budgetId === budget?.id &&
        (!filters.categories.length || filters.categories.includes(p.category)) &&
        (!filters.funds.length || filters.funds.includes(p.fundSourceId)) &&
        (!filters.ppaIds.length || filters.ppaIds.includes(p.id)),
    )
    const ppaIds = new Set(ppas.map((p) => p.id))
    const obl = obligations.filter((o) => ppaIds.has(o.ppaId) && inRange(o.date))
    const oblIds = new Set(obligations.filter((o) => ppaIds.has(o.ppaId)).map((o) => o.id))
    const dv = disbursements.filter((d) => oblIds.has(d.obligationId) && inRange(d.date))
    const exp = expenses.filter((e) => e.date.startsWith(fy) && e.ppaId && ppaIds.has(e.ppaId) && inRange(e.date))
    const col = collections.filter((c) => c.date.startsWith(fy) && c.status !== "Cancelled" && inRange(c.date))
    const ledger = buildLedger({ ppas, allocations, obligations: obl, disbursements: dv })
    const allocs = allocations.filter((a) => a.budgetId === budget?.id && (!filters.categories.length || filters.categories.includes(a.category)))
    return { ppas, obl, dv, exp, col, ledger, allocs }
  }, [fiscalYear, filters, allPpas, budget, obligations, disbursements, expenses, collections, allocations])

  const active = filters.categories.length + filters.funds.length + filters.ppaIds.length + (filters.range.from ? 1 : 0)
  const filterSummary = [
    filters.categories.length ? `Category: ${filters.categories.join(", ")}` : null,
    filters.funds.length ? `Fund: ${filters.funds.map((id) => fundSources.find((x) => x.id === id)?.name).join(", ")}` : null,
    filters.ppaIds.length ? `PPA: ${filters.ppaIds.map((id) => allPpas.find((p) => p.id === id)?.code).join(", ")}` : null,
    filters.range.from ? `Period: ${formatDate(filters.range.from)} – ${formatDate(filters.range.to)}` : null,
  ].filter(Boolean)

  const REPORTS: Record<string, string> = {
    budget: "Budget Summary",
    utilization: "Budget Utilization",
    collections: "Collections Summary",
    expenses: "Expense Summary",
    obligations: "Obligation Summary",
    disbursements: "Disbursement Summary",
    ppa: "PPA Financial Status",
  }

  const exportPlaceholder = (kind: string) =>
    toast.info(`${kind} export queued`, { description: `${REPORTS[tab]} · FY ${fiscalYear} will be generated once the reporting service is connected.` })

  const budgetRows = f.allocs.map((a) => {
    const ppasInCat = f.ppas.filter((p) => p.category === a.category)
    const totals = ppasInCat
      .map((p) => f.ledger.forPPA(p))
      .reduce((s, m) => ({ obligated: s.obligated + m.obligated, disbursed: s.disbursed + m.disbursed }), { obligated: 0, disbursed: 0 })
    const approved = a.revisedAmount ?? a.approvedAmount
    return {
      category: a.category,
      approved,
      ...totals,
      available: approved - totals.obligated,
      utilization: approved ? (totals.obligated / approved) * 100 : 0,
    }
  })
  const budgetTotals = budgetRows.reduce(
    (s, r) => ({
      approved: s.approved + r.approved,
      obligated: s.obligated + r.obligated,
      disbursed: s.disbursed + r.disbursed,
      available: s.available + r.available,
    }),
    { approved: 0, obligated: 0, disbursed: 0, available: 0 },
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSpreadsheet}
        className="no-print"
        title="Financial Reports"
        description="Summary reports for the Sangguniang Barangay, COA and the barangay assembly."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Financial Reports" }]}
        actions={
          <>
            <FiscalYearSelector />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Download /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportPlaceholder("PDF")}>
                  <FileText /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportPlaceholder("Excel")}>
                  <FileSpreadsheet /> Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportPlaceholder("CSV")}>
                  <FileText /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <DateRangeFilter label="Period" value={filters.range} onChange={(range) => setFilters((x) => ({ ...x, range }))} />
        <FacetedFilter
          label="Category"
          options={toOptions(BUDGET_CATEGORIES)}
          selected={filters.categories}
          onChange={(categories) => setFilters((x) => ({ ...x, categories }))}
        />
        <FacetedFilter
          label="Fund source"
          options={fundSources.filter((x) => x.fiscalYear === fiscalYear).map((x) => ({ label: x.name, value: x.id }))}
          selected={filters.funds}
          onChange={(funds) => setFilters((x) => ({ ...x, funds }))}
        />
        <FacetedFilter
          label="PPA"
          options={allPpas.filter((p) => p.budgetId === budget?.id).map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id }))}
          selected={filters.ppaIds}
          onChange={(ppaIds) => setFilters((x) => ({ ...x, ppaIds }))}
        />
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY)}>
            Reset
          </Button>
        )}
      </div>

      <LoadState load={load}>
        {/* Report letterhead — visible on screen and in print */}
        <div className="rounded-xl border bg-card p-4 print:border-0 print:p-0">
          <p className="text-xs text-muted-foreground">
            Barangay {settings.barangayName}, {settings.municipality}, {settings.province}
          </p>
          <h2 className="text-lg font-semibold">
            {REPORTS[tab]} · FY {fiscalYear}
          </h2>
          <p className="text-xs text-muted-foreground">
            {filterSummary.length ? filterSummary.join(" · ") : "All categories, fund sources and PPAs"} · Generated {formatDateTime(new Date())} by {user.name}
          </p>
        </div>

        <ContentTabs
          value={tab}
          onValueChange={setTab}
          className="[&_[data-slot=tabs-list]]:print:hidden"
          tabs={[
            {
              value: "budget",
              label: "Budget Summary",
              content: (
                <SectionCard contentClassName="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-4 text-xs">Category</TableHead>
                        <TableHead className="text-right text-xs">Allocation</TableHead>
                        <TableHead className="text-right text-xs">Obligated</TableHead>
                        <TableHead className="text-right text-xs">Disbursed</TableHead>
                        <TableHead className="text-right text-xs">Available</TableHead>
                        <TableHead className="pr-4 text-xs">Utilization</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetRows.map((r) => (
                        <TableRow key={r.category}>
                          <TableCell className="pl-4 font-medium">{r.category}</TableCell>
                          <TableCell className="text-right">
                            <Money value={r.approved} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Money value={r.obligated} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Money value={r.disbursed} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Money value={r.available} />
                          </TableCell>
                          <TableCell className="pr-4">
                            <UtilizationBar value={r.utilization} thresholds={settings.budgetThresholds} className="w-36" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="pl-4 font-semibold">Total</TableCell>
                        <TableCell className="text-right">
                          <Money value={budgetTotals.approved} className="font-semibold" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={budgetTotals.obligated} className="font-semibold" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={budgetTotals.disbursed} className="font-semibold" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={budgetTotals.available} className="font-semibold" />
                        </TableCell>
                        <TableCell className="pr-4">
                          <UtilizationBar
                            value={budgetTotals.approved ? (budgetTotals.obligated / budgetTotals.approved) * 100 : 0}
                            tone="info"
                            className="w-36"
                          />
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </SectionCard>
              ),
            },
            {
              value: "utilization",
              label: "Budget Utilization",
              content: (
                <SectionCard title="Allocation vs obligations vs disbursements">
                  <GroupedBarChart
                    data={budgetRows.map((r) => ({ label: r.category, allocation: r.approved, obligated: r.obligated, disbursed: r.disbursed }))}
                    series={[
                      { key: "allocation", name: "Allocation", color: "var(--chart-1)" },
                      { key: "obligated", name: "Obligated", color: "var(--chart-2)" },
                      { key: "disbursed", name: "Disbursed", color: "var(--chart-3)" },
                    ]}
                    horizontal
                    height={Math.max(220, budgetRows.length * 42)}
                    categoryWidth={150}
                    valueFormat="peso"
                  />
                </SectionCard>
              ),
            },
            {
              value: "collections",
              label: "Collections Summary",
              content: (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Collections are filtered by period only (category, fund and PPA filters do not apply to revenue).
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <BreakdownTable
                      rows={sumBy(
                        f.col,
                        (c) => c.type,
                        (c) => c.amount,
                      ).sort((a, b) => COLLECTION_TYPES.indexOf(a.id as never) - COLLECTION_TYPES.indexOf(b.id as never))}
                      labelHeader="Collection type"
                      countLabel="Receipts"
                    />
                    <SectionCard title="By month">
                      <SimpleBarChart
                        data={sumBy(
                          f.col,
                          (c) => c.date.slice(0, 7),
                          (c) => c.amount,
                        )
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((r) => ({ label: format(parseISO(`${r.id}-01`), "MMM"), value: r.amount }))}
                        seriesName="Collections"
                        valueFormat="peso"
                        height={240}
                      />
                    </SectionCard>
                  </div>
                </div>
              ),
            },
            {
              value: "expenses",
              label: "Expense Summary",
              content: (
                <div className="grid gap-4 lg:grid-cols-2">
                  <BreakdownTable
                    rows={sumBy(
                      f.exp,
                      (e) => e.category,
                      (e) => e.amount,
                    )}
                    labelHeader="Category"
                  />
                  <BreakdownTable
                    rows={sumBy(
                      f.exp,
                      (e) => e.date.slice(0, 7),
                      (e) => e.amount,
                      (k) => format(parseISO(`${k}-01`), "MMMM yyyy"),
                    ).sort((a, b) => a.id.localeCompare(b.id))}
                    labelHeader="Month"
                  />
                </div>
              ),
            },
            {
              value: "obligations",
              label: "Obligation Summary",
              content: (
                <div className="grid gap-4 lg:grid-cols-2">
                  <BreakdownTable
                    rows={sumBy(
                      f.obl,
                      (o) => o.status,
                      (o) => o.amount,
                    ).sort((a, b) => OBLIGATION_STATUSES.indexOf(a.id as never) - OBLIGATION_STATUSES.indexOf(b.id as never))}
                    labelHeader="Status"
                    countLabel="Obligations"
                  />
                  <BreakdownTable
                    rows={sumBy(
                      f.obl.filter((o) => o.status !== "Cancelled" && o.status !== "Draft"),
                      (o) => allPpas.find((p) => p.id === o.ppaId)?.category ?? "—",
                      (o) => o.amount,
                    )}
                    labelHeader="Category"
                    countLabel="Obligations"
                  />
                </div>
              ),
            },
            {
              value: "disbursements",
              label: "Disbursement Summary",
              content: (
                <div className="grid gap-4 lg:grid-cols-2">
                  <BreakdownTable
                    rows={sumBy(
                      f.dv,
                      (d) => d.status,
                      (d) => d.amount,
                    ).sort((a, b) => DISBURSEMENT_STATUSES.indexOf(a.id as never) - DISBURSEMENT_STATUSES.indexOf(b.id as never))}
                    labelHeader="Status"
                    countLabel="Vouchers"
                  />
                  <BreakdownTable
                    rows={sumBy(
                      f.dv.filter((d) => d.status === "Released"),
                      (d) => d.paymentMethod,
                      (d) => d.amount,
                    )}
                    labelHeader="Payment method (released)"
                    countLabel="Vouchers"
                  />
                </div>
              ),
            },
            { value: "ppa", label: "PPA Financial Status", content: <PPATable ppas={f.ppas} pageSize={20} /> },
          ]}
        />
      </LoadState>
    </div>
  )
}
