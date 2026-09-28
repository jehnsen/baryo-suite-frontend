"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Eye, PiggyBank, Plus, ScrollText, Stamp } from "lucide-react"
import type { Attachment, Ordinance, OrdinanceStatus, Resolution, ResolutionStatus, StatusChange } from "@/types"
import { Button } from "@/components/ui/button"
import { ApprovalTimeline } from "@/components/shared/approval-timeline"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { DetailList } from "@/components/shared/detail-list"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { WorkflowActions } from "@/components/shared/workflow-actions"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useBudgets, useCurrentUser, useLookups, useOrdinances, useResolutions, useSessions } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ORDINANCE_STATUSES, RESOLUTION_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, officialName } from "@/lib/format"
import { ordinanceActions, resolutionActions } from "@/lib/store/governance-actions"
import { ORDINANCE_WORKFLOW, RESOLUTION_WORKFLOW } from "@/lib/workflows"

export type LegislationKind = "ordinance" | "resolution"

/** Common view model so ordinances and resolutions share one list and detail. */
interface LegislationRow {
  id: string
  number: string
  title: string
  description: string
  sponsorId: string
  committeeId?: string
  sessionId?: string
  dateIntroduced?: string
  dateApproved?: string
  effectiveDate?: string
  status: string
  attachments: Attachment[]
  history: StatusChange<string>[]
  record: Ordinance | Resolution
}

const toRow = (r: Ordinance | Resolution): LegislationRow =>
  "ordinanceNumber" in r ? { ...r, number: r.ordinanceNumber, record: r } : { ...r, number: r.resolutionNumber, record: r }

const CONFIG = {
  ordinance: {
    label: "Ordinance",
    plural: "Ordinances",
    base: "/governance/ordinances",
    icon: ScrollText,
    statuses: ORDINANCE_STATUSES,
    description: "Enacted and pending barangay ordinances.",
  },
  resolution: {
    label: "Resolution",
    plural: "Resolutions",
    base: "/governance/resolutions",
    icon: Stamp,
    statuses: RESOLUTION_STATUSES,
    description: "Resolutions of the Sangguniang Barangay.",
  },
} as const

const col = createAppColumnHelper<LegislationRow>()

function useLegislation(kind: LegislationKind) {
  const ordinances = useOrdinances()
  const resolutions = useResolutions()
  return useMemo(() => (kind === "ordinance" ? ordinances : resolutions).map(toRow), [kind, ordinances, resolutions])
}

export function LegislationListView({ kind }: { kind: LegislationKind }) {
  const router = useRouter()
  const load = usePageLoad()
  const rows = useLegislation(kind)
  const { officials, committees, sessions } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const c = CONFIG[kind]

  const stats = useMemo(() => {
    const by = (...s: string[]) => rows.filter((r) => s.includes(r.status)).length
    return kind === "ordinance"
      ? [
          ["In effect", by("Effective")],
          ["Approved, not yet effective", by("Approved")],
          ["Pending (draft / review)", by("Draft", "Under Review")],
          ["Repealed / archived", by("Repealed", "Archived")],
        ]
      : [
          ["Approved", by("Approved")],
          ["Proposed", by("Proposed")],
          ["Drafts", by("Draft")],
          ["Rejected / archived", by("Rejected", "Archived")],
        ]
  }, [rows, kind])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("number", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Number" />,
          cell: ({ row, getValue }) => (
            <Link
              href={`${c.base}/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue().replace(`${c.label} No. `, "")}
            </Link>
          ),
          meta: { label: `${c.label} Number` },
          enableHiding: false,
        }),
        col.accessor("title", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
          cell: ({ row, getValue }) => (
            <div className="max-w-lg min-w-64">
              <p className="line-clamp-2 font-medium">{getValue()}</p>
              <p className="text-xs text-muted-foreground">Sponsor: {officialName(officials.get(row.original.sponsorId), true)}</p>
            </div>
          ),
          meta: { label: "Title" },
        }),
        col.accessor((r) => committees.get(r.committeeId ?? "")?.name.replace("Committee on ", "") ?? "—", {
          id: "committee",
          header: "Committee",
          cell: ({ getValue }) => <span className="line-clamp-2 max-w-48 text-muted-foreground">{getValue()}</span>,
          meta: { label: "Committee" },
        }),
        col.accessor((r) => sessions.get(r.sessionId ?? "")?.sessionNumber ?? "", {
          id: "session",
          header: "Session",
          cell: ({ row, getValue }) =>
            row.original.sessionId ? (
              <Link href={`/governance/sessions/${row.original.sessionId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:underline">
                {getValue()}
              </Link>
            ) : (
              "—"
            ),
          meta: { label: "Related Session" },
        }),
        ...(kind === "ordinance"
          ? [
              col.accessor("dateIntroduced", {
                header: ({ column }) => <DataTableColumnHeader column={column} title="Introduced" />,
                cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span>,
                meta: { label: "Date Introduced" },
              }),
            ]
          : []),
        col.accessor("dateApproved", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Approved" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span>,
          meta: { label: "Date Approved" },
        }),
        ...(kind === "ordinance"
          ? [
              col.accessor("effectiveDate", {
                header: "Effective",
                cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span>,
                meta: { label: "Effective Date" },
              }),
            ]
          : []),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => <RowActions actions={[{ label: "Open", icon: Eye, onSelect: () => router.push(`${c.base}/${row.original.id}`) }]} />,
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [c, kind, officials, committees, sessions, router],
  )

  const filters: DataTableFilter<LegislationRow>[] = useMemo(
    () => [
      { id: "status", label: "Status", options: toOptions([...c.statuses]), getValue: (r) => r.status },
      {
        id: "committee",
        label: "Committee",
        options: [...committees.values()].map((x) => ({ label: x.name.replace("Committee on ", ""), value: x.id })),
        getValue: (r) => r.committeeId,
      },
    ],
    [c, committees],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title={c.plural}
        description={c.description}
        breadcrumbs={[{ label: "Governance" }, { label: c.plural }]}
        actions={
          can("governance") && (
            <Button onClick={() => open({ type: kind })}>
              <Plus /> Draft {c.label.toLowerCase()}
            </Button>
          )
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value]) => (
            <StatCard key={label} label={String(label)} value={Number(value)} />
          ))}
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : rows}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{ placeholder: `Search ${c.plural.toLowerCase()} by number, title or description…`, getText: (r) => `${r.number} ${r.title} ${r.description}` }}
        filters={filters}
        dateFilter={{ label: "Date approved", getDate: (r) => r.dateApproved ?? r.dateIntroduced ?? "" }}
        onRowClick={(r) => router.push(`${c.base}/${r.id}`)}
        initialSorting={[{ id: "number", desc: true }]}
        empty={{ icon: c.icon, title: `No ${c.plural.toLowerCase()} yet` }}
      />
    </div>
  )
}

export function LegislationDetail({ kind, id }: { kind: LegislationKind; id: string }) {
  const load = usePageLoad()
  const row = useLegislation(kind).find((r) => r.id === id)
  const c = CONFIG[kind]
  return (
    <LoadState load={load}>
      {row ? (
        <LegislationDetailContent kind={kind} row={row} />
      ) : (
        <RecordNotFound entity={c.label} backHref={c.base} backLabel={`Back to ${c.plural.toLowerCase()}`} />
      )}
    </LoadState>
  )
}

function LegislationDetailContent({ kind, row }: { kind: LegislationKind; row: LegislationRow }) {
  const c = CONFIG[kind]
  const { officials, committees, users } = useLookups()
  const sessions = useSessions()
  const budgets = useBudgets()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const session = sessions.find((s) => s.id === row.sessionId)
  const motion = session?.motions.find((m) => m.text.includes(row.number))
  const appropriatedBudget = kind === "ordinance" ? budgets.find((b) => b.ordinanceId === row.id) : undefined
  const addFiles = can("governance")
    ? (files: Parameters<typeof ordinanceActions.addAttachments>[1]) =>
        kind === "ordinance" ? ordinanceActions.addAttachments(row.id, files) : resolutionActions.addAttachments(row.id, files)
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: c.plural, href: c.base }, { label: row.number }]}
        title={<span className="text-balance">{row.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{row.number}</span> <StatusBadge status={row.status} />
          </span>
        }
        actions={
          <>
            {can("governance") && (row.status === "Draft" || row.status === "Under Review" || row.status === "Proposed") && (
              <Button
                variant="outline"
                onClick={() =>
                  "ordinanceNumber" in row.record ? open({ type: "ordinance", record: row.record }) : open({ type: "resolution", record: row.record })
                }
              >
                Edit
              </Button>
            )}
            {kind === "ordinance" ? (
              <WorkflowActions
                workflow={ORDINANCE_WORKFLOW}
                status={row.status as OrdinanceStatus}
                recordLabel={row.number}
                onTransition={(to, v) => ordinanceActions.transition(row.id, to, v.remarks, { effectiveDate: v.effectiveDate })}
              />
            ) : (
              <WorkflowActions
                workflow={RESOLUTION_WORKFLOW}
                status={row.status as ResolutionStatus}
                recordLabel={row.number}
                onTransition={(to, v) => resolutionActions.transition(row.id, to, v.remarks)}
              />
            )}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={c.label}>
            <DetailList
              items={[
                { label: "Description", value: row.description, full: true },
                { label: "Author / sponsor", value: officialName(officials.get(row.sponsorId), true) },
                {
                  label: "Committee",
                  value: row.committeeId ? (
                    <Link href={`/governance/committees/${row.committeeId}`} className="hover:underline">
                      {committees.get(row.committeeId)?.name}
                    </Link>
                  ) : undefined,
                },
                ...(kind === "ordinance" ? [{ label: "Date introduced", value: formatDate(row.dateIntroduced, "MMMM d, yyyy") }] : []),
                { label: "Date approved", value: row.dateApproved ? formatDate(row.dateApproved, "MMMM d, yyyy") : undefined },
                ...(kind === "ordinance"
                  ? [{ label: "Effective date", value: row.effectiveDate ? formatDate(row.effectiveDate, "MMMM d, yyyy") : undefined }]
                  : []),
              ]}
            />
          </SectionCard>
          {session && (
            <SectionCard title="Session">
              <Link href={`/governance/sessions/${session.id}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                <span className="flex-1 text-sm">
                  <span className="block font-medium">
                    {session.sessionNumber} · {session.title}
                  </span>
                  <span className="block text-muted-foreground">{formatDate(session.date, "EEEE, MMMM d, yyyy")}</span>
                  {motion && (
                    <span className="mt-1 block">
                      Motion: “{motion.text}” — <StatusBadge status={motion.result} />{" "}
                      {motion.votesFor !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          ({motion.votesFor}–{motion.votesAgainst ?? 0})
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Link>
            </SectionCard>
          )}
          {appropriatedBudget && (
            <SectionCard title="Appropriated budget">
              <Link href="/finance/budget" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <PiggyBank className="size-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{appropriatedBudget.title}</span>
                <StatusBadge status={appropriatedBudget.status} />
              </Link>
            </SectionCard>
          )}
          <SectionCard title="Attachments">
            <AttachmentsPanel attachments={row.attachments} emptyLabel="No signed copy attached" onAdd={addFiles} />
          </SectionCard>
        </div>
        <SectionCard title="Legislative history" className="h-fit">
          {kind === "ordinance" ? (
            <ApprovalTimeline
              workflow={ORDINANCE_WORKFLOW}
              status={row.status as OrdinanceStatus}
              history={row.history as StatusChange<OrdinanceStatus>[]}
              users={users}
            />
          ) : (
            <ApprovalTimeline
              workflow={RESOLUTION_WORKFLOW}
              status={row.status as ResolutionStatus}
              history={row.history as StatusChange<ResolutionStatus>[]}
              users={users}
            />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
