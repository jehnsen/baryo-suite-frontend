import type { AccessGrant, AccessLevel, ModuleKey } from "@/types"
import { ALL_NAV_ITEMS } from "@/lib/navigation"
import { LEVEL_LABELS, defaultLevel, isGrantable } from "@/lib/permissions"
import { currentUserId, get, log, newId, now, set } from "./helpers"
import { storeGrants } from "./grant-storage"

/* Module grants from the Administrator to the Secretary/Treasurer. Persisted in the browser until the API exists. */

const moduleTitle = (m: ModuleKey) => {
  const item = ALL_NAV_ITEMS.find((i) => i.module === m)
  return item?.fullTitle ?? item?.title ?? m
}

export const accessActions = {
  /** Set the Secretary's or Treasurer's level for a module; the role's default level clears the grant. */
  setLevel(role: AccessGrant["role"], module: ModuleKey, level: AccessLevel) {
    if (!isGrantable(module)) return
    const previous = get().accessGrants.find((g) => g.role === role && g.module === module)
    const others = get().accessGrants.filter((g) => !(g.role === role && g.module === module))
    const grants =
      level === "none" || level === defaultLevel(role, module)
        ? others
        : [...others, { id: newId("grant"), role, module, level, grantedById: currentUserId(), grantedAt: now() }]
    set((s) => ({ ...s, accessGrants: grants }))
    storeGrants(grants)
    const label = `${role} · ${moduleTitle(module)}`
    if (level === "none" || level === defaultLevel(role, module))
      log("Revoked", "Access", label, `Removed ${previous ? LEVEL_LABELS[previous.level].toLowerCase() : "granted"} access.`)
    else log("Granted", "Access", label, `${LEVEL_LABELS[level]} granted${previous ? ` (was ${LEVEL_LABELS[previous.level].toLowerCase()})` : ""}.`)
  },
}
