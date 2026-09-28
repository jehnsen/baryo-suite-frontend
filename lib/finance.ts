import type { BudgetAllocation, Disbursement, Obligation, PPA } from "@/types"
import { COMMITTED_OBLIGATION_STATUSES } from "@/lib/constants"

/**
 * Budget monitoring math. Obligated and disbursed amounts are always derived
 * from obligation/disbursement records — nothing stores a running total.
 *
 *   Available Balance        = Approved Budget − Obligated Amount
 *   Utilization              = Obligated / Approved × 100
 *   Disbursement Utilization = Disbursed / Approved × 100
 */

export interface BudgetMetrics {
  approved: number
  obligated: number
  disbursed: number
  available: number
  utilization: number
  disbursementRate: number
  /** Obligations still in Draft / For Review. */
  pendingObligations: number
  /** Disbursements prepared but not yet released. */
  pendingDisbursements: number
}

export type UtilizationStatus = "Within Budget" | "Nearing Limit" | "Critical" | "Exhausted"

export interface Thresholds {
  warning: number
  critical: number
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

export function metricsFor(approved: number, totals: Omit<BudgetMetrics, "approved" | "available" | "utilization" | "disbursementRate">): BudgetMetrics {
  return {
    approved,
    ...totals,
    available: approved - totals.obligated,
    utilization: pct(totals.obligated, approved),
    disbursementRate: pct(totals.disbursed, approved),
  }
}

export function utilizationStatus(utilization: number, t: Thresholds): UtilizationStatus {
  if (utilization >= 100) return "Exhausted"
  if (utilization >= t.critical) return "Critical"
  if (utilization >= t.warning) return "Nearing Limit"
  return "Within Budget"
}

export const ppaApproved = (p: PPA) => p.revisedBudget ?? p.approvedBudget
export const allocationApproved = (a: BudgetAllocation) => a.revisedAmount ?? a.approvedAmount

const EMPTY = { obligated: 0, disbursed: 0, pendingObligations: 0, pendingDisbursements: 0 }

export interface Ledger {
  forPPA: (ppa: PPA) => BudgetMetrics
  forAllocation: (allocation: BudgetAllocation) => BudgetMetrics
  /** Aggregate over every PPA of a budget (appropriations = sum of allocations). */
  forBudget: (budgetId: string) => BudgetMetrics
  /** Released amount already paid against an obligation. */
  disbursedForObligation: (obligationId: string) => number
  /** PPA an obligation or disbursement is charged to. */
  ppaOfObligation: (obligationId: string) => PPA | undefined
}

export function buildLedger(input: { ppas: PPA[]; allocations: BudgetAllocation[]; obligations: Obligation[]; disbursements: Disbursement[] }): Ledger {
  const ppaById = new Map(input.ppas.map((p) => [p.id, p]))
  const obligationById = new Map(input.obligations.map((o) => [o.id, o]))
  const byPpa = new Map<string, typeof EMPTY>()
  const releasedByObligation = new Map<string, number>()
  const bucket = (ppaId: string) => {
    if (!byPpa.has(ppaId)) byPpa.set(ppaId, { ...EMPTY })
    return byPpa.get(ppaId)!
  }

  input.obligations.forEach((o) => {
    if (COMMITTED_OBLIGATION_STATUSES.includes(o.status)) bucket(o.ppaId).obligated += o.amount
    else if (o.status === "Draft" || o.status === "For Review") bucket(o.ppaId).pendingObligations += o.amount
  })
  input.disbursements.forEach((d) => {
    const o = obligationById.get(d.obligationId)
    if (!o) return
    if (d.status === "Released") {
      bucket(o.ppaId).disbursed += d.amount
      releasedByObligation.set(o.id, (releasedByObligation.get(o.id) ?? 0) + d.amount)
    } else if (d.status !== "Cancelled") bucket(o.ppaId).pendingDisbursements += d.amount
  })

  const sumOver = (ppas: PPA[]) =>
    ppas.reduce(
      (acc, p) => {
        const b = byPpa.get(p.id) ?? EMPTY
        return {
          obligated: acc.obligated + b.obligated,
          disbursed: acc.disbursed + b.disbursed,
          pendingObligations: acc.pendingObligations + b.pendingObligations,
          pendingDisbursements: acc.pendingDisbursements + b.pendingDisbursements,
        }
      },
      { ...EMPTY },
    )

  return {
    forPPA: (ppa) => metricsFor(ppaApproved(ppa), byPpa.get(ppa.id) ?? EMPTY),
    forAllocation: (a) => metricsFor(allocationApproved(a), sumOver(input.ppas.filter((p) => p.budgetId === a.budgetId && p.category === a.category))),
    forBudget: (budgetId) =>
      metricsFor(
        input.allocations.filter((a) => a.budgetId === budgetId).reduce((s, a) => s + allocationApproved(a), 0),
        sumOver(input.ppas.filter((p) => p.budgetId === budgetId)),
      ),
    disbursedForObligation: (id) => releasedByObligation.get(id) ?? 0,
    ppaOfObligation: (id) => ppaById.get(obligationById.get(id)?.ppaId ?? ""),
  }
}
