"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, FileClock, FilePlus2 } from "lucide-react"
import type { ServiceRequest } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useLookups, useServiceRequests } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { REQUEST_CHANNELS, REQUEST_STATUSES, SERVICE_TYPES, toOptions } from "@/lib/constants"
import { formalName, formatDateTime, fullName } from "@/lib/format"

const col = createAppColumnHelper<ServiceRequest>()

export function RequestsView() {
  const router = useRouter()
  const load = usePageLoad()
  const requests = useServiceRequests()
  const { residents, users } = useLookups()
  const { open } = useEntityDialogs()
  const { can, user } = useCurrentUser()
  const canWrite = can("write")

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("requestNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Request No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/requests/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Request No." },
          enableHiding: false,
        }),
        col.accessor((r) => formalName(residents.get(r.residentId)), {
          id: "resident",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Resident" />,
          cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Resident" },
        }),
        col.accessor("service", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-44">
              <p className="whitespace-nowrap">{getValue()}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.purpose}</p>
            </div>
          ),
          meta: { label: "Service" },
        }),
        col.accessor("channel", { header: "Channel", cell: ({ getValue }) => <TagBadge>{getValue()}</TagBadge>, meta: { label: "Channel" } }),
        col.accessor("dateRequested", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date Requested" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(getValue())}</span>,
          meta: { label: "Date Requested" },
        }),
        col.accessor((r) => (r.assignedToId ? (users.get(r.assignedToId)?.name ?? "—") : "Unassigned"), {
          id: "assigned",
          header: "Assigned Staff",
          cell: ({ row, getValue }) =>
            row.original.assignedToId ? (
              <span className="flex items-center gap-2 whitespace-nowrap">
                <PersonAvatar name={getValue()} size="xs" /> {getValue()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            ),
          meta: { label: "Assigned Staff" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open request", icon: Eye, onSelect: () => router.push(`/requests/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [residents, users, router],
  )

  const filters: DataTableFilter<ServiceRequest>[] = useMemo(
    () => [
      { id: "status", label: "Status", options: toOptions(REQUEST_STATUSES), getValue: (r) => r.status },
      { id: "service", label: "Service", options: toOptions(SERVICE_TYPES), getValue: (r) => r.service },
      { id: "channel", label: "Channel", options: toOptions(REQUEST_CHANNELS), getValue: (r) => r.channel },
      {
        id: "assigned",
        label: "Assignment",
        options: [
          { label: "Assigned to me", value: "me" },
          { label: "Unassigned", value: "none" },
        ],
        getValue: (r) => (r.assignedToId === user.id ? "me" : !r.assignedToId ? "none" : "other"),
      },
    ],
    [user.id],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Requests"
        description="Centralized queue of document and service requests from residents."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Service Requests" }]}
        actions={
          canWrite && (
            <Button onClick={() => open({ type: "request" })}>
              <FilePlus2 /> New request
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : requests}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search request no., resident, service…",
          getText: (r) => `${r.requestNumber} ${fullName(residents.get(r.residentId))} ${r.service} ${r.purpose}`,
        }}
        filters={filters}
        dateFilter={{ label: "Date requested", getDate: (r) => r.dateRequested }}
        onRowClick={(r) => router.push(`/requests/${r.id}`)}
        initialVisibility={{ channel: false }}
        empty={{
          icon: FileClock,
          title: "No service requests",
          description: "Requests filed by residents — walk-in, online or by phone — appear here.",
          action: canWrite ? (
            <Button size="sm" onClick={() => open({ type: "request" })}>
              New request
            </Button>
          ) : undefined,
        }}
      />
    </div>
  )
}
