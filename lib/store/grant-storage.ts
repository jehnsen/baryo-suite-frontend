import type { AccessGrant } from "@/types"

/* Browser persistence for access grants (kept separate so the store can load it without import cycles). */

const STORAGE_KEY = "baryosuite.access-grants"

export function loadStoredGrants(): AccessGrant[] | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as AccessGrant[]) : undefined
    return Array.isArray(parsed) ? parsed.filter((g) => g && typeof g.module === "string" && (g.level === "view" || g.level === "full")) : undefined
  } catch {
    return undefined
  }
}

export function storeGrants(grants: AccessGrant[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(grants))
  } catch {
    // Private mode or blocked storage: grants still apply for this tab.
  }
}
