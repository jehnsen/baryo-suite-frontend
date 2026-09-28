"use client"

import Link from "next/link"
import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { Receipt } from "lucide-react"
import type { Expense } from "@/types"
import { SimpleBarChart } from "@/components/charts/bar-chart"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { ContentTabs } from "@/components/shared/content-tabs"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { BreakdownTable, type BreakdownRow } from "@/components/tables/breakdown-table"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useCurrentUser, useExpenses, useFundSources, useLookups } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { BUDGET_CATEGORIES, toOptions } from "@/lib/constants"
import { formatDate, formatPeso, formatPesoCompact } from "@/lib/format"
import { expenseActions } from "@/lib/store/finance-actions"

const col = createAppColumnHelper<Expense>()

function groupBy(list: Expense[], key: (e: Expense) => string, label: (k: string) => string, sublabel?: (k: string) => string | undefined): BreakdownRow[] {
  const map = new Map<string, Expense[]>()
  list.forEach((e) => map.set(key(e), [...(map.get(key(e)) ?? []), e]))
  return [...map.entries()].map(([k, items]) => ({
    id: k,
    label: label(k),
    sublabel: sublabel?.(k),
    count: items.length,
    amount: items.reduce((s, e) => s + e.amount, 0),
  }))
}

export function ExpensesView() {
  const load = usePageLoad()
  const expenses = useExpenses()
  const fundSourceList = useFundSources()
  const { ppas, fundSources, disbursements } = useLookups()
  const { fiscalYear } = useFiscalYear()
  const { can } = useCurrentUser()
  const data = useMemo(() => (load.demoEmpty ? [] : expenses.filter((e) => e.date.startsWith(String(fiscalYear)))), [expenses, fiscalYear, load.demoEmpty])
  const total = data.reduce((s, e) => s + e.amount, 0)
  const unliquidated = data.filter((e) => e.attachments.length === 0)

  const views = useMemo(() => {
    const monthly = groupBy(
      data,
      (e) => e.date.slice(0, 7),
      (k) => format(parseISO(`${k}-01`), "MMMM yyyy"),
    ).sort((a, b) => a.id.localeCompare(b.id))
    return {
      monthly,
      byCategory: groupBy(
        data,
        (e) => e.category,
        (k) => k,
      ),
      byPPA: groupBy(
        data,
        (e) => e.ppaId ?? "none",
        (k) => ppas.get(k)?.name ?? "Unassigned",
        (k) => ppas.get(k)?.code,
      ),
      byFund: groupBy(
        data,
        (e) => e.fundSourceId,
        (k) => fundSources.get(k)?.name ?? "—",
        (k) => fundSources.get(k)?.type,
      ),
    }
  }, [data, ppas, fundSources])

  const largest = [...views.byCategory].sort((a, b) => b.amount - a.amount)[0]

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("expenseNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Expense No." />,
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Expense Number" },
          enableHiding: false,
        }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        col.accessor("category", {
          header: "Category",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Category" },
        }),
        col.accessor((e) => ppas.get(e.ppaId ?? "")?.code ?? "", {
          id: "ppa",
          header: "PPA",
          cell: ({ row, getValue }) =>
            row.original.ppaId ? (
              <Link href={`/ppas/${row.original.ppaId}`} className="font-mono text-xs hover:underline">
                {getValue()}
              </Link>
            ) : (
              "—"
            ),
          meta: { label: "PPA" },
        }),
        col.accessor("payee", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Payee" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-44">
              <p className="font-medium">{getValue()}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            </div>
          ),
          meta: { label: "Payee" },
        }),
        col.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Amount" },
        }),
        col.accessor((e) => fundSources.get(e.fundSourceId)?.type ?? "", {
          id: "fund",
          header: "Fund source",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Fund Source" },
        }),
        col.accessor("reference", {
          header: "Reference",
          cell: ({ row, getValue }) =>
            row.original.disbursementId ? (
              <Link href={`/finance/disbursements/${row.original.disbursementId}`} className="text-xs whitespace-nowrap hover:underline">
                {getValue() || disbursements.get(row.original.disbursementId)?.voucherNumber}
              </Link>
            ) : (
              <span className="text-xs">{getValue()}</span>
            ),
          meta: { label: "Reference" },
        }),
        col.accessor((e) => (e.attachments.length ? "Liquidated" : "Unliquidated"), {
          id: "receipts",
          header: "Receipts",
          cell: ({ getValue }) => <StatusBadge status={getValue()} tone={getValue() === "Liquidated" ? "success" : "warning"} />,
          meta: { label: "Attachments" },
        }),
      ]),
    [ppas, fundSources, disbursements],
  )

  const filters: DataTableFilter<Expense>[] = useMemo(
    () => [
      { id: "category", label: "Category", options: toOptions(BUDGET_CATEGORIES), getValue: (e) => e.category },
      {
        id: "fund",
        label: "Fund source",
        options: fundSourceList.filter((f) => f.fiscalYear === fiscalYear).map((f) => ({ label: f.name, value: f.id })),
        getValue: (e) => e.fundSourceId,
      },
      {
        id: "receipts",
        label: "Receipts",
        options: toOptions(["Liquidated", "Unliquidated"]),
        getValue: (e) => (e.attachments.length ? "Liquidated" : "Unliquidated"),
      },
    ],
    [fundSourceList, fiscalYear],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Recorded automatically when disbursements are released. Attach official receipts to liquidate."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Expenses" }]}
        actions={<FiscalYearSelector />}
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Expenses YTD" value={formatPesoCompact(total)} icon={Receipt} hint={formatPeso(total)} />
          <StatCard label="Records" value={data.length} hint="From released vouchers" />
          <StatCard label="Largest category" value={largest?.label ?? "—"} hint={largest ? formatPeso(largest.amount) : undefined} />
          <StatCard
            label="Unliquidated"
            value={unliquidated.length}
            hint={`${formatPesoCompact(unliquidated.reduce((s, e) => s + e.amount, 0))} without receipts`}
          />
        </div>
      )}
      <ContentTabs
        tabs={[
          {
            value: "all",
            label: "All expenses",
            content: (
              <DataTable
                columns={columns}
                data={data}
                getRowId={(e) => e.id}
                status={load.status}
                onRetry={load.retry}
                search={{
                  placeholder: "Search payee, description, reference…",
                  getText: (e) => `${e.expenseNumber} ${e.payee} ${e.description} ${e.reference}`,
                }}
                filters={filters}
                dateFilter={{ getDate: (e) => e.date }}
                initialSorting={[{ id: "date", desc: true }]}
                initialVisibility={{ fund: false }}
                empty={{ icon: Receipt, title: `No expenses for FY ${fiscalYear}`, description: "Expenses appear when disbursement vouchers are released." }}
              />
            ),
          },
          {
            value: "monthly",
            label: "Monthly",
            content: (
              <div className="grid gap-4 lg:grid-cols-5">
                <SectionCard title="Monthly spending" className="lg:col-span-3">
                  <SimpleBarChart
                    data={views.monthly.map((m) => ({ label: m.label.slice(0, 3), value: m.amount }))}
                    seriesName="Expenses"
                    valueFormat="peso"
                    height={260}
                    color="var(--chart-2)"
                  />
                </SectionCard>
                <div className="lg:col-span-2">
                  <BreakdownTable rows={views.monthly} labelHeader="Month" />
                </div>
              </div>
            ),
          },
          {
            value: "category",
            label: "By category",
            content: (
              <div className="grid gap-4 lg:grid-cols-5">
                <SectionCard title="Spending by category" className="lg:col-span-2">
                  <SimpleBarChart
                    data={views.byCategory.map((r) => ({ label: r.label, value: r.amount })).sort((a, b) => b.value - a.value)}
                    seriesName="Expenses"
                    horizontal
                    valueFormat="peso"
                    height={320}
                    categoryWidth={140}
                  />
                </SectionCard>
                <div className="lg:col-span-3">
                  <BreakdownTable rows={views.byCategory} labelHeader="Budget category" />
                </div>
              </div>
            ),
          },
          {
            value: "ppa",
            label: "By PPA",
            content: (
              <div className="grid gap-4 lg:grid-cols-5">
                <SectionCard title="Spending by project" description="Top 8" className="lg:col-span-2">
                  <SimpleBarChart
                    data={[...views.byPPA]
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 8)
                      .map((r) => ({ label: r.label.length > 22 ? r.label.slice(0, 20) + "…" : r.label, value: r.amount }))}
                    seriesName="Expenses"
                    horizontal
                    valueFormat="peso"
                    height={320}
                    categoryWidth={150}
                  />
                </SectionCard>
                <div className="lg:col-span-3">
                  <BreakdownTable rows={views.byPPA} labelHeader="Program / project / activity" />
                </div>
              </div>
            ),
          },
          { value: "fund", label: "By fund source", content: <BreakdownTable rows={views.byFund} labelHeader="Fund source" /> },
          {
            value: "liquidation",
            label: "Liquidation",
            count: unliquidated.length,
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                {unliquidated.length === 0 && (
                  <SectionCard>
                    <p className="text-sm text-muted-foreground">All expenses have receipts attached.</p>
                  </SectionCard>
                )}
                {unliquidated.map((e) => (
                  <SectionCard
                    key={e.id}
                    title={`${e.expenseNumber} · ${e.payee}`}
                    description={`${formatDate(e.date)} · ${e.description}`}
                    actions={<Money value={e.amount} className="font-medium" />}
                  >
                    <AttachmentsPanel
                      attachments={e.attachments}
                      emptyLabel="No receipts attached"
                      required
                      onAdd={can("finance") ? (files) => expenseActions.addAttachments(e.id, files) : undefined}
                    />
                  </SectionCard>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
