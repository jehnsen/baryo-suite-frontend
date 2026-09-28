"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Archive, ArchiveRestore, Eye, FileBadge, FileClock, Pencil } from "lucide-react"
import type { Household, Resident } from "@/types"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { computeAge, formalName, fullName } from "@/lib/format"
import { ResidentBadges } from "./resident-badges"

const col = createAppColumnHelper<Resident>()

interface Handlers {
  households: Map<string, Household>
  onView: (r: Resident) => void
  onEdit: (r: Resident) => void
  onArchive: (r: Resident) => void
  onRestore: (r: Resident) => void
  onIssueCertificate: (r: Resident) => void
  onNewRequest: (r: Resident) => void
  canWrite: boolean
}

export function useResidentColumns(h: Handlers) {
  return useMemo(
    () =>
      col.columns([
        col.accessor("residentNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Resident ID" />,
          cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>,
          meta: { label: "Resident ID", className: "w-36" },
        }),
        col.accessor((r) => `${r.lastName}, ${r.firstName}`, {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => {
            const r = row.original
            return (
              <div className="flex min-w-52 items-center gap-2.5">
                <PersonAvatar name={fullName(r)} src={r.photoUrl} />
                <div className="min-w-0">
                  <Link href={`/residents/${r.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:underline">
                    {formalName(r)}
                  </Link>
                  <ResidentBadges classification={r.classification} />
                </div>
              </div>
            )
          },
          meta: { label: "Name" },
          enableHiding: false,
        }),
        col.accessor("gender", { header: "Gender", meta: { label: "Gender" } }),
        col.accessor((r) => computeAge(r.birthDate), {
          id: "age",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Age" />,
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: "Age" },
        }),
        col.accessor((r) => (r.householdId ? (h.households.get(r.householdId)?.householdNumber ?? "—") : "—"), {
          id: "household",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Household" />,
          cell: ({ row, getValue }) =>
            row.original.householdId ? (
              <Link href={`/households/${row.original.householdId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:underline">
                {getValue()}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            ),
          meta: { label: "Household" },
        }),
        col.accessor((r) => r.address.purok, {
          id: "purok",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Purok" />,
          meta: { label: "Purok" },
        }),
        col.accessor("contactNumber", {
          header: "Contact",
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{getValue() ?? "—"}</span>,
          meta: { label: "Contact Number" },
        }),
        col.accessor((r) => (r.classification.registeredVoter ? "Registered" : "Not Registered"), {
          id: "voter",
          header: "Voter",
          cell: ({ getValue }) => <StatusBadge status={getValue()} showDot={false} />,
          meta: { label: "Voter Status" },
        }),
        col.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
          meta: { label: "Resident Status" },
        }),
        col.display({
          id: "actions",
          cell: ({ row }) => {
            const r = row.original
            const archived = r.status === "Archived"
            return (
              <RowActions
                actions={[
                  { label: "View profile", icon: Eye, onSelect: () => h.onView(r) },
                  { label: "Edit", icon: Pencil, onSelect: () => h.onEdit(r), hidden: !h.canWrite },
                  { label: "Issue certificate", icon: FileBadge, onSelect: () => h.onIssueCertificate(r), hidden: !h.canWrite || r.status !== "Active" },
                  { label: "New request", icon: FileClock, onSelect: () => h.onNewRequest(r), hidden: !h.canWrite || r.status !== "Active" },
                  archived
                    ? { label: "Restore", icon: ArchiveRestore, onSelect: () => h.onRestore(r), hidden: !h.canWrite, separator: true }
                    : { label: "Archive", icon: Archive, onSelect: () => h.onArchive(r), destructive: true, hidden: !h.canWrite, separator: true },
                ]}
              />
            )
          },
          meta: { className: "w-10" },
          enableHiding: false,
          enableSorting: false,
        }),
      ]),
    [h],
  )
}
