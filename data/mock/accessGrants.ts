import type { AccessGrant } from "@/types"

/** Seed grant: the Treasurer can look up certificates (O.R. numbers and fees) without processing them. */
export const accessGrants: AccessGrant[] = [
  { id: "grant-001", role: "Treasurer", module: "certificates", level: "view", grantedById: "usr-001", grantedAt: "2026-09-01T09:15:00+08:00" },
]
