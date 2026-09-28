"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus, UsersRound } from "lucide-react"
import type { Committee } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCommittees, useCurrentUser, useLookups, useOrdinances, usePPAs, useResolutions } from "@/hooks/use-data"
import { useAssignmentScope } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { fullName, officialName } from "@/lib/format"

type Row = Committee & { ppaCount: number; legislationCount: number; mine: boolean }
const col = createAppColumnHelper<Row>()

export function CommitteesView() {
  const router = useRouter()
  const load = usePageLoad()
  const committees = useCommittees()
  const ppas = usePPAs()
  const ordinances = useOrdinances()
  const resolutions = useResolutions()
  const { officials } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const { scoped, myCommittees } = useAssignmentScope()

  const rows: Row[] = useMemo(
    () =>
      committees
        .map((c) => ({
          ...c,
          ppaCount: ppas.filter((p) => p.committeeId === c.id && p.budgetId === "bud-2026").length,
          legislationCount: ordinances.filter((o) => o.committeeId === c.id).length + resolutions.filter((r) => r.committeeId === c.id).length,
          mine: myCommittees.has(c.id),
        }))
        .filter((c) => !scoped || c.mine),
    [committees, ppas, ordinances, resolutions, myCommittees, scoped],
  )

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Committee" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-56">
              <Link href={`/governance/committees/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
                {getValue()}
              </Link>
              {row.original.mine && <TagBadge className="ml-2">My committee</TagBadge>}
            </div>
          ),
          meta: { label: "Committee Name" },
          enableHiding: false,
        }),
        col.accessor((c) => officialName(officials.get(c.chairpersonId)), {
          id: "chair",
          header: "Chairperson",
          cell: ({ getValue }) => (
            <span className="flex items-center gap-2 whitespace-nowrap">
              <PersonAvatar name={getValue()} size="xs" /> {getValue()}
            </span>
          ),
          meta: { label: "Chairperson" },
        }),
        col.accessor((c) => officialName(officials.get(c.viceChairId ?? "")), {
          id: "vice",
          header: "Vice chair",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Vice Chair" },
        }),
        col.accessor((c) => c.memberIds.length + 1 + (c.viceChairId ? 1 : 0), {
          id: "members",
          header: "Members",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: "Members" },
        }),
        col.accessor("ppaCount", {
          header: "PPAs (FY 2026)",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: "PPAs" },
        }),
        col.accessor("legislationCount", {
          header: "Legislation",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: "Legislation" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "Open", icon: Eye, onSelect: () => router.push(`/governance/committees/${row.original.id}`) },
                { label: "Edit", icon: Pencil, onSelect: () => open({ type: "committee", record: row.original }), hidden: !can("governance") },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, router, open, can],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Committees"
        description="Standing committees of the Sangguniang Barangay. Members come from the Officials directory."
        breadcrumbs={[{ label: "Governance" }, { label: "Committees" }]}
        actions={
          can("governance") && (
            <Button onClick={() => open({ type: "committee" })}>
              <Plus /> New committee
            </Button>
          )
        }
      />
      {scoped && (
        <Alert>
          <UsersRound />
          <AlertDescription>Showing the committees you chair or sit on.</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : rows}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search committee or member…",
          getText: (c) => `${c.name} ${[c.chairpersonId, c.viceChairId, ...c.memberIds].map((id) => fullName(officials.get(id ?? ""))).join(" ")}`,
        }}
        onRowClick={(r) => router.push(`/governance/committees/${r.id}`)}
        exportable={false}
        empty={{ icon: UsersRound, title: scoped ? "You are not assigned to any committee" : "No committees yet" }}
      />
    </div>
  )
}
