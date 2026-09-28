import type { ModuleKey, Role } from "@/types"

/**
 * Mock role-based access. When real auth lands, the server returns the same
 * shape (modules + capabilities) and this file becomes the fallback/default.
 */
const ALL_MODULES: ModuleKey[] = [
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

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  Administrator: ALL_MODULES,
  "Punong Barangay": ["dashboard", "residents", "households", "certificates", "requests", "blotter", "incidents", "officials", "announcements", "audit-logs"],
  Secretary: ["dashboard", "residents", "households", "certificates", "requests", "officials", "announcements"],
  Treasurer: ["dashboard", "certificates", "officials", "announcements"],
  Kagawad: ["dashboard", "residents", "households", "blotter", "incidents", "officials", "announcements"],
  Tanod: ["dashboard", "blotter", "incidents"],
  Encoder: ["dashboard", "residents", "households", "certificates", "requests"],
  Viewer: ["dashboard", "officials", "announcements"],
}

export type Capability = "write" | "approve" | "admin"

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  Administrator: ["write", "approve", "admin"],
  "Punong Barangay": ["write", "approve"],
  Secretary: ["write", "approve"],
  Treasurer: [],
  Kagawad: ["write"],
  Tanod: ["write"],
  Encoder: ["write"],
  Viewer: [],
}

export const canAccess = (role: Role, module: ModuleKey) => ROLE_MODULES[role].includes(module)
export const hasCapability = (role: Role, cap: Capability) => ROLE_CAPABILITIES[role].includes(cap)

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrator: "Full access to every module, users and system settings.",
  "Punong Barangay": "Oversight of all operations; approves documents and cases.",
  Secretary: "Manages residents, households, certificates and service requests.",
  Treasurer: "Limited Phase 1 access: certificate fees and records.",
  Kagawad: "Committee work: residents, blotter and incidents.",
  Tanod: "Peace and order: blotter and incident records.",
  Encoder: "Data entry for residents, households and requests.",
  Viewer: "Read-only access to public information.",
}
