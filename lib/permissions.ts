import type { ModuleKey, Role } from "@/types"

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

const FINANCE_MODULES: ModuleKey[] = [
  "finance-dashboard",
  "budget",
  "allocations",
  "collections",
  "obligations",
  "disbursements",
  "expenses",
  "financial-reports",
]
const GOVERNANCE_MODULES: ModuleKey[] = ["sessions", "ordinances", "resolutions", "committees", "minutes", "assemblies"]
const OPERATIONS_MODULES: ModuleKey[] = ["projects", "assets", "inventory"]

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
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
  Treasurer: "Budget, collections, obligations, disbursements, expenses, reports, assets and inventory.",
  Kagawad: "Committee work, assigned PPAs and projects, sessions and legislation.",
  Tanod: "Peace and order: blotter and incident records.",
  Encoder: "Data entry for residents, households and requests.",
  Viewer: "Read-only access to public information.",
}
