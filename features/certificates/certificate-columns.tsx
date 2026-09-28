"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Ban, CheckCircle2, Eye, PackageCheck, Pencil, Printer, Send } from "lucide-react"
import type { BarangayOfficial, Certificate, Resident } from "@/types"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions, type RowAction } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate, formalName, officialName } from "@/lib/format"
import { availableTransitions, TRANSITION_LABELS, type CertificateTransition } from "./certificate-workflow"

const col = createAppColumnHelper<Certificate>()

const TRANSITION_ICONS = { submit: Send, approve: CheckCircle2, release: PackageCheck, cancel: Ban } as const

interface Options {
  residents: Map<string, Resident>
  officials: Map<string, BarangayOfficial>
  onView: (c: Certificate) => void
  onEdit: (c: Certificate) => void
  onTransition: (c: Certificate, t: CertificateTransition) => void
  canWrite: boolean
  canApprove: boolean
  /** Hide the resident column (e.g. on a resident's own profile). */
  hideResident?: boolean
}

export function certificateRowActions(c: Certificate, o: Pick<Options, "onView" | "onEdit" | "onTransition" | "canWrite" | "canApprove">): RowAction[] {
  return [
    { label: "View & preview", icon: Eye, onSelect: () => o.onView(c) },
    {
      label: "Print",
      icon: Printer,
      onSelect: () => window.open(`/certificates/${c.id}/print`, "_blank"),
      hidden: c.status !== "Approved" && c.status !== "Released",
    },
    { label: "Edit", icon: Pencil, onSelect: () => o.onEdit(c), hidden: !o.canWrite || !["Draft", "Pending"].includes(c.status) },
    ...availableTransitions(c).map((t) => ({
      label: TRANSITION_LABELS[t],
      icon: TRANSITION_ICONS[t],
      onSelect: () => o.onTransition(c, t),
      destructive: t === "cancel",
      separator: t === "cancel",
      hidden: t === "approve" ? !o.canApprove : !o.canWrite,
    })),
  ]
}

export function useCertificateColumns(o: Options) {
  return useMemo(
    () =>
      col.columns([
        col.accessor("certificateNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Certificate No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/certificates/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Certificate No." },
          enableHiding: false,
        }),
        ...(o.hideResident
          ? []
          : [
              col.accessor((c) => formalName(o.residents.get(c.residentId)), {
                id: "resident",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Resident" />,
                cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
                meta: { label: "Resident" },
              }),
            ]),
        col.accessor("type", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Certificate Type" },
        }),
        col.accessor("purpose", {
          header: "Purpose",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-56 text-muted-foreground">{getValue()}</span>,
          meta: { label: "Purpose" },
        }),
        col.accessor("dateIssued", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date Issued" },
        }),
        col.accessor((c) => officialName(o.officials.get(c.issuedById)), {
          id: "issuedBy",
          header: "Issued By",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Issued By" },
        }),
        col.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
          meta: { label: "Status" },
        }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={certificateRowActions(row.original, o)} />,
          meta: { className: "w-10" },
          enableHiding: false,
          enableSorting: false,
        }),
      ]),
    [o],
  )
}
