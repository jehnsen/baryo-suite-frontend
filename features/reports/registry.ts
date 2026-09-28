import type { ReportSectionId, Role } from "@/types"
import { canViewReport } from "@/lib/permissions"
import type { AnyReport } from "@/lib/reports/types"
import { ASSET_REPORTS } from "./definitions/assets"
import { FINANCE_REPORTS } from "./definitions/finance"
import { GOVERNANCE_REPORTS } from "./definitions/governance"
import { PEACE_ORDER_REPORTS } from "./definitions/peace-order"
import { PROJECT_REPORTS } from "./definitions/projects"
import { RESIDENT_REPORTS } from "./definitions/residents"
import { SERVICE_REPORTS } from "./definitions/services"

/** Every report in the app. Adding a report = adding a definition to one of these lists. */
export const REPORTS: AnyReport[] = [
  ...RESIDENT_REPORTS,
  ...SERVICE_REPORTS,
  ...PEACE_ORDER_REPORTS,
  ...GOVERNANCE_REPORTS,
  ...FINANCE_REPORTS,
  ...PROJECT_REPORTS,
  ...ASSET_REPORTS,
]

const byId = new Map(REPORTS.map((r) => [r.id, r]))

export const findReport = (id: string | null | undefined) => (id ? byId.get(id) : undefined)
export const reportHref = (r: AnyReport) => `/reports/${r.slug}?report=${r.id}`
export const reportAccess = (r: AnyReport) => r.access ?? [r.section]
export const canViewReportAs = (role: Role, r: AnyReport) => canViewReport(role, reportAccess(r))

export const reportsInSection = (section: ReportSectionId, role: Role) => REPORTS.filter((r) => r.section === section && canViewReportAs(role, r))

/** Overview quick links (the commonly requested reports). */
export const QUICK_LINK_IDS = [
  "resident-master",
  "population-summary",
  "household-summary",
  "certificates-issued",
  "blotter-summary",
  "budget-utilization",
  "collections-summary",
  "expense-report",
  "project-status",
  "asset-registry",
]
