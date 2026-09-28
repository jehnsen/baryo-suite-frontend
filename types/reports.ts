import type { ID } from "./index"

/* Reports (Phase 3). Reports are derived views over existing records — only report runs are stored. */

export type ReportSectionId = "residents" | "services" | "peace-order" | "governance" | "finance" | "projects" | "assets"

export type ReportRunFormat = "print" | "csv"

/** A printed or exported report (drives Recent / Frequently Used on the overview). */
export interface ReportRun {
  id: ID
  reportId: string
  format: ReportRunFormat
  userId: ID
  at: string
  /** Human-readable filter summary at the time of the run. */
  criteria: string
  rowCount: number
}
