import type { ReportRunFormat } from "@/types"
import { currentUserId, log, newId, now, set } from "./helpers"

/* Reports are derived views; only print/export runs are recorded (and audit-logged, since lists hold personal data). */

export const reportActions = {
  recordRun(input: { reportId: string; title: string; format: ReportRunFormat; criteria: string; rowCount: number }) {
    const run = {
      id: newId("run"),
      reportId: input.reportId,
      format: input.format,
      userId: currentUserId(),
      at: now(),
      criteria: input.criteria,
      rowCount: input.rowCount,
    }
    set((s) => ({ ...s, reportRuns: [run, ...s.reportRuns] }))
    log(
      input.format === "print" ? "Printed" : "Exported",
      "Reports",
      input.title,
      `${input.format === "print" ? "Printed" : "Exported CSV"} · ${input.rowCount} rows · ${input.criteria}`,
      input.reportId,
    )
  },
}
