"use client"

import { useMemo } from "react"
import type { ModuleKey } from "@/types"
import { useAppStore } from "@/lib/store/app-store"
import { canAccess, hasCapability, type Capability } from "@/lib/permissions"

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
  return { residents, households, officials, users, certificates }
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
  const users = useUsers()
  const user = users.find((u) => u.id === userId) ?? users[0]
  return {
    user,
    role: user.role,
    can: (cap: Capability) => hasCapability(user.role, cap),
    canAccess: (module: ModuleKey) => canAccess(user.role, module),
  }
}
