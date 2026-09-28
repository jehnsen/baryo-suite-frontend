"use client"

import { Fragment } from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import type { AccessGrant, AccessLevel, ModuleKey, Role } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useCurrentUser, useUsers } from "@/hooks/use-data"
import { useAppStore } from "@/lib/store/app-store"
import { accessActions } from "@/lib/store/access-actions"
import { NAV_GROUPS } from "@/lib/navigation"
import { GRANTABLE_ROLES, LEVEL_LABELS, ROLE_DESCRIPTIONS, accessLevel, defaultLevel, grantLevels, isGrantable } from "@/lib/permissions"
import { formatDate } from "@/lib/format"
import type { Tone } from "@/lib/status"

const LEVEL_TONE: Record<AccessLevel, Tone> = { none: "neutral", view: "info", full: "success" }
const RANK: Record<AccessLevel, number> = { none: 0, view: 1, full: 2 }
const ROLES_SHOWN: Role[] = ["Administrator", ...GRANTABLE_ROLES]

/**
 * Module access per account type. Defaults come from lib/permissions; the
 * Administrator raises the Secretary's or Treasurer's level per module.
 */
export function AccessMatrix() {
  const grants = useAppStore((s) => s.accessGrants)
  const users = useUsers()
  const { canIn } = useCurrentUser()
  const editable = canIn("users", "admin")
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.module !== "dashboard") })).filter((g) => g.items.length > 0)

  const change = (role: AccessGrant["role"], module: ModuleKey, title: string, level: AccessLevel) => {
    accessActions.setLevel(role, module, level)
    toast.success(`${role}: ${LEVEL_LABELS[level].toLowerCase()} · ${title}`, { description: "Takes effect the next time they open the module." })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {ROLES_SHOWN.map((role) => (
          <div key={role} className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <p className="text-sm font-semibold">{role}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Module access"
        description={
          editable
            ? "Grant the Secretary or Treasurer extra modules. View & print is read-only; Full access lets them create, edit and process records. Approvals stay with the approving role."
            : "Only the Administrator can change module access."
        }
        contentClassName="px-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 text-xs">Module</TableHead>
                {ROLES_SHOWN.map((r) => (
                  <TableHead key={r} className="w-48 text-xs">
                    {r}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.label}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={ROLES_SHOWN.length + 1}
                      className="bg-muted/40 py-2 pl-5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {g.label}
                    </TableCell>
                  </TableRow>
                  {g.items.map((item) => (
                    <TableRow key={item.module}>
                      <TableCell className="pl-5">
                        <span className="flex items-center gap-2 font-medium">
                          <item.icon className="size-4 text-muted-foreground" aria-hidden /> {item.title}
                        </span>
                      </TableCell>
                      {ROLES_SHOWN.map((role) => {
                        const base = defaultLevel(role, item.module)
                        const grant = grants.find((x) => x.role === role && x.module === item.module)
                        const level = accessLevel({ role, grants }, item.module)
                        const options = grantLevels(item.module).filter((l) => RANK[l] >= RANK[base])
                        // Nothing to choose (owned, admin-only, or already at the highest grantable level): show a badge.
                        const locked = role === "Administrator" || !isGrantable(item.module) || options.length < 2 || !editable
                        if (locked)
                          return (
                            <TableCell key={role}>
                              <span className="flex items-center gap-1.5">
                                <StatusBadge status={LEVEL_LABELS[level]} tone={LEVEL_TONE[level]} showDot={level !== "none"} />
                                {grant ? (
                                  <span className="text-[11px] text-muted-foreground">granted</span>
                                ) : (
                                  level !== "none" && <Lock className="size-3 text-muted-foreground/60" aria-label="Default for this role" />
                                )}
                              </span>
                            </TableCell>
                          )
                        const grantedBy = grant && users.find((u) => u.id === grant.grantedById)?.name
                        return (
                          <TableCell key={role}>
                            <Select
                              value={level}
                              onValueChange={(v) => change(role as AccessGrant["role"], item.module, item.fullTitle ?? item.title, v as AccessLevel)}
                            >
                              <SelectTrigger size="sm" className="h-8 min-h-8 w-48" aria-label={`${role} access to ${item.title}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {LEVEL_LABELS[l]}
                                    {l === base && base !== "none" ? " (default)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {grant && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Granted {formatDate(grant.grantedAt)}
                                {grantedBy ? ` by ${grantedBy}` : ""}
                              </p>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  )
}
