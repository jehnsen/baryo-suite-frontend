"use client"

import { useMemo } from "react"
import type { ModuleKey } from "@/types"
import { useAppStore } from "@/lib/store/app-store"
import { usePathname } from "next/navigation"
import { accessLevel, allows, type Capability } from "@/lib/permissions"
import { accessForPath } from "@/lib/navigation"

/* Collection hooks — the component-facing data API. Replace internals with
 * fetchers (TanStack Query, server components) when the backend exists. */

export const useResidents = () => useAppStore((s) => s.residents)
export const useHouseholds = () => useAppStore((s) => s.households)
export const useCertificates = () => useAppStore((s) => s.certificates)
export const useServiceRequests = () => useAppStore((s) => s.serviceRequests)
export const useBlotters = () => useAppStore((s) => s.blotters)
export const useIncidents = () => useAppStore((s) => s.incidents)
export const useOfficials = () => useAppStore((s) => s.officials)
export const useAnnouncements = () => useAppStore((s) => s.announcements)
export const useUsers = () => useAppStore((s) => s.users)
export const useAuditLogs = () => useAppStore((s) => s.auditLogs)
export const useSettings = () => useAppStore((s) => s.settings)
// Phase 2
export const useBudgets = () => useAppStore((s) => s.budgets)
export const useAllocations = () => useAppStore((s) => s.allocations)
export const useFundSources = () => useAppStore((s) => s.fundSources)
export const usePPAs = () => useAppStore((s) => s.ppas)
export const useCollections = () => useAppStore((s) => s.collections)
export const useObligations = () => useAppStore((s) => s.obligations)
export const useDisbursements = () => useAppStore((s) => s.disbursements)
export const useExpenses = () => useAppStore((s) => s.expenses)
export const useSessions = () => useAppStore((s) => s.sessions)
export const useMinutes = () => useAppStore((s) => s.minutes)
export const useOrdinances = () => useAppStore((s) => s.ordinances)
export const useResolutions = () => useAppStore((s) => s.resolutions)
export const useCommittees = () => useAppStore((s) => s.committees)
export const useAssemblies = () => useAppStore((s) => s.assemblies)
export const useProjects = () => useAppStore((s) => s.projects)
export const useAssets = () => useAppStore((s) => s.assets)
export const useInventoryItems = () => useAppStore((s) => s.inventoryItems)
export const useInventoryTransactions = () => useAppStore((s) => s.inventoryTransactions)
// Phase 3
export const useReportRuns = () => useAppStore((s) => s.reportRuns)

function useIndex<T extends { id: string }>(items: T[]) {
  return useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
}

/** Id → record maps for rendering relations in tables and detail views. */
export function useLookups() {
  const residents = useIndex(useResidents())
  const households = useIndex(useHouseholds())
  const officials = useIndex(useOfficials())
  const users = useIndex(useUsers())
  const certificates = useIndex(useCertificates())
  const ppas = useIndex(usePPAs())
  const fundSources = useIndex(useFundSources())
  const obligations = useIndex(useObligations())
  const disbursements = useIndex(useDisbursements())
  const committees = useIndex(useCommittees())
  const sessions = useIndex(useSessions())
  const projects = useIndex(useProjects())
  const budgets = useIndex(useBudgets())
  return { residents, households, officials, users, certificates, ppas, fundSources, obligations, disbursements, committees, sessions, projects, budgets }
}

export function useHouseholdMembers(householdId?: string) {
  const residents = useResidents()
  return useMemo(() => {
    if (!householdId) return []
    const order = ["Head", "Spouse", "Son", "Daughter", "Parent", "Sibling", "Grandchild", "Relative", "Other"]
    return residents
      .filter((r) => r.householdId === householdId && r.status !== "Archived")
      .sort((a, b) => order.indexOf(a.relationshipToHead ?? "Other") - order.indexOf(b.relationshipToHead ?? "Other") || a.birthDate.localeCompare(b.birthDate))
  }, [residents, householdId])
}

export function useCurrentUser() {
  const userId = useAppStore((s) => s.session.currentUserId)
  const grants = useAppStore((s) => s.accessGrants)
  const users = useUsers()
  const pathname = usePathname()
  // Inside the app shell SessionGate guarantees a signed-in user; users[0] only covers render paths outside it.
  const user = users.find((u) => u.id === userId) ?? users[0]
  const ctx = { role: user.role, grants }
  const routeModules = accessForPath(pathname)?.modules ?? []
  return {
    user,
    role: user.role,
    /** Official record linked to the signed-in user (for "assigned to me" scoping). */
    officialId: user.officialId,
    /** none · view (view & print) · full, including the Administrator's grants. */
    accessLevel: (module: ModuleKey) => accessLevel(ctx, module),
    canAccess: (module: ModuleKey) => accessLevel(ctx, module) !== "none",
    /** Capability inside the current page's module (view-level pages allow no actions). */
    can: (cap: Capability) => routeModules.some((m) => allows(ctx, m, cap)),
    /** Capability inside a specific module (header, dashboard and other cross-module UI). */
    canIn: (module: ModuleKey, cap: Capability) => allows(ctx, module, cap),
    accessContext: ctx,
  }
}
