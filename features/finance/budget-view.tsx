"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Landmark, Pencil, PiggyBank, Plus, ScrollText } from "lucide-react"
import type { AnnualBudget, FundSource } from "@/types"
import { Button } from "@/components/ui/button"
import { ApprovalTimeline } from "@/components/shared/approval-timeline"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { LoadState } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { WorkflowActions } from "@/components/shared/workflow-actions"
import { DataTable } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAllocations, useBudgets, useCurrentUser, useFundSources, useLookups, useSettings } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { allocationApproved } from "@/lib/finance"
import { formatDate, formatPercent, formatPesoCompact } from "@/lib/format"
import { budgetActions } from "@/lib/store/finance-actions"
import { BUDGET_WORKFLOW } from "@/lib/workflows"

const fsCol = createAppColumnHelper<FundSource>()
const budgetCol = createAppColumnHelper<AnnualBudget>()

export function BudgetView() {
  const load = usePageLoad()
  const { budget, fiscalYear, setFiscalYear } = useFiscalYear()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const [tab, setTab] = useState("overview")

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PiggyBank}
        title="Annual Budget"
        description="Annual barangay budget, approval and funding sources."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Annual Budget" }]}
        actions={
          <>
            <FiscalYearSelector />
            {can("finance") && (
              <Button onClick={() => open({ type: "budget" })}>
                <Plus /> New budget
              </Button>
            )}
          </>
        }
      />
      <LoadState load={load}>
        <ContentTabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            {
              value: "overview",
              label: `FY ${fiscalYear}`,
              content:
                budget && !load.demoEmpty ? (
                  <BudgetOverview budget={budget} />
                ) : (
                  <NoBudget fiscalYear={fiscalYear} canCreate={can("finance")} onCreate={() => open({ type: "budget" })} />
                ),
            },
            { value: "sources", label: "Fund Sources", content: <FundSourcesTab fiscalYear={fiscalYear} /> },
            {
              value: "all",
              label: "All Fiscal Years",
              content: (
                <AllBudgetsTab
                  onSelect={(b) => {
                    setFiscalYear(b.fiscalYear)
                    setTab("overview")
                  }}
                />
              ),
            },
          ]}
        />
      </LoadState>
    </div>
  )
}

function NoBudget({ fiscalYear, canCreate, onCreate }: { fiscalYear: number; canCreate: boolean; onCreate: () => void }) {
  return (
    <SectionCard>
      <EmptyState
        icon={PiggyBank}
        title={`No budget for FY ${fiscalYear}`}
        description="Prepare the annual budget from the Annual Investment Program."
        action={
          canCreate ? (
            <Button size="sm" onClick={onCreate}>
              New budget
            </Button>
          ) : undefined
        }
      />
    </SectionCard>
  )
}

function BudgetOverview({ budget }: { budget: AnnualBudget }) {
  const ledger = useLedger()
  const allocations = useAllocations().filter((a) => a.budgetId === budget.id)
  const fundSources = useFundSources().filter((f) => f.fiscalYear === budget.fiscalYear)
  const { users } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const { budgetThresholds } = useSettings()
  const totals = ledger.forBudget(budget.id)
  const appropriated = allocations.reduce((s, a) => s + allocationApproved(a), 0)
  const funding = fundSources.reduce((s, f) => s + f.amount, 0)

  return (
    <div className="space-y-4">
      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            {budget.title} <StatusBadge status={budget.status} />
          </span>
        }
        description={budget.approvalDate ? `Approved ${formatDate(budget.approvalDate, "MMMM d, yyyy")}` : "Not yet approved"}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {can("finance") && budget.status === "Draft" && (
              <Button variant="outline" onClick={() => open({ type: "budget", record: budget })}>
                <Pencil /> Edit
              </Button>
            )}
            <WorkflowActions
              workflow={BUDGET_WORKFLOW}
              status={budget.status}
              recordLabel={budget.title}
              onTransition={(to, v) => budgetActions.transition(budget.id, to, v.remarks)}
            />
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Estimated income", budget.estimatedIncome],
            ["Approved budget", budget.approvedBudget],
            ["Appropriated", appropriated],
            ["Unappropriated", budget.approvedBudget - appropriated],
            ["Obligated", totals.obligated],
            ["Remaining", budget.approvedBudget - totals.obligated],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-primary/10 bg-accent/35 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="my-1 text-2xl font-semibold tracking-tight tabular-nums">{formatPesoCompact(value as number)}</p>
              <Money value={value as number} className="text-xs" muted />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Allocation by category"
          description={`${allocations.length} categories · ${formatPercent(totals.utilization)} obligated`}
          className="lg:col-span-2"
          actions={
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link href="/finance/allocations">Manage allocations</Link>
            </Button>
          }
        >
          {allocations.length === 0 ? (
            <EmptyState compact title="No allocations yet" description="Distribute the budget into categories." />
          ) : (
            <ul className="space-y-2.5">
              {allocations.map((a) => {
                const m = ledger.forAllocation(a)
                return (
                  <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,12rem)_7rem_1fr]">
                    <span className="truncate text-sm">{a.category}</span>
                    <Money value={m.approved} className="text-right text-sm" />
                    <UtilizationBar value={m.utilization} thresholds={budgetThresholds} className="col-span-2 sm:col-span-1" />
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Approval">
            <ApprovalTimeline workflow={BUDGET_WORKFLOW} status={budget.status} history={budget.history} users={users} />
          </SectionCard>
          <SectionCard title="Details">
            <DetailList
              columns={1}
              items={[
                {
                  label: "Appropriation ordinance",
                  value: budget.ordinanceId ? (
                    <Link href={`/governance/ordinances/${budget.ordinanceId}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <ScrollText className="size-3.5" /> View ordinance
                    </Link>
                  ) : undefined,
                },
                { label: "Funding recorded", value: <Money value={funding} /> },
                { label: "Notes", value: budget.notes },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function FundSourcesTab({ fiscalYear }: { fiscalYear: number }) {
  const fundSources = useFundSources()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canEdit = can("finance")
  const data = useMemo(() => fundSources.filter((f) => f.fiscalYear === fiscalYear), [fundSources, fiscalYear])
  const total = data.reduce((s, f) => s + f.amount, 0)

  const columns = useMemo(
    () =>
      fsCol.columns([
        fsCol.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Fund source" />,
          cell: ({ row }) => (
            <div className="min-w-56">
              <p className="font-medium">{row.original.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            </div>
          ),
          meta: { label: "Fund Source" },
          enableHiding: false,
        }),
        fsCol.accessor("type", { header: "Type", cell: ({ getValue }) => <TagBadge>{getValue()}</TagBadge>, meta: { label: "Type" } }),
        fsCol.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Amount" },
        }),
        fsCol.accessor("dateReceived", { header: "Date received", cell: ({ getValue }) => formatDate(getValue()), meta: { label: "Date Received" } }),
        fsCol.accessor("referenceNumber", {
          header: "Reference",
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
          meta: { label: "Reference Number" },
        }),
        fsCol.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: () => open({ type: "fundSource", record: row.original }), hidden: !canEdit }]} />
          ),
          meta: { className: "w-10" },
        }),
      ]),
    [open, canEdit],
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Funding FY ${fiscalYear}`} value={formatPesoCompact(total)} icon={Landmark} hint={`${data.length} sources`} />
      </div>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(f) => f.id}
        search={{ placeholder: "Search fund sources…", getText: (f) => `${f.name} ${f.type} ${f.referenceNumber}` }}
        toolbarActions={
          canEdit && (
            <Button size="sm" className="h-8" onClick={() => open({ type: "fundSource" })}>
              <Plus /> Record fund source
            </Button>
          )
        }
        empty={{ icon: Landmark, title: `No fund sources for FY ${fiscalYear}`, description: "Record the NTA, local collections, grants and other receipts." }}
      />
    </div>
  )
}

function AllBudgetsTab({ onSelect }: { onSelect: (b: AnnualBudget) => void }) {
  const budgets = useBudgets()
  const ledger = useLedger()
  const columns = useMemo(
    () =>
      budgetCol.columns([
        budgetCol.accessor("fiscalYear", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Fiscal year" />,
          cell: ({ getValue }) => <span className="font-medium">FY {getValue()}</span>,
          meta: { label: "Fiscal Year" },
        }),
        budgetCol.accessor("title", { header: "Budget title", meta: { label: "Budget Title" } }),
        budgetCol.accessor("estimatedIncome", {
          header: "Estimated income",
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Estimated Income" },
        }),
        budgetCol.accessor("approvedBudget", {
          header: "Approved budget",
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Approved Budget" },
        }),
        budgetCol.accessor((b) => ledger.forBudget(b.id).utilization, {
          id: "utilization",
          header: "Obligated",
          cell: ({ getValue }) => <UtilizationBar value={getValue()} tone="info" className="w-32" />,
          meta: { label: "Utilization" },
        }),
        budgetCol.accessor("approvalDate", { header: "Approval date", cell: ({ getValue }) => formatDate(getValue()), meta: { label: "Approval Date" } }),
        budgetCol.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
      ]),
    [ledger],
  )
  return (
    <DataTable
      columns={columns}
      data={budgets}
      getRowId={(b) => b.id}
      onRowClick={onSelect}
      initialSorting={[{ id: "fiscalYear", desc: true }]}
      exportable={false}
      empty={{ icon: PiggyBank, title: "No budgets recorded" }}
    />
  )
}
