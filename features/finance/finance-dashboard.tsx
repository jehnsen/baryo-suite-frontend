"use client"

import Link from "next/link"
import { useMemo } from "react"
import { format, isSameMonth, parseISO } from "date-fns"
import { Banknote, ChartPie, CircleDollarSign, FileClock, HandCoins, Landmark, PiggyBank, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SimpleBarChart } from "@/components/charts/bar-chart"
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { ErrorState } from "@/components/shared/error-state"
import { ChartSkeleton, StatCardsSkeleton } from "@/components/shared/loading-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { useAllocations, useCollections, useDisbursements, useExpenses, usePPAs, useSettings } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { allocationApproved } from "@/lib/finance"
import { formatPeso, formatPesoCompact, formatPercent } from "@/lib/format"
import { FinanceAlerts } from "./finance-alerts"
import { useFinanceAlerts } from "./use-finance-alerts"

const SHORT: Record<string, string> = {
  "General Administration": "Gen. Admin",
  "Peace and Order": "Peace & Order",
  "Social Services": "Social Svcs",
  "Environmental Programs": "Environment",
  "Youth Development": "Youth (SK)",
  "Community Programs": "Community",
  "Other Services": "Other",
}

export function FinanceDashboard() {
  const load = usePageLoad()
  const { fiscalYear, budget } = useFiscalYear()
  const ledger = useLedger()
  const allocations = useAllocations()
  const ppas = usePPAs()
  const collections = useCollections()
  const expenses = useExpenses()
  const disbursements = useDisbursements()
  const { budgetThresholds } = useSettings()
  const alerts = useFinanceAlerts()

  const data = useMemo(() => {
    if (!budget) return null
    const fy = String(fiscalYear)
    const allocs = allocations.filter((a) => a.budgetId === budget.id)
    const totals = ledger.forBudget(budget.id)
    const fyCollections = collections.filter((c) => c.date.startsWith(fy) && c.status !== "Cancelled")
    const fyExpenses = expenses.filter((e) => e.date.startsWith(fy))
    const pending = disbursements.filter((d) => d.date.startsWith(fy) && !["Released", "Cancelled"].includes(d.status))
    const lastMonth = fiscalYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12
    const months = Array.from({ length: lastMonth }, (_, i) => new Date(fiscalYear, i, 1))
    return {
      totals,
      appropriations: allocs.reduce((s, a) => s + allocationApproved(a), 0),
      collectionsYtd: fyCollections.reduce((s, c) => s + c.amount, 0),
      expensesYtd: fyExpenses.reduce((s, e) => s + e.amount, 0),
      pending,
      byCategory: allocs.map((a) => ({ a, m: ledger.forAllocation(a) })).sort((x, y) => y.m.utilization - x.m.utilization),
      budgetVsActual: allocs.map((a) => {
        const m = ledger.forAllocation(a)
        return { label: SHORT[a.category] ?? a.category, allocation: m.approved, obligated: m.obligated, disbursed: m.disbursed }
      }),
      monthlyCollections: months.map((m) => ({
        label: format(m, "MMM"),
        value: fyCollections.filter((c) => isSameMonth(parseISO(c.date), m)).reduce((s, c) => s + c.amount, 0),
      })),
      monthlyExpenses: months.map((m) => ({
        label: format(m, "MMM"),
        value: fyExpenses.filter((e) => isSameMonth(parseISO(e.date), m)).reduce((s, e) => s + e.amount, 0),
      })),
      byPPA: ppas
        .filter((p) => p.budgetId === budget.id)
        .map((p) => ({ label: p.name.length > 26 ? p.name.slice(0, 24) + "…" : p.name, value: ledger.forPPA(p).disbursed }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    }
  }, [budget, fiscalYear, allocations, ledger, collections, expenses, disbursements, ppas])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Finance Dashboard"
        description={budget ? `${budget.title} · ${budget.status}` : `No budget recorded for FY ${fiscalYear}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Finance" }]}
        actions={<FiscalYearSelector />}
      />

      {load.isError ? (
        <ErrorState onRetry={load.retry} className="py-24" />
      ) : load.isLoading ? (
        <>
          <StatCardsSkeleton count={8} />
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartSkeleton className="lg:col-span-2" />
            <ChartSkeleton />
          </div>
        </>
      ) : !data || load.demoEmpty ? (
        <SectionCard>
          <EmptyState
            icon={PiggyBank}
            title={`No budget for FY ${fiscalYear}`}
            description="Create the annual budget to start monitoring allocations, obligations and disbursements."
            action={
              <Button asChild size="sm">
                <Link href="/finance/budget">Go to Annual Budget</Link>
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <>
          <section aria-label="Key financial figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              emphasis="primary"
              label="Approved Annual Budget"
              value={formatPesoCompact(budget!.approvedBudget)}
              icon={Landmark}
              hint={formatPeso(budget!.approvedBudget)}
              href="/finance/budget"
            />
            <StatCard
              label="Total Appropriations"
              value={formatPesoCompact(data.appropriations)}
              icon={ChartPie}
              hint={`${formatPesoCompact(budget!.approvedBudget - data.appropriations)} unappropriated`}
              href="/finance/allocations"
            />
            <StatCard
              label="Total Obligated"
              value={formatPesoCompact(data.totals.obligated)}
              icon={FileClock}
              hint={`${formatPercent(data.totals.utilization)} of appropriations`}
              href="/finance/obligations"
            />
            <StatCard
              label="Total Disbursed"
              value={formatPesoCompact(data.totals.disbursed)}
              icon={Banknote}
              hint={`${formatPercent(data.totals.disbursementRate)} disbursement rate`}
              href="/finance/disbursements"
            />
            <StatCard
              label="Remaining Budget"
              value={formatPesoCompact(budget!.approvedBudget - data.totals.obligated)}
              icon={CircleDollarSign}
              hint="Approved budget less obligations"
            />
            <StatCard
              label="Collections YTD"
              value={formatPesoCompact(data.collectionsYtd)}
              icon={HandCoins}
              hint={formatPeso(data.collectionsYtd)}
              href="/finance/collections"
            />
            <StatCard
              label="Expenses YTD"
              value={formatPesoCompact(data.expensesYtd)}
              icon={Receipt}
              hint={formatPeso(data.expensesYtd)}
              href="/finance/expenses"
            />
            <StatCard
              emphasis="secondary"
              label="Pending Disbursements"
              value={data.pending.length}
              icon={FileClock}
              hint={`${formatPeso(data.pending.reduce((s, d) => s + d.amount, 0))} awaiting release`}
              href="/finance/disbursements"
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <SectionCard title="Budget vs Actual" description="Allocation, obligations and disbursements per category" className="lg:col-span-2">
              <GroupedBarChart
                data={data.budgetVsActual}
                series={[
                  { key: "allocation", name: "Allocation", color: "var(--chart-1)" },
                  { key: "obligated", name: "Obligated", color: "var(--chart-2)" },
                  { key: "disbursed", name: "Disbursed", color: "var(--chart-3)" },
                ]}
                horizontal
                height={380}
                categoryWidth={96}
                valueFormat="peso"
              />
            </SectionCard>
            <SectionCard
              title="Alerts"
              actions={
                alerts.length > 0 && <StatusBadge status={`${alerts.length} open`} tone={alerts.some((a) => a.tone === "danger") ? "danger" : "warning"} />
              }
            >
              <FinanceAlerts alerts={alerts} limit={7} />
            </SectionCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Monthly Collections" description={`FY ${fiscalYear}, all collection types`}>
              <SimpleBarChart data={data.monthlyCollections} seriesName="Collections" valueFormat="peso" height={230} />
            </SectionCard>
            <SectionCard title="Monthly Expenses" description="Recorded from released disbursements">
              <SimpleBarChart data={data.monthlyExpenses} seriesName="Expenses" valueFormat="peso" height={230} color="var(--chart-2)" />
            </SectionCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Budget Utilization by Category"
              description={`Obligated ÷ allocation · markers at ${budgetThresholds.warning}% and ${budgetThresholds.critical}%`}
              actions={
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href="/finance/allocations">Allocations</Link>
                </Button>
              }
            >
              <ul className="space-y-3">
                {data.byCategory.map(({ a, m }) => (
                  <li key={a.id} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
                    <span className="truncate text-sm">{a.category}</span>
                    <UtilizationBar value={m.utilization} thresholds={budgetThresholds} />
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Spending by Program / Project" description="Top PPAs by amount disbursed">
              {data.byPPA.length ? (
                <SimpleBarChart data={data.byPPA} seriesName="Disbursed" horizontal showValues valueFormat="peso" height={300} categoryWidth={170} />
              ) : (
                <EmptyState compact title="No disbursements yet" />
              )}
            </SectionCard>
          </section>
        </>
      )}
    </div>
  )
}
