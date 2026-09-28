"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, FilePen, Plus } from "lucide-react"
import type { Obligation } from "@/types"
import { Button } from "@/components/ui/button"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useFundSources, useLookups, useObligations } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { BUDGET_CATEGORIES, OBLIGATION_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, formatPesoCompact } from "@/lib/format"

const col = createAppColumnHelper<Obligation>()

export function ObligationsView() {
  const router = useRouter()
  const load = usePageLoad()
  const obligations = useObligations()
  const fundSourceList = useFundSources()
  const { ppas, fundSources } = useLookups()
  const { budget, fiscalYear } = useFiscalYear()
  const ledger = useLedger()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()

  const data = useMemo(() => obligations.filter((o) => ppas.get(o.ppaId)?.budgetId === budget?.id), [obligations, ppas, budget])
  const stats = useMemo(() => {
    const sum = (list: Obligation[]) => list.reduce((s, o) => s + o.amount, 0)
    const review = data.filter((o) => o.status === "For Review")
    const approved = data.filter((o) => o.status === "Approved" || o.status === "Partially Disbursed")
    return {
      review,
      reviewAmount: sum(review),
      committed: sum(data.filter((o) => ["Approved", "Partially Disbursed", "Fully Disbursed"].includes(o.status))),
      undisbursed: approved.reduce((s, o) => s + o.amount - ledger.disbursedForObligation(o.id), 0),
      drafts: data.filter((o) => o.status === "Draft").length,
    }
  }, [data, ledger])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("obligationNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="ObR No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/finance/obligations/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Obligation Number" },
          enableHiding: false,
        }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        col.accessor("payee", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Payee" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-48">
              <p className="font-medium">{getValue()}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            </div>
          ),
          meta: { label: "Payee" },
        }),
        col.accessor((o) => ppas.get(o.ppaId)?.code ?? "", {
          id: "ppa",
          header: "PPA",
          cell: ({ row }) => (
            <span className="text-xs">
              <span className="font-mono">{ppas.get(row.original.ppaId)?.code}</span>
              <span className="block max-w-44 truncate text-muted-foreground">{ppas.get(row.original.ppaId)?.name}</span>
            </span>
          ),
          meta: { label: "PPA" },
        }),
        col.accessor((o) => ppas.get(o.ppaId)?.category ?? "", {
          id: "category",
          header: "Category",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Budget Category" },
        }),
        col.accessor((o) => fundSources.get(o.fundSourceId)?.type ?? "", {
          id: "fund",
          header: "Fund source",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Fund Source" },
        }),
        col.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Amount" },
        }),
        col.accessor((o) => ledger.disbursedForObligation(o.id), {
          id: "disbursed",
          header: "Disbursed",
          cell: ({ getValue }) => <Money value={getValue()} muted />,
          meta: { label: "Disbursed" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/finance/obligations/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [ppas, fundSources, ledger, router],
  )

  const filters: DataTableFilter<Obligation>[] = useMemo(
    () => [
      { id: "status", label: "Status", options: toOptions(OBLIGATION_STATUSES), getValue: (o) => o.status },
      { id: "category", label: "Category", options: toOptions(BUDGET_CATEGORIES), getValue: (o) => ppas.get(o.ppaId)?.category },
      {
        id: "fund",
        label: "Fund source",
        options: fundSourceList.filter((f) => f.fiscalYear === fiscalYear).map((f) => ({ label: f.name, value: f.id })),
        getValue: (o) => o.fundSourceId,
      },
    ],
    [ppas, fundSourceList, fiscalYear],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obligations"
        description="Obligation requests committed against PPAs before disbursement."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Obligations" }]}
        actions={
          <>
            <FiscalYearSelector />
            {can("finance") && budget?.status === "Active" && (
              <Button onClick={() => open({ type: "obligation" })}>
                <Plus /> New obligation
              </Button>
            )}
          </>
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Awaiting approval" value={stats.review.length} hint={`${formatPesoCompact(stats.reviewAmount)} for review`} />
          <StatCard label="Committed (obligated)" value={formatPesoCompact(stats.committed)} hint="Approved obligations" />
          <StatCard label="Undisbursed balance" value={formatPesoCompact(stats.undisbursed)} hint="Approved but not yet paid" />
          <StatCard label="Drafts" value={stats.drafts} hint="Not yet submitted" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : data}
        getRowId={(o) => o.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search ObR no., payee, description…",
          getText: (o) => `${o.obligationNumber} ${o.payee} ${o.description} ${ppas.get(o.ppaId)?.name ?? ""}`,
        }}
        filters={filters}
        dateFilter={{ getDate: (o) => o.date }}
        onRowClick={(o) => router.push(`/finance/obligations/${o.id}`)}
        initialSorting={[{ id: "date", desc: true }]}
        initialVisibility={{ fund: false }}
        empty={{ icon: FilePen, title: `No obligations for FY ${fiscalYear}`, description: "Obligation requests charged to this budget will appear here." }}
      />
    </div>
  )
}
