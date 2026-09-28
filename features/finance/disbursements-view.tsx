"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Banknote, Eye, Plus } from "lucide-react"
import type { Disbursement } from "@/types"
import { Button } from "@/components/ui/button"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useDisbursements, useLookups } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { DISBURSEMENT_METHODS, DISBURSEMENT_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, formatPesoCompact } from "@/lib/format"

const col = createAppColumnHelper<Disbursement>()

export function DisbursementsView() {
  const router = useRouter()
  const load = usePageLoad()
  const disbursements = useDisbursements()
  const { obligations } = useLookups()
  const { budget, fiscalYear } = useFiscalYear()
  const ledger = useLedger()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()

  const data = useMemo(() => disbursements.filter((d) => ledger.ppaOfObligation(d.obligationId)?.budgetId === budget?.id), [disbursements, ledger, budget])
  const stats = useMemo(() => {
    const sum = (l: Disbursement[]) => l.reduce((s, d) => s + d.amount, 0)
    const released = data.filter((d) => d.status === "Released")
    const pending = data.filter((d) => ["For Review", "For Approval", "Approved"].includes(d.status))
    return {
      released: sum(released),
      releasedCount: released.length,
      pending,
      pendingAmount: sum(pending),
      approvedCount: data.filter((d) => d.status === "Approved").length,
    }
  }, [data])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("voucherNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="DV No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/finance/disbursements/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Voucher Number" },
          enableHiding: false,
        }),
        col.accessor("disbursementNumber", {
          header: "Disbursement No.",
          cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>,
          meta: { label: "Disbursement Number" },
        }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        col.accessor("payee", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Payee" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-44">
              <p className="font-medium">{getValue()}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.remarks}</p>
            </div>
          ),
          meta: { label: "Payee" },
        }),
        col.accessor((d) => obligations.get(d.obligationId)?.obligationNumber ?? "", {
          id: "obligation",
          header: "Obligation",
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
          meta: { label: "Related Obligation" },
        }),
        col.accessor((d) => ledger.ppaOfObligation(d.obligationId)?.code ?? "", {
          id: "ppa",
          header: "PPA",
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
          meta: { label: "PPA" },
        }),
        col.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Amount" },
        }),
        col.accessor("paymentMethod", { header: "Method", cell: ({ getValue }) => <TagBadge>{getValue()}</TagBadge>, meta: { label: "Payment Method" } }),
        col.accessor("referenceNumber", {
          header: "Reference",
          cell: ({ getValue }) => <span className="text-xs whitespace-nowrap text-muted-foreground">{getValue() ?? "—"}</span>,
          meta: { label: "Reference Number" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/finance/disbursements/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [obligations, ledger, router],
  )

  const filters: DataTableFilter<Disbursement>[] = useMemo(
    () => [
      { id: "status", label: "Status", options: toOptions(DISBURSEMENT_STATUSES), getValue: (d) => d.status },
      { id: "method", label: "Method", options: toOptions(DISBURSEMENT_METHODS), getValue: (d) => d.paymentMethod },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disbursements"
        description="Disbursement vouchers paid against approved obligations."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Disbursements" }]}
        actions={
          <>
            <FiscalYearSelector />
            {can("finance") && (
              <Button onClick={() => open({ type: "disbursement" })}>
                <Plus /> New voucher
              </Button>
            )}
          </>
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Released" value={formatPesoCompact(stats.released)} hint={`${stats.releasedCount} vouchers`} />
          <StatCard label="Pending" value={stats.pending.length} hint={`${formatPesoCompact(stats.pendingAmount)} in review or approval`} />
          <StatCard label="Approved, not released" value={stats.approvedCount} hint="Ready for payment" />
          <StatCard label="Fiscal year" value={`FY ${fiscalYear}`} hint={budget?.status} />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : data}
        getRowId={(d) => d.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search DV no., payee, reference…",
          getText: (d) => `${d.voucherNumber} ${d.disbursementNumber} ${d.payee} ${d.referenceNumber ?? ""} ${d.remarks ?? ""}`,
        }}
        filters={filters}
        dateFilter={{ getDate: (d) => d.date }}
        onRowClick={(d) => router.push(`/finance/disbursements/${d.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        initialVisibility={{ disbursementNumber: false, obligation: false }}
        empty={{ icon: Banknote, title: `No disbursements for FY ${fiscalYear}` }}
      />
    </div>
  )
}
