"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, FolderKanban, Plus, UsersRound } from "lucide-react"
import type { Project } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ContentTabs } from "@/components/shared/content-tabs"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useLookups, usePPAs, useProjects } from "@/hooks/use-data"
import { useAssignmentScope, useFiscalYear, useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { PROJECT_STATUSES, toOptions } from "@/lib/constants"
import { ppaApproved } from "@/lib/finance"
import { formatDate, formatPesoCompact, officialName } from "@/lib/format"
import { PPATable } from "@/features/finance/ppa-table"

type Row = Project & { budget: number; financial: number; ppaCode: string; overdue: boolean }
const col = createAppColumnHelper<Row>()

export function ProjectsView() {
  const router = useRouter()
  const load = usePageLoad()
  const projects = useProjects()
  const allPpas = usePPAs()
  const { ppas, officials } = useLookups()
  const ledger = useLedger()
  const { budget } = useFiscalYear()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const { scoped, ppaVisible, projectVisible } = useAssignmentScope()
  const today = new Date().toISOString().slice(0, 10)

  const rows: Row[] = useMemo(
    () =>
      projects
        .filter((p) => projectVisible(ppas.get(p.ppaId), p.responsibleOfficialId))
        .map((p) => {
          const ppa = ppas.get(p.ppaId)
          const m = ppa ? ledger.forPPA(ppa) : undefined
          return {
            ...p,
            budget: ppa ? ppaApproved(ppa) : 0,
            financial: m?.disbursementRate ?? 0,
            ppaCode: ppa?.code ?? "—",
            overdue: p.status !== "Completed" && p.status !== "Cancelled" && p.targetDate < today,
          }
        }),
    [projects, ppas, ledger, projectVisible, today],
  )
  const visiblePpas = useMemo(() => allPpas.filter((p) => p.budgetId === budget?.id && ppaVisible(p)), [allPpas, budget, ppaVisible])
  const active = rows.filter((r) => ["Approved", "Procurement", "Ongoing", "Delayed"].includes(r.status))

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("code", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/projects/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Project Code" },
          enableHiding: false,
        }),
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-52">
              <p className="font-medium">{getValue()}</p>
              <p className="text-xs text-muted-foreground">{row.original.location}</p>
            </div>
          ),
          meta: { label: "Project Name" },
        }),
        col.accessor("ppaCode", {
          header: "PPA",
          cell: ({ row, getValue }) => (
            <Link href={`/ppas/${row.original.ppaId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:underline">
              {getValue()}
            </Link>
          ),
          meta: { label: "PPA" },
        }),
        col.accessor("budget", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Budget" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Budget" },
        }),
        col.accessor("contractor", {
          header: "Contractor",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Contractor / Supplier" },
        }),
        col.accessor((p) => officialName(officials.get(p.responsibleOfficialId)), {
          id: "official",
          header: "Responsible",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Responsible Official" },
        }),
        col.accessor("targetDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
          cell: ({ row, getValue }) => (
            <span className={row.original.overdue ? "font-medium whitespace-nowrap text-[var(--tone-danger)]" : "whitespace-nowrap"}>
              {formatDate(getValue())}
            </span>
          ),
          meta: { label: "Target Date" },
        }),
        col.accessor("physicalProgress", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Physical" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} tone="info" className="w-28" />,
          meta: { label: "Physical Progress" },
        }),
        col.accessor("financial", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Financial" />,
          cell: ({ getValue }) => <UtilizationBar value={getValue()} tone="success" className="w-28" />,
          meta: { label: "Financial Progress" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`/projects/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, router],
  )

  const filters: DataTableFilter<Row>[] = useMemo(
    () => [{ id: "status", label: "Status", options: toOptions(PROJECT_STATUSES), getValue: (r) => r.status }],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="Programs & Projects"
        description="Implementation of PPAs: physical and financial progress, milestones and contractors."
        breadcrumbs={[{ label: "Operations" }, { label: "Programs & Projects" }]}
        actions={
          can("operations") && (
            <Button onClick={() => open({ type: "project" })}>
              <Plus /> New project
            </Button>
          )
        }
      />
      {scoped && (
        <Alert>
          <UsersRound />
          <AlertDescription>Showing PPAs and projects you are responsible for or that belong to your committees.</AlertDescription>
        </Alert>
      )}
      {!load.isLoading && !load.isError && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard emphasis="primary" label="Active projects" value={active.length} icon={FolderKanban} />
          <StatCard
            emphasis="secondary"
            label="Delayed"
            value={rows.filter((r) => r.status === "Delayed").length}
            hint={`${rows.filter((r) => r.overdue).length} past target date`}
          />
          <StatCard label="Budget of active projects" value={formatPesoCompact(active.reduce((s, r) => s + r.budget, 0))} />
          <StatCard label="Completed" value={rows.filter((r) => r.status === "Completed").length} />
        </div>
      )}
      <ContentTabs
        tabs={[
          {
            value: "projects",
            label: "Projects",
            count: rows.length,
            content: (
              <DataTable
                columns={columns}
                data={load.demoEmpty ? [] : rows}
                getRowId={(r) => r.id}
                status={load.status}
                onRetry={load.retry}
                search={{ placeholder: "Search project, contractor, location…", getText: (r) => `${r.code} ${r.name} ${r.contractor} ${r.location}` }}
                filters={filters}
                onRowClick={(r) => router.push(`/projects/${r.id}`)}
                initialSorting={[{ id: "code", desc: true }]}
                initialVisibility={{ contractor: false }}
                empty={{
                  icon: FolderKanban,
                  title: scoped ? "No projects assigned to you" : "No projects yet",
                  description: "Create a project for a Project-type PPA to track implementation.",
                }}
              />
            ),
          },
          {
            value: "ppas",
            label: `PPAs (FY ${budget?.fiscalYear ?? ""})`,
            count: visiblePpas.length,
            content: <PPATable ppas={load.demoEmpty ? [] : visiblePpas} status={load.status} onRetry={load.retry} />,
          },
        ]}
      />
    </div>
  )
}
