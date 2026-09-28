import type { ModuleKey, ReportSectionId, Role } from "@/types"

/**
 * Mock role-based access. When real auth lands, the server returns the same
 * shape (modules + capabilities) and this file becomes the fallback/default.
 */
const PHASE1_MODULES: ModuleKey[] = [
  "dashboard",
  "residents",
  "households",
  "certificates",
  "requests",
  "blotter",
  "incidents",
  "officials",
  "announcements",
  "users",
  "audit-logs",
  "settings",
]

const FINANCE_MODULES: ModuleKey[] = ["finance-dashboard", "budget", "allocations", "collections", "obligations", "disbursements", "expenses"]
const GOVERNANCE_MODULES: ModuleKey[] = ["sessions", "ordinances", "resolutions", "committees", "minutes", "assemblies"]
const OPERATIONS_MODULES: ModuleKey[] = ["projects", "assets", "inventory"]

const OPERATIONAL_MODULES: Record<Role, ModuleKey[]> = {
  Administrator: [...PHASE1_MODULES, ...FINANCE_MODULES, ...GOVERNANCE_MODULES, ...OPERATIONS_MODULES],
  "Punong Barangay": [
    "dashboard",
    "residents",
    "households",
    "certificates",
    "requests",
    "blotter",
    "incidents",
    "officials",
    "announcements",
    "audit-logs",
    // executive finance overview, approvals and reports
    ...FINANCE_MODULES,
    ...GOVERNANCE_MODULES,
    "projects",
  ],
  Secretary: ["dashboard", "residents", "households", "certificates", "requests", "officials", "announcements", ...GOVERNANCE_MODULES],
  Treasurer: ["dashboard", "certificates", "officials", "announcements", ...FINANCE_MODULES, "assets", "inventory"],
  Kagawad: [
    "dashboard",
    "residents",
    "households",
    "blotter",
    "incidents",
    "officials",
    "announcements",
    "committees",
    "projects",
    "sessions",
    "ordinances",
    "resolutions",
  ],
  Tanod: ["dashboard", "blotter", "incidents"],
  Encoder: ["dashboard", "residents", "households", "certificates", "requests"],
  Viewer: ["dashboard", "officials", "announcements"],
}

/* -------------------------------------------------------------------------- */
/* Reports (Phase 3)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Each report carries access tags (by default its section). A role sees a
 * report when it holds any of the report's tags.
 *
 *  project-financial – project budget/financial progress (Treasurer)
 *  public            – summaries open under the full disclosure policy
 *                      (budget summaries, legislation registers, assemblies)
 */
export type ReportTag = ReportSectionId | "project-financial" | "public"

const ALL_SECTIONS: ReportSectionId[] = ["residents", "services", "peace-order", "governance", "finance", "projects", "assets"]

export const ROLE_REPORT_TAGS: Record<Role, ReportTag[]> = {
  Administrator: ALL_SECTIONS,
  "Punong Barangay": ALL_SECTIONS,
  Secretary: ["residents", "services", "governance", "public"],
  Treasurer: ["finance", "assets", "project-financial"],
  // Committee and project reports; project and committee rows are scoped to the Kagawad's assignments.
  Kagawad: ["governance", "projects", "public"],
  Tanod: ["peace-order"],
  Encoder: ["residents", "services"],
  Viewer: ["public"],
}

/** Tags that can occur in each section (a section is listed when the role holds any of them). */
const REPORT_SECTION_TAGS: Record<ReportSectionId, ReportTag[]> = {
  residents: ["residents"],
  services: ["services"],
  "peace-order": ["peace-order"],
  governance: ["governance", "public"],
  finance: ["finance", "public"],
  projects: ["projects", "project-financial"],
  assets: ["assets"],
}

export const canViewReport = (role: Role, tags: ReportTag[]) => tags.some((t) => ROLE_REPORT_TAGS[role].includes(t))

const reportModules = (role: Role): ModuleKey[] => {
  const sections = ALL_SECTIONS.filter((s) => canViewReport(role, REPORT_SECTION_TAGS[s]))
  return sections.length ? ["reports", ...sections.map((s) => `reports-${s}` as const)] : []
}

export const ROLE_MODULES = Object.fromEntries(
  (Object.keys(OPERATIONAL_MODULES) as Role[]).map((role) => [role, [...OPERATIONAL_MODULES[role], ...reportModules(role)]]),
) as Record<Role, ModuleKey[]>

/**
 * write           – create/edit Phase 1 records
 * approve         – approve certificates, requests and legislation
 * admin           – users, settings, officials
 * finance         – prepare budgets, obligations, disbursements, collections
 * financeApprove  – approve budgets, obligations, disbursements and projects
 * governance      – record sessions, minutes, ordinances, resolutions, committees
 * operations      – manage projects, assets and inventory
 */
export type Capability = "write" | "approve" | "admin" | "finance" | "financeApprove" | "governance" | "operations"

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Administrator: ["write", "approve", "admin", "finance", "financeApprove", "governance", "operations"],
  "Punong Barangay": ["write", "approve", "financeApprove", "governance", "operations"],
  Secretary: ["write", "approve", "governance"],
  Treasurer: ["finance", "operations"],
  Kagawad: ["write", "governance", "operations"],
  Tanod: ["write"],
  Encoder: ["write"],
  Viewer: [],
}

export const canAccess = (role: Role, module: ModuleKey) => ROLE_MODULES[role].includes(module)
export const hasCapability = (role: Role, cap: Capability) => ROLE_CAPABILITIES[role].includes(cap)

/** Kagawads see the committees, PPAs and projects assigned to them rather than everything. */
export const SCOPED_TO_ASSIGNMENTS: Role[] = ["Kagawad"]

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrator: "Full access to every module, users and system settings.",
  "Punong Barangay": "Executive oversight: approves documents, budgets, obligations, disbursements and projects.",
  Secretary: "Residents, certificates and requests; records sessions, minutes and legislation.",
  Treasurer: "Budget, collections, obligations, disbursements, expenses, assets and inventory, with finance and asset reports.",
  Kagawad: "Committee work, assigned PPAs and projects, sessions and legislation.",
  Tanod: "Peace and order: blotter and incident records.",
  Encoder: "Data entry for residents, households and requests.",
  Viewer: "Read-only access to public information.",
}
