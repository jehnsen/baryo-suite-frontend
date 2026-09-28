import type { AccessGrant, AccessLevel, ModuleKey, ReportSectionId, Role } from "@/types"

/**
 * Mock access control. Three account types:
 *
 *  Administrator – app configuration (users, access, settings, officials, audit
 *                  log). Sees every secretary/treasurer module as view & print only.
 *  Secretary     – owns the secretary modules (full access).
 *  Treasurer     – owns the treasurer modules (full access) and approves
 *                  budgets, obligations, disbursements and projects.
 *
 * The Administrator can grant the Secretary or Treasurer extra modules at
 * "view" (view & print) or "full" (create, edit, process). Grants only add
 * access; approvals stay with the approving role.
 *
 * When real auth lands, the server returns the same shape (levels + grants).
 */

export type Capability = "write" | "approve" | "admin" | "finance" | "financeApprove" | "governance" | "operations"

/*
 * write           – create/edit Phase 1 records
 * approve         – approve certificates, requests and legislation
 * admin           – users, settings, officials, access grants
 * finance         – prepare budgets, obligations, disbursements, collections
 * financeApprove  – approve budgets, obligations, disbursements and projects
 * governance      – record sessions, minutes, ordinances, resolutions, committees
 * operations      – manage projects, assets and inventory
 */
const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Administrator: ["admin"],
  Secretary: ["write", "approve", "governance", "operations"],
  Treasurer: ["finance", "financeApprove", "operations"],
}

export const SECRETARY_MODULES: ModuleKey[] = [
  "residents",
  "households",
  "certificates",
  "requests",
  "blotter",
  "incidents",
  "announcements",
  "sessions",
  "ordinances",
  "resolutions",
  "committees",
  "minutes",
  "assemblies",
  "projects",
]

export const TREASURER_MODULES: ModuleKey[] = [
  "finance-dashboard",
  "budget",
  "allocations",
  "collections",
  "obligations",
  "disbursements",
  "expenses",
  "assets",
  "inventory",
]

/** Configuration modules only the Administrator uses; never grantable. */
export const ADMIN_ONLY_MODULES: ModuleKey[] = ["users", "audit-logs", "settings"]

/* ------------------------------------------------------------------ reports -- */

/**
 * Report access tags (a report carries its section plus optional extras).
 *  project-financial – project budget/financial progress
 *  public            – summaries open under the full disclosure policy
 */
export type ReportTag = ReportSectionId | "project-financial" | "public"

export const REPORT_SECTION_IDS: ReportSectionId[] = ["residents", "services", "peace-order", "governance", "finance", "projects", "assets"]

export const ROLE_REPORT_TAGS: Record<Role, ReportTag[]> = {
  Administrator: REPORT_SECTION_IDS,
  Secretary: ["residents", "services", "peace-order", "governance", "projects", "public"],
  Treasurer: ["finance", "assets", "project-financial"],
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

const reportModule = (s: ReportSectionId) => `reports-${s}` as const
const isReportModule = (m: ModuleKey) => m === "reports" || m.startsWith("reports-")

/* ------------------------------------------------------------- default levels -- */

const DEFAULT_ACCESS: Record<Role, Partial<Record<ModuleKey, AccessLevel>>> = (() => {
  const levels = (modules: ModuleKey[], level: AccessLevel) => Object.fromEntries(modules.map((m) => [m, level]))
  const reportLevels = (role: Role) =>
    levels(REPORT_SECTION_IDS.filter((s) => REPORT_SECTION_TAGS[s].some((t) => ROLE_REPORT_TAGS[role].includes(t))).map(reportModule), "view")
  return {
    Administrator: {
      ...levels([...SECRETARY_MODULES, ...TREASURER_MODULES], "view"),
      ...levels(["dashboard", "officials", ...ADMIN_ONLY_MODULES], "full"),
      ...reportLevels("Administrator"),
    },
    Secretary: { ...levels(["officials"], "view"), ...levels(["dashboard", ...SECRETARY_MODULES], "full"), ...reportLevels("Secretary") },
    // Projects are visible so the Treasurer can approve them (they commit PPA funds).
    Treasurer: { ...levels(["projects"], "view"), ...levels(["dashboard", ...TREASURER_MODULES], "full"), ...reportLevels("Treasurer") },
  }
})()

/** Work capabilities a "full" grant confers inside that module. Approvals are never granted. */
const GRANT_CAPABILITIES: Partial<Record<ModuleKey, Capability[]>> = {
  residents: ["write"],
  households: ["write"],
  certificates: ["write"],
  requests: ["write"],
  blotter: ["write"],
  incidents: ["write"],
  announcements: ["write"],
  officials: ["admin"],
  sessions: ["governance", "write"],
  ordinances: ["governance", "write"],
  resolutions: ["governance", "write"],
  committees: ["governance", "write"],
  minutes: ["governance", "write"],
  assemblies: ["governance", "write"],
  projects: ["operations"],
  assets: ["operations"],
  inventory: ["operations"],
  "finance-dashboard": ["finance"],
  budget: ["finance"],
  allocations: ["finance"],
  collections: ["finance"],
  obligations: ["finance"],
  disbursements: ["finance"],
  expenses: ["finance"],
}

export const GRANTABLE_ROLES: Exclude<Role, "Administrator">[] = ["Secretary", "Treasurer"]

/** Whether the Administrator may grant this module; report sections only take "view". */
export const isGrantable = (m: ModuleKey) => m !== "dashboard" && m !== "reports" && !ADMIN_ONLY_MODULES.includes(m)
export const grantLevels = (m: ModuleKey): AccessLevel[] => (isReportModule(m) ? ["none", "view"] : ["none", "view", "full"])

/* ------------------------------------------------------------------ checks -- */

export interface AccessContext {
  role: Role
  grants: AccessGrant[]
}

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, full: 2 }
const higher = (a: AccessLevel, b: AccessLevel) => (RANK[a] >= RANK[b] ? a : b)

export const defaultLevel = (role: Role, m: ModuleKey): AccessLevel => DEFAULT_ACCESS[role][m] ?? "none"

export const grantFor = (ctx: AccessContext, m: ModuleKey) => ctx.grants.find((g) => g.role === ctx.role && g.module === m)

/** Effective level: the role default, raised by any grant. The overview is open when any report section is. */
export function accessLevel(ctx: AccessContext, m: ModuleKey): AccessLevel {
  if (m === "reports") return REPORT_SECTION_IDS.some((s) => accessLevel(ctx, reportModule(s)) !== "none") ? "view" : "none"
  return higher(defaultLevel(ctx.role, m), grantFor(ctx, m)?.level ?? "none")
}

/**
 * May the user use `cap` inside module `m`?
 *  - view level: read and print only, except approvers approve what they can see
 *    (the Treasurer approves projects the Secretary runs);
 *  - full level: the role's own capabilities, plus the module's work
 *    capabilities when the access comes from a full grant.
 */
export function allows(ctx: AccessContext, m: ModuleKey, cap: Capability): boolean {
  const level = accessLevel(ctx, m)
  if (level === "none") return false
  const roleCaps = ROLE_CAPABILITIES[ctx.role]
  if (cap === "financeApprove" && roleCaps.includes(cap)) return true
  if (level !== "full") return false
  if (roleCaps.includes(cap)) return true
  return grantFor(ctx, m)?.level === "full" && (GRANT_CAPABILITIES[m] ?? []).includes(cap)
}

/** A report is visible through the role's tags or a grant on its section. */
export const canViewReport = (ctx: AccessContext, section: ReportSectionId, tags: ReportTag[]) =>
  tags.some((t) => ROLE_REPORT_TAGS[ctx.role].includes(t)) || (grantFor(ctx, reportModule(section))?.level ?? "none") !== "none"

/** Assignment scoping (committees/projects of the signed-in official). No account type is scoped today. */
export const SCOPED_TO_ASSIGNMENTS: Role[] = []

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrator: "App configuration: users, access grants, settings, officials and audit log. View & print only on secretary and treasurer modules.",
  Secretary: "Residents, households, certificates, requests, blotter, incidents, announcements, governance and projects.",
  Treasurer: "Budget, allocations, collections, obligations, disbursements, expenses, assets and inventory; approves finance records and projects.",
}

export const LEVEL_LABELS: Record<AccessLevel, string> = { none: "No access", view: "View & print", full: "Full access" }
