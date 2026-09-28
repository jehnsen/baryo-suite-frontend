"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, FileClock } from "lucide-react"
import type { AuditLog } from "@/types"
import { DetailDrawer } from "@/components/shared/detail-drawer"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useAuditLogs, useLookups, useUsers } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ACTION_TONES, MODULE_ICONS, recordHref } from "@/lib/activity"
import { AUDIT_ACTIONS, AUDIT_MODULES, toOptions } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"

const col = createAppColumnHelper<AuditLog>()

export function AuditLogsView() {
  const load = usePageLoad()
  const logs = useAuditLogs()
  const allUsers = useUsers()
  const { users } = useLookups()
  const [viewing, setViewing] = useState<AuditLog | null>(null)

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("timestamp", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(getValue())}</span>,
          meta: { label: "Timestamp" },
        }),
        col.accessor((l) => users.get(l.userId)?.name ?? "System", {
          id: "user",
          header: "User",
          cell: ({ getValue }) => (
            <span className="flex items-center gap-2 whitespace-nowrap">
              <PersonAvatar name={getValue()} size="xs" /> {getValue()}
            </span>
          ),
          meta: { label: "User" },
        }),
        col.accessor("action", {
          header: "Action",
          cell: ({ getValue }) => <StatusBadge status={getValue()} tone={ACTION_TONES[getValue()] ?? "neutral"} showDot={false} />,
          meta: { label: "Action" },
        }),
        col.accessor("module", {
          header: "Module",
          cell: ({ getValue }) => {
            const Icon = MODULE_ICONS[getValue()]
            return (
              <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                <Icon className="size-3.5" /> {getValue()}
              </span>
            )
          },
          meta: { label: "Module" },
        }),
        col.accessor("recordLabel", {
          header: "Record",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-64 font-medium">{getValue()}</span>,
          meta: { label: "Record" },
        }),
        col.accessor("details", {
          header: "Details",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-80 text-muted-foreground">{getValue()}</span>,
          enableSorting: false,
          meta: { label: "Details" },
        }),
      ]),
    [users],
  )

  const filters: DataTableFilter<AuditLog>[] = useMemo(
    () => [
      { id: "user", label: "User", options: allUsers.map((u) => ({ label: u.name, value: u.id })), getValue: (l) => l.userId },
      { id: "module", label: "Module", options: toOptions(AUDIT_MODULES), getValue: (l) => l.module },
      { id: "action", label: "Action", options: toOptions(AUDIT_ACTIONS), getValue: (l) => l.action },
    ],
    [allUsers],
  )

  const href = viewing ? recordHref(viewing.module, viewing.recordId) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Tamper-evident trail of every change made in BaryoSuite."
        breadcrumbs={[{ label: "Administration" }, { label: "Audit Logs" }]}
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : logs}
        getRowId={(l) => l.id}
        status={load.status}
        onRetry={load.retry}
        search={{ placeholder: "Search record or details…", getText: (l) => `${l.recordLabel} ${l.details}` }}
        filters={filters}
        dateFilter={{ getDate: (l) => l.timestamp }}
        onRowClick={setViewing}
        initialSorting={[{ id: "timestamp", desc: true }]}
        pageSize={20}
        empty={{ icon: FileClock, title: "No audit entries", description: "Actions performed by users will be recorded here." }}
      />
      <DetailDrawer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? `${viewing.module} · ${viewing.action}` : ""}
        description={viewing && formatDateTime(viewing.timestamp)}
        meta={viewing && <TagBadge className="font-mono">{viewing.id}</TagBadge>}
      >
        {viewing && (
          <DetailList
            columns={1}
            items={[
              { label: "User", value: `${users.get(viewing.userId)?.name ?? "System"} (${users.get(viewing.userId)?.role ?? "—"})` },
              { label: "Action", value: viewing.action },
              { label: "Module", value: viewing.module },
              {
                label: "Record",
                value: href ? (
                  <Link href={href} className="inline-flex items-center gap-1 hover:underline">
                    {viewing.recordLabel} <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : (
                  viewing.recordLabel
                ),
              },
              { label: "Details", value: viewing.details },
              { label: "IP address", value: <span className="font-mono text-xs">{viewing.ipAddress}</span> },
            ]}
          />
        )}
      </DetailDrawer>
    </div>
  )
}
