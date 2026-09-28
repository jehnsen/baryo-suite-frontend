"use client"

import { useMemo } from "react"
import type { PPA } from "@/types"
import { buildLedger, utilizationStatus, type BudgetMetrics } from "@/lib/finance"
import { useAppStore } from "@/lib/store/app-store"
import { sessionActions } from "@/lib/store/actions"
import { useAllocations, useBudgets, useCurrentUser, useDisbursements, useObligations, usePPAs, useProjects, useSettings } from "./use-data"
import { SCOPED_TO_ASSIGNMENTS } from "@/lib/permissions"

/** Memoized budget ledger (obligated/disbursed/available derived from records). */
export function useLedger() {
  const ppas = usePPAs()
  const allocations = useAllocations()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  return useMemo(() => buildLedger({ ppas, allocations, obligations, disbursements }), [ppas, allocations, obligations, disbursements])
}

/** Fiscal year shared across every finance screen (header selector writes it). */
export function useFiscalYear() {
  const fiscalYear = useAppStore((s) => s.session.fiscalYear)
  const budgets = useBudgets()
  const budget = budgets.find((b) => b.fiscalYear === fiscalYear)
  const fiscalYears = useMemo(() => [...new Set(budgets.map((b) => b.fiscalYear))].sort((a, b) => b - a), [budgets])
  return { fiscalYear, budget, fiscalYears, setFiscalYear: sessionActions.setFiscalYear }
}

/** Utilization status using the configurable thresholds from Settings. */
export function useUtilizationStatus() {
  const { budgetThresholds } = useSettings()
  return (m: Pick<BudgetMetrics, "utilization">) => utilizationStatus(m.utilization, budgetThresholds)
}

/**
 * Kagawads only see PPAs/projects they are responsible for or whose committee
 * they sit on. Other roles see everything.
 */
export function useAssignmentScope() {
  const { role, officialId } = useCurrentUser()
  const committees = useAppStore((s) => s.committees)
  const projects = useProjects()
  const scoped = SCOPED_TO_ASSIGNMENTS.includes(role)
  return useMemo(() => {
    const myCommittees = new Set(
      committees
        .filter((c) => officialId && (c.chairpersonId === officialId || c.viceChairId === officialId || c.memberIds.includes(officialId)))
        .map((c) => c.id),
    )
    const ppaVisible = (p: PPA) => !scoped || p.responsibleOfficialId === officialId || (p.committeeId !== undefined && myCommittees.has(p.committeeId))
    return {
      scoped,
      myCommittees,
      ppaVisible,
      projectVisible: (projectPpa: PPA | undefined, responsibleOfficialId: string) =>
        !scoped || responsibleOfficialId === officialId || (projectPpa ? ppaVisible(projectPpa) : false),
      projects,
    }
  }, [scoped, officialId, committees, projects])
}
