"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Mail, Pencil, ShieldOff, UserCheck, UserCog, UserPlus } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useUsers } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ROLES, USER_STATUSES, toOptions } from "@/lib/constants"
import { formatRelative } from "@/lib/format"
import { simulateLatency, userActions } from "@/lib/store/actions"
import { AccessMatrix } from "./access-matrix"

const col = createAppColumnHelper<User>()

export function UsersView() {
  const load = usePageLoad()
  const users = useUsers()
  const { open } = useEntityDialogs()
  const { user: me } = useCurrentUser()
  const [suspending, setSuspending] = useState<User | null>(null)
  const params = useSearchParams()

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
        description="Staff accounts, their roles and the modules each role can use. Sign-in uses demo credentials until authentication is connected."
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          <Button onClick={() => open({ type: "user" })}>
            <UserPlus /> Invite user
          </Button>
        }
      />
      <ContentTabs
        defaultValue={params.get("tab") === "access" ? "access" : "users"}
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
          { value: "access", label: "Access & permissions", content: <AccessMatrix /> },
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
