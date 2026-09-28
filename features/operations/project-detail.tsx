"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { CalendarCheck, CircleDot, Clock, Flag, Gauge, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Project, ProjectMilestone } from "@/types"
import { Button } from "@/components/ui/button"
import { ApprovalTimeline } from "@/components/shared/approval-timeline"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { DualProgress, UtilizationBar } from "@/components/shared/progress-metric"
import { ProgressUpdateDialog } from "@/components/shared/progress-update-dialog"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline, type TimelineItem } from "@/components/shared/timeline"
import { WorkflowActions } from "@/components/shared/workflow-actions"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useDisbursements, useExpenses, useLookups, useObligations, useProjects } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, officialName } from "@/lib/format"
import { projectActions } from "@/lib/store/operations-actions"
import { PROJECT_WORKFLOW } from "@/lib/workflows"
import { MilestoneDialog } from "./milestone-dialog"

const MILESTONE_ICONS = { Completed: CalendarCheck, "In Progress": Clock, Pending: CircleDot, Delayed: Flag } as const

export function ProjectDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const project = useProjects().find((p) => p.id === id)
  return (
    <LoadState load={load}>
      {project ? <Content p={project} /> : <RecordNotFound entity="Project" backHref="/projects" backLabel="Back to projects" />}
    </LoadState>
  )
}

function Content({ p }: { p: Project }) {
  const { ppas, officials, committees, fundSources, users } = useLookups()
  const ledger = useLedger()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  const expenses = useExpenses()
  const { open } = useEntityDialogs()
  const { can, canAccess } = useCurrentUser()
  const [progressOpen, setProgressOpen] = useState(false)
  const [milestone, setMilestone] = useState<{ open: boolean; record?: ProjectMilestone }>({ open: false })
  const ppa = ppas.get(p.ppaId)
  const m = ppa ? ledger.forPPA(ppa) : undefined
  const canEdit = can("operations")

  const related = useMemo(() => {
    const obl = obligations.filter((o) => o.ppaId === p.ppaId)
    const oblIds = new Set(obl.map((o) => o.id))
    return { obl, dv: disbursements.filter((d) => oblIds.has(d.obligationId)), exp: expenses.filter((e) => e.ppaId === p.ppaId) }
  }, [obligations, disbursements, expenses, p.ppaId])

  const milestoneItems: TimelineItem[] = p.milestones.map((ms) => ({
    id: ms.id,
    title: (
      <button
        type="button"
        className="text-left hover:underline disabled:no-underline"
        disabled={!canEdit}
        onClick={() => setMilestone({ open: true, record: ms })}
      >
        {ms.title}
      </button>
    ),
    icon: MILESTONE_ICONS[ms.status],
    tone: ms.status === "Completed" ? "success" : ms.status === "Delayed" ? "danger" : ms.status === "In Progress" ? "info" : "neutral",
    pending: ms.status === "Pending",
    timestamp: ms.completionDate ? `Done ${formatDate(ms.completionDate)}` : `Target ${formatDate(ms.targetDate)}`,
    description: (
      <span className="block space-y-1">
        <UtilizationBar value={ms.progress} tone={ms.status === "Delayed" ? "danger" : "info"} className="max-w-64" />
        {ms.remarks && <span className="block">{ms.remarks}</span>}
      </span>
    ),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Programs & Projects", href: "/projects" }, { label: p.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.name} <StatusBadge status={p.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{p.code}</span> · {p.location} · {p.contractor}
          </>
        }
        actions={
          <>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => open({ type: "project", record: p })}>
                  <Pencil /> Edit
                </Button>
                {(p.status === "Ongoing" || p.status === "Delayed") && (
                  <Button variant="outline" onClick={() => setProgressOpen(true)}>
                    <Gauge /> Update progress
                  </Button>
                )}
              </>
            )}
            <WorkflowActions
              workflow={PROJECT_WORKFLOW}
              status={p.status}
              recordLabel={`${p.code} · ${p.name}`}
              onTransition={(to, v) => projectActions.transition(p.id, to, v.remarks)}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Progress" className="lg:col-span-2">
          <DualProgress physical={p.physicalProgress} financial={m?.disbursementRate ?? 0} />
          {m && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
              {[
                ["Budget (PPA)", m.approved],
                ["Obligated", m.obligated],
                ["Disbursed", m.disbursed],
                ["Available", m.available],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Money value={value as number} className="font-semibold" />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Responsibility">
          <DetailList
            columns={1}
            items={[
              { label: "Responsible official", value: officialName(officials.get(p.responsibleOfficialId), true) },
              {
                label: "Committee",
                value: ppa?.committeeId ? (
                  <Link href={`/governance/committees/${ppa.committeeId}`} className="hover:underline">
                    {committees.get(ppa.committeeId)?.name}
                  </Link>
                ) : undefined,
              },
              { label: "Contractor / supplier", value: p.contractor },
              { label: "Schedule", value: `${formatDate(p.startDate)} – ${formatDate(p.targetDate)}` },
              { label: "Actual completion", value: p.actualCompletion ? formatDate(p.actualCompletion) : undefined },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContentTabs
            tabs={[
              {
                value: "milestones",
                label: "Milestones",
                count: p.milestones.length,
                content: (
                  <SectionCard
                    actions={
                      canEdit && (
                        <Button size="sm" variant="outline" onClick={() => setMilestone({ open: true })}>
                          <Plus /> Add milestone
                        </Button>
                      )
                    }
                    title="Milestones"
                  >
                    {milestoneItems.length ? <Timeline items={milestoneItems} /> : <EmptyState compact title="No milestones yet" />}
                  </SectionCard>
                ),
              },
              {
                value: "budget",
                label: "Budget & expenses",
                count: related.exp.length,
                content: (
                  <SectionCard
                    title="Financial records"
                    description={ppa ? `Charged to ${ppa.code} · ${fundSources.get(ppa.fundSourceId)?.name ?? ""}` : undefined}
                  >
                    <ul className="divide-y text-sm">
                      {related.obl.map((o) => (
                        <li key={o.id} className="flex items-center gap-3 py-2">
                          <span className="min-w-0 flex-1">
                            {canAccess("obligations") ? (
                              <Link href={`/finance/obligations/${o.id}`} className="font-mono text-xs hover:underline">
                                {o.obligationNumber}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs">{o.obligationNumber}</span>
                            )}{" "}
                            <span className="text-muted-foreground">· {o.description}</span>
                          </span>
                          <Money value={o.amount} />
                          <StatusBadge status={o.status} />
                        </li>
                      ))}
                      {related.dv.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 py-2 pl-6">
                          <span className="min-w-0 flex-1">
                            {canAccess("disbursements") ? (
                              <Link href={`/finance/disbursements/${d.id}`} className="font-mono text-xs hover:underline">
                                {d.voucherNumber}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs">{d.voucherNumber}</span>
                            )}{" "}
                            <span className="text-muted-foreground">
                              · {formatDate(d.date)} · {d.referenceNumber ?? d.paymentMethod}
                            </span>
                          </span>
                          <Money value={d.amount} />
                          <StatusBadge status={d.status} />
                        </li>
                      ))}
                      {related.obl.length === 0 && <li className="py-2 text-muted-foreground">No obligations charged to this project yet.</li>}
                    </ul>
                  </SectionCard>
                ),
              },
              {
                value: "attachments",
                label: "Attachments",
                count: p.attachments.length,
                content: (
                  <SectionCard>
                    <AttachmentsPanel
                      attachments={p.attachments}
                      emptyLabel="No program of works or photos attached"
                      onAdd={canEdit ? (files) => projectActions.addAttachments(p.id, files) : undefined}
                    />
                  </SectionCard>
                ),
              },
            ]}
          />
        </div>
        <SectionCard title="Timeline" className="h-fit">
          <ApprovalTimeline workflow={PROJECT_WORKFLOW} status={p.status} history={p.history} users={users} />
        </SectionCard>
      </div>

      <MilestoneDialog projectId={p.id} milestone={milestone.record} open={milestone.open} onOpenChange={(o) => setMilestone((x) => ({ ...x, open: o }))} />
      <ProgressUpdateDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        current={p.physicalProgress}
        onSave={(value) => {
          projectActions.update(p.id, { physicalProgress: value })
          toast.success("Physical progress updated", { description: `${p.code} · ${value}%` })
        }}
      />
    </div>
  )
}
