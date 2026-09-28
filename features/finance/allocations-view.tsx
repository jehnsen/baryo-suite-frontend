"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ChartPie, ChevronRight, Pencil, Plus } from "lucide-react"
import type { BudgetAllocation } from "@/types"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ContentTabs } from "@/components/shared/content-tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAllocations, useCurrentUser, usePPAs, useSettings } from "@/hooks/use-data"
import { useAssignmentScope, useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { utilizationStatus, type BudgetMetrics } from "@/lib/finance"
import { formatPercent, formatPesoCompact } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PPATable } from "./ppa-table"

type Row = BudgetAllocation & { m: BudgetMetrics }
const col = createAppColumnHelper<Row>()

export function AllocationsView() {
  const load = usePageLoad()
  const { budget, fiscalYear } = useFiscalYear()
  const ledger = useLedger()
  const allocations = useAllocations()
  const ppas = usePPAs()
  const { budgetThresholds } = useSettings()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const { ppaVisible } = useAssignmentScope()
  const canEdit = can("finance")

  const rows: Row[] = useMemo(
    () => (budget ? allocations.filter((a) => a.budgetId === budget.id).map((a) => ({ ...a, m: ledger.forAllocation(a) })) : []),
    [allocations, budget, ledger],
  )
  const budgetPpas = useMemo(() => (budget ? ppas.filter((p) => p.budgetId === budget.id && ppaVisible(p)) : []), [ppas, budget, ppaVisible])
  const totals = budget ? ledger.forBudget(budget.id) : undefined

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("category", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-44">
              <p className="font-medium">{getValue()}</p>
              {row.original.remarks && <p className="text-xs text-muted-foreground">{row.original.remarks}</p>}
            </div>
          ),
          meta: { label: "Category" },
          enableHiding: false,
        }),
        col.accessor((r) => r.m.approved, {
          id: "approved",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Allocation" />,
          cell: ({ row, getValue }) => (
            <div>
              <Money value={getValue()} className="font-medium" />
              {row.original.revisedAmount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Revised from <Money value={row.original.approvedAmount} />
                </p>
              )}
            </div>
          ),
          meta: { label: "Approved Allocation" },
        }),
        col.accessor((r) => r.m.obligated, {
          id: "obligated",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Obligated" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Obligated" },
        }),
        col.accessor((r) => r.m.disbursed, {
          id: "disbursed",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Disbursed" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Disbursed" },
        }),
        col.accessor((r) => r.m.available, {
          id: "available",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Available" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Available Balance" },
        }),
        col.accessor((r) => r.m.utilization, {
          id: "utilization",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Utilization" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} thresholds={budgetThresholds} className="w-36" />,
          meta: { label: "Utilization %" },
        }),
        col.accessor((r) => utilizationStatus(r.m.utilization, budgetThresholds), {
          id: "status",
          header: "Status",
          cell: ({ getValue }) => <StatusBadge status={getValue()} />,
          meta: { label: "Status" },
        }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "Revise allocation", icon: Pencil, onSelect: () => open({ type: "allocation", record: row.original }), hidden: !canEdit },
                {
                  label: "Add PPA",
                  icon: Plus,
                  onSelect: () => open({ type: "ppa", defaults: { budgetId: row.original.budgetId, category: row.original.category } }),
                  hidden: !canEdit,
                },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [budgetThresholds, open, canEdit],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ChartPie}
        title="Budget Allocations"
        description={budget ? `${budget.title} distributed by category and PPA.` : `No budget for FY ${fiscalYear}.`}
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Budget Allocations" }]}
        actions={
          <>
            <FiscalYearSelector />
            {canEdit && budget && (
              <Button onClick={() => open({ type: "allocation", defaults: { budgetId: budget.id } })}>
                <Plus /> Add allocation
              </Button>
            )}
          </>
        }
      />

      {totals && !load.isLoading && !load.isError && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Appropriations" value={formatPesoCompact(totals.approved)} hint={`${rows.length} categories`} />
          <StatCard label="Obligated" value={formatPesoCompact(totals.obligated)} hint={`${formatPercent(totals.utilization)} utilization`} />
          <StatCard label="Disbursed" value={formatPesoCompact(totals.disbursed)} hint={`${formatPercent(totals.disbursementRate)} of appropriations`} />
          <StatCard
            label="Available balance"
            value={formatPesoCompact(totals.available)}
            hint={`Warning at ${budgetThresholds.warning}% · critical at ${budgetThresholds.critical}%`}
          />
        </div>
      )}

      <ContentTabs
        tabs={[
          {
            value: "categories",
            label: "By category",
            content: (
              <DataTable
                columns={columns}
                data={load.demoEmpty ? [] : rows}
                getRowId={(r) => r.id}
                status={load.status}
                onRetry={load.retry}
                search={{ placeholder: "Search category…", getText: (r) => r.category }}
                filters={[
                  {
                    id: "status",
                    label: "Status",
                    options: ["Within Budget", "Nearing Limit", "Critical", "Exhausted"].map((s) => ({ label: s, value: s })),
                    getValue: (r) => utilizationStatus(r.m.utilization, budgetThresholds),
                  },
                ]}
                initialSorting={[{ id: "utilization", desc: true }]}
                empty={{ icon: ChartPie, title: "No allocations yet", description: "Distribute the annual budget into categories." }}
              />
            ),
          },
          { value: "tree", label: "PPA breakdown", content: <BreakdownTree rows={rows} /> },
          {
            value: "ppas",
            label: "All PPAs",
            count: budgetPpas.length,
            content: <PPATable ppas={load.demoEmpty ? [] : budgetPpas} status={load.status} onRetry={load.retry} />,
          },
        ]}
      />
    </div>
  )
}

/** Allocation → PPA tree with monitoring figures at both levels. */
function BreakdownTree({ rows }: { rows: Row[] }) {
  const ppas = usePPAs()
  const ledger = useLedger()
  const { budgetThresholds } = useSettings()
  const { ppaVisible } = useAssignmentScope()
  if (rows.length === 0)
    return (
      <SectionCard>
        <EmptyState compact title="No allocations to break down" />
      </SectionCard>
    )
  return (
    <SectionCard contentClassName="px-0">
      <ul className="divide-y">
        {rows.map((r) => {
          const children = ppas.filter((p) => p.budgetId === r.budgetId && p.category === r.category && ppaVisible(p))
          return (
            <Collapsible key={r.id} asChild defaultOpen={r.category === "Infrastructure"}>
              <li>
                <CollapsibleTrigger className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{r.category}</span>
                    <span className="block text-xs text-muted-foreground">{children.length} PPAs</span>
                  </span>
                  <Money value={r.m.approved} className="hidden w-32 text-right font-medium sm:block" />
                  <UtilizationBar value={r.m.utilization} thresholds={budgetThresholds} className="w-36 sm:w-44" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="border-t bg-muted/20">
                    {children.length === 0 && <li className="px-12 py-3 text-sm text-muted-foreground">No PPAs under this category yet.</li>}
                    {children.map((p, i) => {
                      const m = ledger.forPPA(p)
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/ppas/${p.id}`}
                            className={cn("flex items-center gap-3 py-2.5 pr-4 pl-12 text-sm hover:bg-muted/60", i > 0 && "border-t border-dashed")}
                          >
                            <span className="text-muted-foreground">{i === children.length - 1 ? "└" : "├"}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{p.name}</span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-mono">{p.code}</span> <TagBadge className="h-4 px-1 text-[10px]">{p.type}</TagBadge> Available{" "}
                                <Money value={m.available} />
                              </span>
                            </span>
                            <Money value={m.approved} className="hidden w-28 text-right sm:block" />
                            <UtilizationBar value={m.utilization} thresholds={budgetThresholds} className="w-36 sm:w-44" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </CollapsibleContent>
              </li>
            </Collapsible>
          )
        })}
      </ul>
    </SectionCard>
  )
}
