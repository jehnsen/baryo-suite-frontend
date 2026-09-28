"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FilePen, FolderKanban, Gauge, Pencil, Plus } from "lucide-react"
import type { PPA } from "@/types"
import { Button } from "@/components/ui/button"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { DualProgress, UtilizationBar } from "@/components/shared/progress-metric"
import { ProgressUpdateDialog } from "@/components/shared/progress-update-dialog"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useDisbursements, useLookups, useObligations, usePPAs, useSettings } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatPercent, officialName } from "@/lib/format"
import { ppaActions } from "@/lib/store/finance-actions"
import { toast } from "sonner"

export function PPADetail({ id }: { id: string }) {
  const load = usePageLoad()
  const ppa = usePPAs().find((p) => p.id === id)
  return (
    <LoadState load={load}>
      {ppa ? <PPADetailContent ppa={ppa} /> : <RecordNotFound entity="PPA" backHref="/finance/allocations" backLabel="Back to allocations" />}
    </LoadState>
  )
}

function PPADetailContent({ ppa }: { ppa: PPA }) {
  const router = useRouter()
  const ledger = useLedger()
  const { officials, committees, fundSources, projects, budgets } = useLookups()
  const obligations = useObligations()
  const disbursements = useDisbursements()
  const { budgetThresholds } = useSettings()
  const { can, canAccess } = useCurrentUser()
  const { open } = useEntityDialogs()
  const [progressOpen, setProgressOpen] = useState(false)
  const m = ledger.forPPA(ppa)
  const project = [...projects.values()].find((p) => p.ppaId === ppa.id)
  const physical = project?.physicalProgress ?? ppa.physicalProgress
  const ppaObligations = useMemo(() => obligations.filter((o) => o.ppaId === ppa.id), [obligations, ppa.id])
  const ppaDisbursements = useMemo(() => disbursements.filter((d) => ppaObligations.some((o) => o.id === d.obligationId)), [disbursements, ppaObligations])
  const budget = budgets.get(ppa.budgetId)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Budget Allocations", href: "/finance/allocations" }, { label: ppa.category }, { label: ppa.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {ppa.name} <StatusBadge status={ppa.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{ppa.code}</span> · {ppa.type} · {ppa.category} · {budget?.title}
          </>
        }
        actions={
          <>
            {can("finance") && (
              <Button variant="outline" onClick={() => open({ type: "ppa", record: ppa })}>
                <Pencil /> Edit
              </Button>
            )}
            {!project && (can("finance") || can("operations")) && (
              <Button variant="outline" onClick={() => setProgressOpen(true)}>
                <Gauge /> Update progress
              </Button>
            )}
            {can("finance") && canAccess("obligations") && (
              <Button onClick={() => open({ type: "obligation", defaults: { ppaId: ppa.id } })}>
                <Plus /> New obligation
              </Button>
            )}
          </>
        }
      />

      <SectionCard title="Budget monitoring">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            ["Approved budget", ppa.approvedBudget],
            ["Revised budget", ppa.revisedBudget ?? ppa.approvedBudget],
            ["Obligated", m.obligated],
            ["Disbursed", m.disbursed],
            ["Available balance", m.available],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Money value={value as number} className="text-base font-semibold" />
            </div>
          ))}
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <p className="text-base font-semibold tabular-nums">{formatPercent(m.utilization)}</p>
            <UtilizationBar value={m.utilization} thresholds={budgetThresholds} showLabel={false} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Available = Approved − Obligated · Disbursement utilization = Disbursed ÷ Approved = {formatPercent(m.disbursementRate)}
          {m.pendingObligations > 0 && (
            <>
              {" "}
              · <Money value={m.pendingObligations} /> in obligations awaiting approval
            </>
          )}
        </p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Progress" className="lg:col-span-2">
          <DualProgress physical={physical} financial={m.disbursementRate} />
          {project && (
            <Link href={`/projects/${project.id}`} className="mt-4 flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
              <FolderKanban className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm">
                Implemented as project <span className="font-mono">{project.code}</span> · {project.contractor}
              </span>
              <StatusBadge status={project.status} />
            </Link>
          )}
        </SectionCard>
        <SectionCard title="Details">
          <DetailList
            columns={1}
            items={[
              { label: "Description", value: ppa.description },
              { label: "Fund source", value: fundSources.get(ppa.fundSourceId)?.name },
              {
                label: "Responsible committee",
                value: ppa.committeeId ? (
                  <Link href={`/governance/committees/${ppa.committeeId}`} className="hover:underline">
                    {committees.get(ppa.committeeId)?.name}
                  </Link>
                ) : undefined,
              },
              { label: "Responsible official", value: officialName(officials.get(ppa.responsibleOfficialId)) },
              { label: "Schedule", value: `${formatDate(ppa.startDate)} – ${formatDate(ppa.targetCompletion)}` },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={`Obligations (${ppaObligations.length})`}>
          {ppaObligations.length === 0 ? (
            <EmptyState compact icon={FilePen} title="No obligations yet" />
          ) : (
            <ul className="divide-y">
              {ppaObligations.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/finance/obligations/${o.id}`)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.description}</span>
                      <span className="block text-xs text-muted-foreground">
                        <span className="font-mono">{o.obligationNumber}</span> · {o.payee} · {formatDate(o.date)}
                      </span>
                    </span>
                    <Money value={o.amount} className="text-sm" />
                    <StatusBadge status={o.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title={`Disbursements (${ppaDisbursements.length})`}>
          {ppaDisbursements.length === 0 ? (
            <EmptyState compact title="No disbursements yet" />
          ) : (
            <ul className="divide-y">
              {ppaDisbursements.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/finance/disbursements/${d.id}`)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.payee}</span>
                      <span className="block text-xs text-muted-foreground">
                        <span className="font-mono">{d.voucherNumber}</span> · {formatDate(d.date)}{" "}
                        {d.referenceNumber && <TagBadge className="ml-1">{d.referenceNumber}</TagBadge>}
                      </span>
                    </span>
                    <Money value={d.amount} className="text-sm" />
                    <StatusBadge status={d.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <ProgressUpdateDialog
        open={progressOpen}
        onOpenChange={setProgressOpen}
        current={ppa.physicalProgress}
        onSave={(value) => {
          ppaActions.update(ppa.id, {
            physicalProgress: value,
            status: value >= 100 ? "Completed" : ppa.status === "Planned" || ppa.status === "Approved" ? "Ongoing" : ppa.status,
          })
          toast.success("Progress updated", { description: `${ppa.code} · ${value}%` })
        }}
      />
    </div>
  )
}
