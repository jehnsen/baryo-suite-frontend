"use client"

import Link from "next/link"
import { Banknote, Pencil } from "lucide-react"
import type { Obligation } from "@/types"
import { Button } from "@/components/ui/button"
import { ApprovalTimeline } from "@/components/shared/approval-timeline"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { WorkflowActions } from "@/components/shared/workflow-actions"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useDisbursements, useLookups, useObligations } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatPeso, officialName } from "@/lib/format"
import { obligationActions } from "@/lib/store/finance-actions"
import { OBLIGATION_WORKFLOW } from "@/lib/workflows"

export function ObligationDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const obligation = useObligations().find((o) => o.id === id)
  return (
    <LoadState load={load}>
      {obligation ? (
        <ObligationDetailContent o={obligation} />
      ) : (
        <RecordNotFound entity="Obligation" backHref="/finance/obligations" backLabel="Back to obligations" />
      )}
    </LoadState>
  )
}

function ObligationDetailContent({ o }: { o: Obligation }) {
  const { ppas, fundSources, officials, users } = useLookups()
  const ledger = useLedger()
  const disbursements = useDisbursements().filter((d) => d.obligationId === o.id)
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const ppa = ppas.get(o.ppaId)
  const disbursed = ledger.disbursedForObligation(o.id)
  const ppaMetrics = ppa ? ledger.forPPA(ppa) : undefined
  const canPay = can("finance") && (o.status === "Approved" || o.status === "Partially Disbursed") && disbursed < o.amount

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Obligations", href: "/finance/obligations" }, { label: o.obligationNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {o.payee} <StatusBadge status={o.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{o.obligationNumber}</span> · {formatDate(o.date, "MMMM d, yyyy")} · <Money value={o.amount} />
          </>
        }
        actions={
          <>
            {can("finance") && (o.status === "Draft" || o.status === "For Review") && (
              <Button variant="outline" onClick={() => open({ type: "obligation", record: o })}>
                <Pencil /> Edit
              </Button>
            )}
            <WorkflowActions
              workflow={OBLIGATION_WORKFLOW}
              status={o.status}
              recordLabel={`${o.obligationNumber} · ${formatPeso(o.amount)}`}
              disabledReason={(t) =>
                t.to === "Approved" && o.attachments.length === 0
                  ? "Attach supporting documents first"
                  : t.to === "Cancelled" && disbursed > 0
                    ? "Already partially disbursed"
                    : undefined
              }
              onTransition={(to, v) => obligationActions.transition(o.id, to, v.remarks)}
            />
            {canPay && (
              <Button onClick={() => open({ type: "disbursement", defaults: { obligationId: o.id } })}>
                <Banknote /> Prepare disbursement
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Obligation">
            <DetailList
              items={[
                { label: "Particulars", value: o.description, full: true },
                { label: "Amount", value: <Money value={o.amount} className="font-semibold" /> },
                { label: "Disbursed", value: <Money value={disbursed} /> },
                { label: "Undisbursed balance", value: <Money value={o.amount - disbursed} /> },
                { label: "Requested by", value: officialName(officials.get(o.requestedById)) },
                { label: "Fund source", value: fundSources.get(o.fundSourceId)?.name },
              ]}
            />
            <UtilizationBar value={(disbursed / o.amount) * 100} tone="success" className="mt-4" />
          </SectionCard>
          <SectionCard title="Charged to">
            {ppa && ppaMetrics ? (
              <Link href={`/ppas/${ppa.id}`} className="block rounded-lg border p-3 hover:bg-muted/40">
                <p className="font-medium">{ppa.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{ppa.code}</span> · {ppa.category}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <span>
                    Approved <Money value={ppaMetrics.approved} className="block text-sm font-medium" />
                  </span>
                  <span>
                    Obligated <Money value={ppaMetrics.obligated} className="block text-sm font-medium" />
                  </span>
                  <span>
                    Available <Money value={ppaMetrics.available} className="block text-sm font-medium" />
                  </span>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">PPA not found.</p>
            )}
          </SectionCard>
          <SectionCard title={`Disbursements (${disbursements.length})`}>
            {disbursements.length === 0 ? (
              <EmptyState compact icon={Banknote} title="No disbursements yet" />
            ) : (
              <ul className="divide-y">
                {disbursements.map((d) => (
                  <li key={d.id}>
                    <Link href={`/finance/disbursements/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-mono">{d.voucherNumber}</span>{" "}
                        <span className="text-muted-foreground">
                          · {formatDate(d.date)} · {d.referenceNumber ?? d.paymentMethod}
                        </span>
                      </span>
                      <Money value={d.amount} className="text-sm" />
                      <StatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Supporting documents">
            <AttachmentsPanel
              attachments={o.attachments}
              required={o.status === "Draft" || o.status === "For Review"}
              onAdd={can("finance") && o.status !== "Cancelled" ? (files) => obligationActions.addAttachments(o.id, files) : undefined}
            />
          </SectionCard>
        </div>
        <SectionCard title="Approval timeline" className="h-fit">
          <ApprovalTimeline workflow={OBLIGATION_WORKFLOW} status={o.status} history={o.history} users={users} />
        </SectionCard>
      </div>
    </div>
  )
}
