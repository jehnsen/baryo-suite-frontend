"use client"

import { useMemo } from "react"
import { differenceInCalendarDays, parseISO } from "date-fns"
import type { Tone } from "@/lib/status"
import { useAllocations, useBudgets, useCollections, useDisbursements, useExpenses, useObligations, useSettings } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { utilizationStatus } from "@/lib/finance"
import { formatPeso, formatPercent } from "@/lib/format"

export interface FinanceAlert {
  id: string
  tone: Tone
  title: string
  description: string
  href: string
}

/** Operational alerts for the selected fiscal year, most urgent first. */
export function useFinanceAlerts(): FinanceAlert[] {
  const { budget, fiscalYear } = useFiscalYear()
  const ledger = useLedger()
  const allocations = useAllocations()
  const budgets = useBudgets()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  const expenses = useExpenses()
  const collections = useCollections()
  const { budgetThresholds } = useSettings()

  return useMemo(() => {
    const alerts: FinanceAlert[] = []
    const today = new Date()
    const age = (iso: string) => differenceInCalendarDays(today, parseISO(iso))

    // Budget categories nearing or over their limit.
    if (budget) {
      allocations
        .filter((a) => a.budgetId === budget.id)
        .map((a) => ({ a, m: ledger.forAllocation(a) }))
        .filter(({ m }) => utilizationStatus(m.utilization, budgetThresholds) !== "Within Budget")
        .sort((x, y) => y.m.utilization - x.m.utilization)
        .forEach(({ a, m }) => {
          const status = utilizationStatus(m.utilization, budgetThresholds)
          alerts.push({
            id: `alloc-${a.id}`,
            tone: status === "Nearing Limit" ? "warning" : "danger",
            title: `${a.category} is ${formatPercent(m.utilization)} utilized`,
            description: `${formatPeso(m.available)} available of ${formatPeso(m.approved)}.`,
            href: "/finance/allocations",
          })
        })
    }

    // Pending approvals.
    const obrPending = obligations.filter((o) => o.status === "For Review")
    const dvPending = disbursements.filter((d) => d.status === "For Review" || d.status === "For Approval")
    const budgetPending = budgets.filter((b) => b.status === "For Review" || b.status === "For Authorization")
    if (obrPending.length)
      alerts.push({
        id: "obr-pending",
        tone: "warning",
        title: `${obrPending.length} obligation${obrPending.length > 1 ? "s" : ""} awaiting approval`,
        description: `${formatPeso(obrPending.reduce((s, o) => s + o.amount, 0))} pending certification and approval.`,
        href: "/finance/obligations",
      })
    if (dvPending.length)
      alerts.push({
        id: "dv-pending",
        tone: "warning",
        title: `${dvPending.length} disbursement voucher${dvPending.length > 1 ? "s" : ""} pending`,
        description: `${formatPeso(dvPending.reduce((s, d) => s + d.amount, 0))} in review or awaiting approval.`,
        href: "/finance/disbursements",
      })
    budgetPending.forEach((b) =>
      alerts.push({
        id: `bud-${b.id}`,
        tone: "info",
        title: `${b.title} is ${b.status.toLowerCase()}`,
        description: "Deliberation by the Committee on Appropriations.",
        href: "/finance/budget",
      }),
    )

    // Incomplete supporting documents.
    const missingDocs = [
      ...obligations.filter((o) => o.status === "For Review" && o.attachments.length === 0),
      ...disbursements.filter((d) => ["For Review", "For Approval", "Approved"].includes(d.status) && d.attachments.length === 0),
    ]
    if (missingDocs.length)
      alerts.push({
        id: "docs",
        tone: "danger",
        title: `${missingDocs.length} record${missingDocs.length > 1 ? "s" : ""} with incomplete supporting documents`,
        description: "Attach the purchase request, quotations and inspection report before approval.",
        href: "/finance/disbursements",
      })

    // Overdue liquidation: cash expenses without receipts after 30 days.
    const unliquidated = expenses.filter((e) => e.attachments.length === 0 && age(e.date) > 30 && e.date.startsWith(String(fiscalYear)))
    if (unliquidated.length)
      alerts.push({
        id: "liq",
        tone: "danger",
        title: `${unliquidated.length} cash payout${unliquidated.length > 1 ? "s" : ""} overdue for liquidation`,
        description: `${formatPeso(unliquidated.reduce((s, e) => s + e.amount, 0))} released over 30 days ago without receipts.`,
        href: "/finance/expenses",
      })

    // Unreconciled collections.
    const undeposited = collections.filter((c) => c.status === "Recorded" && age(c.date) > 2)
    const unreconciled = collections.filter((c) => c.status === "Deposited" && age(c.date) > 15)
    if (undeposited.length || unreconciled.length) {
      alerts.push({
        id: "col",
        tone: "warning",
        title: `${undeposited.length + unreconciled.length} collections not yet reconciled`,
        description: `${undeposited.length} undeposited over 2 days · ${unreconciled.length} deposited but unreconciled over 15 days.`,
        href: "/finance/collections",
      })
    }

    const rank: Record<Tone, number> = { danger: 0, warning: 1, purple: 2, info: 3, success: 4, neutral: 5 }
    return alerts.sort((a, b) => rank[a.tone] - rank[b.tone])
  }, [budget, fiscalYear, allocations, ledger, budgetThresholds, obligations, disbursements, budgets, expenses, collections])
}
