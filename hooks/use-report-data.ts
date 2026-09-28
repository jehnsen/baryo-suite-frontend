"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store/app-store"
import { buildReportData, type ReportData } from "@/lib/reports/data"
import { useAssignmentScope } from "./use-finance"

/** Report input built from the live store (same records as the operational modules). */
export function useReportData(): ReportData {
  const state = useAppStore((s) => s)
  const scope = useAssignmentScope()
  // Report "now" is fixed per store snapshot so every figure on a page agrees.
  return useMemo(() => buildReportData(state, { now: new Date(), scope }), [state, scope])
}
