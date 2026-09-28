import type { AppState } from "@/lib/store/app-store"
import type { Resident } from "@/types"
import { buildLedger, type Ledger } from "@/lib/finance"
import { buildStockLevels, type StockLevel } from "@/lib/inventory"
import { toISODate } from "@/lib/format"
import type { AssignmentScope } from "@/lib/scope"

/**
 * Everything a report definition can read: the same store collections the
 * operational modules use, plus shared derived structures (finance ledger,
 * stock levels, id lookups). Reports never keep their own copies of records.
 */
export type ReportSource = Omit<AppState, "session" | "auditLogs" | "reportRuns" | "accessGrants">

const index = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]))

export function buildReportData(source: ReportSource, opts: { now: Date; scope: AssignmentScope }) {
  const members = new Map<string, Resident[]>()
  source.residents.forEach((r) => {
    if (r.householdId && r.status === "Active") members.set(r.householdId, [...(members.get(r.householdId) ?? []), r])
  })
  const stockLevels = buildStockLevels(source.inventoryItems, source.inventoryTransactions)
  return {
    ...source,
    now: opts.now,
    today: toISODate(opts.now),
    scope: opts.scope,
    ledger: buildLedger(source) as Ledger,
    stockLevels,
    stock: new Map<string, StockLevel>(stockLevels.map((s) => [s.id, s])),
    /** Active residents per household. */
    members,
    fiscalYears: [...new Set(source.budgets.map((b) => b.fiscalYear))].sort((a, b) => b - a),
    by: {
      resident: index(source.residents),
      household: index(source.households),
      official: index(source.officials),
      user: index(source.users),
      ppa: index(source.ppas),
      fundSource: index(source.fundSources),
      committee: index(source.committees),
      session: index(source.sessions),
      budget: index(source.budgets),
      obligation: index(source.obligations),
      disbursement: index(source.disbursements),
      project: index(source.projects),
      inventoryItem: index(source.inventoryItems),
    },
  }
}

export type ReportData = ReturnType<typeof buildReportData>
