import type { ReportRun, ReportRunFormat } from "@/types"
import { createRng, pad, timestampDaysAgo } from "./_seed"

/**
 * Printed/exported report history for the Reports overview (Recent and
 * Frequently Used). Each entry is run by a user whose role can see the report.
 */

const rng = createRng(3003)

// [reportId, userIds allowed to run it, weight, criteria options]
const CATALOG: [string, string[], number, string[]][] = [
  ["resident-master", ["usr-003", "usr-001"], 9, ["Status: Active", "Purok: Purok 3 · Status: Active", "Purok: Purok 5 · Status: Active"]],
  ["population-summary", ["usr-003"], 7, ["All puroks", "Purok: Purok 1"]],
  ["senior-citizens", ["usr-003"], 5, ["All puroks", "Purok: Purok 2"]],
  ["registered-voters", ["usr-003"], 3, ["All puroks"]],
  ["household-summary", ["usr-003"], 3, ["All puroks"]],
  ["certificates-issued", ["usr-003"], 8, ["Status: Released · September 2026", "Status: Released · August 2026"]],
  ["certificate-volume", ["usr-003"], 3, ["Fiscal Year 2026"]],
  ["request-processing-time", ["usr-003"], 2, ["September 2026"]],
  ["blotter-summary", ["usr-003"], 6, ["Fiscal Year 2026", "September 2026"]],
  ["hearing-schedule", ["usr-003"], 4, ["September 28 – October 31, 2026"]],
  ["incident-summary", ["usr-003"], 3, ["September 2026"]],
  ["session-attendance", ["usr-003"], 3, ["Fiscal Year 2026"]],
  ["ordinance-register", ["usr-003"], 3, ["All statuses"]],
  ["budget-utilization", ["usr-004"], 7, ["Fiscal Year 2026", "Fiscal Year 2026 · Budget category: Infrastructure"]],
  ["collections-summary", ["usr-004"], 6, ["Fiscal Year 2026", "Fiscal Year 2026 · September 2026"]],
  ["daily-collections", ["usr-004"], 8, ["September 25, 2026", "September 26, 2026", "September 27, 2026"]],
  ["disbursement-report", ["usr-004"], 3, ["Fiscal Year 2026 · Status: Released"]],
  ["expense-report", ["usr-004"], 4, ["Fiscal Year 2026"]],
  ["budget-summary", ["usr-004"], 2, ["Fiscal Year 2026"]],
  ["project-status", ["usr-003"], 4, ["Fiscal Year 2026"]],
  ["delayed-projects", ["usr-003", "usr-001"], 2, ["All projects"]],
  ["asset-registry", ["usr-004"], 3, ["Status: Active"]],
  ["low-stock", ["usr-004"], 3, ["All categories"]],
]

const ROW_COUNTS: Record<string, [number, number]> = {
  "resident-master": [38, 255],
  "daily-collections": [4, 14],
  "certificates-issued": [12, 36],
}

export const reportRuns: ReportRun[] = Array.from({ length: 64 }, (_, i) => {
  const [reportId, userIds, , criteria] = rng.weighted(CATALOG.map((c) => [c, c[2]] as const))
  const days = Math.floor((i / 64) * 45)
  const [min, max] = ROW_COUNTS[reportId] ?? [3, 28]
  return {
    id: `run-${pad(i + 1, 3)}`,
    reportId,
    format: (rng.chance(0.55) ? "print" : "csv") as ReportRunFormat,
    userId: rng.pick(userIds),
    at: timestampDaysAgo(days, rng.int(8, 16), rng.int(0, 59)),
    criteria: rng.pick(criteria),
    rowCount: rng.int(min, max),
  }
})
