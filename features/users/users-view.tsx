"use client"

import { useMemo, useState } from "react"
import { Check, Mail, Minus, Pencil, ShieldOff, UserCheck, UserCog, UserPlus } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useUsers } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ROLES, USER_STATUSES, toOptions } from "@/lib/constants"
import { formatRelative } from "@/lib/format"
import { ALL_NAV_ITEMS } from "@/lib/navigation"
import { REPORT_SECTIONS } from "@/lib/reports/sections"
import { ROLE_DESCRIPTIONS, ROLE_MODULES, hasCapability } from "@/lib/permissions"
import { simulateLatency, userActions } from "@/lib/store/actions"

const col = createAppColumnHelper<User>()

// Report sections collapse into one "Reports" column (sections per role).
const MODULE_COLUMNS = ALL_NAV_ITEMS.filter((m) => !m.module.startsWith("reports"))
const REPORT_SECTION_COUNT = REPORT_SECTIONS.length

function PermissionsMatrix() {
  return (
    <SectionCard title="Role permissions" description="Module access per role (mock RBAC — enforced in navigation and routes)." contentClassName="px-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card pl-4 text-xs">Role</TableHead>
              {MODULE_COLUMNS.map((m) => (
                <TableHead key={m.module} className="text-center text-xs whitespace-nowrap">
                  {m.title}
                </TableHead>
              ))}
              <TableHead className="text-center text-xs whitespace-nowrap">Report sections</TableHead>
              <TableHead className="text-center text-xs">Approve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell className="sticky left-0 z-10 bg-card pl-4">
                  <p className="font-medium whitespace-nowrap">{role}</p>
                  <p className="max-w-56 text-xs whitespace-normal text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </TableCell>
                {MODULE_COLUMNS.map((m) => (
                  <TableCell key={m.module} className="text-center">
                    {ROLE_MODULES[role].includes(m.module) ? (
                      <Check className="mx-auto size-4 text-[var(--tone-success)]" aria-label="Allowed" />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="No access" />
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                  {REPORT_SECTIONS.filter((s) => ROLE_MODULES[role].includes(s.module)).length} / {REPORT_SECTION_COUNT}
                </TableCell>
                <TableCell className="text-center">
                  {hasCapability(role, "approve") ? (
                    <Check className="mx-auto size-4 text-[var(--tone-success)]" aria-label="Can approve" />
                  ) : (
                    <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Cannot approve" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  )
}

export function UsersView() {
  const load = usePageLoad()
  const users = useUsers()
  const { open } = useEntityDialogs()
  const { user: me } = useCurrentUser()
  const [suspending, setSuspending] = useState<User | null>(null)

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => (
            <div className="flex items-center gap-2.5">
              <PersonAvatar name={row.original.name} />
              <div className="min-w-0">
                <p className="font-medium whitespace-nowrap">
                  {row.original.name} {row.original.id === me.id && <TagBadge className="ml-1">You</TagBadge>}
                </p>
                <p className="text-xs text-muted-foreground">{row.original.email}</p>
              </div>
            </div>
          ),
          meta: { label: "Name" },
          enableHiding: false,
        }),
        col.accessor("role", { header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />, meta: { label: "Role" } }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.accessor((u) => u.lastLogin ?? "", {
          id: "lastLogin",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Last Login" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue() ? formatRelative(getValue()) : "Never"}</span>,
          meta: { label: "Last Login" },
        }),
        col.display({
          id: "actions",
          cell: ({ row }) => {
            const u = row.original
            return (
              <RowActions
                actions={[
                  { label: "Edit user", icon: Pencil, onSelect: () => open({ type: "user", record: u }) },
                  {
                    label: "Resend invite",
                    icon: Mail,
                    onSelect: () => toast.success("Invitation re-sent", { description: u.email }),
                    hidden: u.status !== "Invited",
                  },
                  {
                    label: "Reactivate",
                    icon: UserCheck,
                    onSelect: () => {
                      userActions.update(u.id, { status: "Active" })
                      toast.success("User reactivated", { description: u.email })
                    },
                    hidden: u.status !== "Suspended",
                  },
                  {
                    label: "Suspend",
                    icon: ShieldOff,
                    onSelect: () => setSuspending(u),
                    destructive: true,
                    hidden: u.status === "Suspended" || u.id === me.id,
                    separator: true,
                  },
                ]}
              />
            )
          },
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [open, me.id],
  )

  const filters: DataTableFilter<User>[] = useMemo(
    () => [
      { id: "role", label: "Role", options: toOptions(ROLES), getValue: (u) => u.role },
      { id: "status", label: "Status", options: toOptions(USER_STATUSES), getValue: (u) => u.status },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Staff accounts and their roles. Authentication will be connected in a later phase."
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          <Button onClick={() => open({ type: "user" })}>
            <UserPlus /> Invite user
          </Button>
        }
      />
      <ContentTabs
        tabs={[
          {
            value: "users",
            label: "Users",
            count: users.length,
            content: (
              <DataTable
                columns={columns}
                data={load.demoEmpty ? [] : users}
                getRowId={(u) => u.id}
                status={load.status}
                onRetry={load.retry}
                search={{ placeholder: "Search name or email…", getText: (u) => `${u.name} ${u.email}` }}
                filters={filters}
                exportable={false}
                empty={{ icon: UserCog, title: "No users yet", description: "Invite barangay staff to start using BaryoSuite." }}
              />
            ),
          },
          { value: "roles", label: "Roles & permissions", content: <PermissionsMatrix /> },
        ]}
      />
      <ConfirmDialog
        open={Boolean(suspending)}
        onOpenChange={(o) => !o && setSuspending(null)}
        title="Suspend user?"
        description={`${suspending?.name} will no longer be able to sign in. You can reactivate the account at any time.`}
        confirmLabel="Suspend"
        destructive
        onConfirm={async () => {
          if (!suspending) return
          await simulateLatency(400)
          userActions.update(suspending.id, { status: "Suspended" })
          toast.success("User suspended", { description: suspending.email })
        }}
      />
    </div>
  )
}
