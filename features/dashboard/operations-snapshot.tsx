"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, FileClock, FolderKanban, HandCoins, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { StatCard } from "@/components/shared/stat-card"
import { useBudgets, useCollections, useCurrentUser, useDisbursements, useExpenses, useObligations, useProjects, useSettings } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { formatPeso, formatPesoCompact, formatPercent } from "@/lib/format"

/**
 * Phase 2 highlights for the main dashboard. Deliberately small — the full
 * picture lives in the Finance Dashboard.
 */
export function OperationsSnapshot() {
  const { canAccess } = useCurrentUser()
  const budgets = useBudgets()
  const collections = useCollections()
  const expenses = useExpenses()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  const projects = useProjects()
  const ledger = useLedger()
  const { budgetThresholds } = useSettings()
  const showFinance = canAccess("finance-dashboard")
  const showProjects = canAccess("projects")

  const data = useMemo(() => {
    const year = String(new Date().getFullYear())
    const budget = budgets.find((b) => b.status === "Active") ?? budgets.find((b) => b.fiscalYear === Number(year))
    return {
      budget,
      totals: budget ? ledger.forBudget(budget.id) : undefined,
      collections: collections.filter((c) => c.date.startsWith(year) && c.status !== "Cancelled").reduce((s, c) => s + c.amount, 0),
      expenses: expenses.filter((e) => e.date.startsWith(year)).reduce((s, e) => s + e.amount, 0),
      activeProjects: projects.filter((p) => ["Approved", "Procurement", "Ongoing", "Delayed"].includes(p.status)),
      pendingApprovals:
        obligations.filter((o) => o.status === "For Review").length +
        disbursements.filter((d) => d.status === "For Review" || d.status === "For Approval").length +
        budgets.filter((b) => b.status === "For Authorization").length,
    }
  }, [budgets, collections, expenses, obligations, disbursements, projects, ledger])

  if (!showFinance && !showProjects) return null

  return (
    <section aria-label="Finance and operations" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Finance & operations</h2>
          <p className="mt-1 text-xs text-muted-foreground">Resources and projects supporting your community</p>
        </div>
        {showFinance && (
          <Button asChild size="sm" variant="link" className="gap-2">
            <Link href="/finance">
              Finance overview <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {showFinance && data.budget && data.totals && (
          <Card size="sm" className="welcome-panel min-w-0 ring-primary/10 data-[size=sm]:[--card-spacing:--spacing(5)] sm:col-span-2">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-muted-foreground">{data.budget.title}</span>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href="/finance">Finance</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatPesoCompact(data.budget.approvedBudget)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPesoCompact(data.totals.obligated)} obligated · {formatPesoCompact(data.totals.disbursed)} disbursed
                </span>
              </div>
              <UtilizationBar value={data.totals.utilization} thresholds={budgetThresholds} size="md" />
              <p className="text-xs text-muted-foreground">Budget utilization {formatPercent(data.totals.utilization)} of appropriations</p>
            </CardContent>
          </Card>
        )}
        {showFinance && (
          <StatCard
            label="Collections YTD"
            value={formatPesoCompact(data.collections)}
            icon={HandCoins}
            hint={formatPeso(data.collections)}
            href="/finance/collections"
          />
        )}
        {showFinance && (
          <StatCard label="Expenses YTD" value={formatPesoCompact(data.expenses)} icon={Receipt} hint={formatPeso(data.expenses)} href="/finance/expenses" />
        )}
        {showProjects && (
          <StatCard
            label="Active Projects"
            value={data.activeProjects.length}
            icon={FolderKanban}
            hint={`${data.activeProjects.filter((p) => p.status === "Delayed").length} delayed`}
            href="/projects"
          />
        )}
        {showFinance && (
          <StatCard
            emphasis="secondary"
            label="Pending Financial Approvals"
            value={data.pendingApprovals}
            icon={FileClock}
            hint="Obligations, vouchers and budgets"
            href="/finance"
          />
        )}
      </div>
    </section>
  )
}
