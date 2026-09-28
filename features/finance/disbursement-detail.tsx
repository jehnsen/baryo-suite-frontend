"use client"

import Link from "next/link"
import { Pencil, Receipt } from "lucide-react"
import type { Disbursement } from "@/types"
import { Button } from "@/components/ui/button"
import { ApprovalTimeline } from "@/components/shared/approval-timeline"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { DetailList } from "@/components/shared/detail-list"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { WorkflowActions } from "@/components/shared/workflow-actions"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useDisbursements, useExpenses, useLookups } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatPeso } from "@/lib/format"
import { disbursementActions } from "@/lib/store/finance-actions"
import { DISBURSEMENT_WORKFLOW } from "@/lib/workflows"

export function DisbursementDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const d = useDisbursements().find((x) => x.id === id)
  return (
    <LoadState load={load}>
      {d ? <DisbursementDetailContent d={d} /> : <RecordNotFound entity="Disbursement" backHref="/finance/disbursements" backLabel="Back to disbursements" />}
    </LoadState>
  )
}

function DisbursementDetailContent({ d }: { d: Disbursement }) {
  const { obligations, fundSources, users } = useLookups()
  const ledger = useLedger()
  const expense = useExpenses().find((e) => e.disbursementId === d.id)
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const obligation = obligations.get(d.obligationId)
  const ppa = ledger.ppaOfObligation(d.obligationId)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Disbursements", href: "/finance/disbursements" }, { label: d.voucherNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {d.payee} <StatusBadge status={d.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{d.voucherNumber}</span> · {d.disbursementNumber} · <Money value={d.amount} />
          </>
        }
        actions={
          <>
            {can("finance") && (d.status === "Draft" || d.status === "For Review") && (
              <Button variant="outline" onClick={() => open({ type: "disbursement", record: d })}>
                <Pencil /> Edit
              </Button>
            )}
            <WorkflowActions
              workflow={DISBURSEMENT_WORKFLOW}
              status={d.status}
              recordLabel={`${d.voucherNumber} · ${formatPeso(d.amount)}`}
              disabledReason={(t) =>
                ["For Approval", "Approved", "Released"].includes(t.to) && d.attachments.length === 0 ? "Attach supporting documents first" : undefined
              }
              onTransition={(to, v) => disbursementActions.transition(d.id, to, v.remarks, { referenceNumber: v.referenceNumber })}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Voucher">
            <DetailList
              items={[
                { label: "Particulars", value: d.remarks, full: true },
                { label: "Amount", value: <Money value={d.amount} className="font-semibold" /> },
                { label: "Date", value: formatDate(d.date, "MMMM d, yyyy") },
                { label: "Payment method", value: d.paymentMethod },
                { label: "Check / reference no.", value: d.referenceNumber },
                { label: "Fund source", value: fundSources.get(d.fundSourceId)?.name },
                {
                  label: "Related obligation",
                  value: obligation ? (
                    <Link href={`/finance/obligations/${obligation.id}`} className="hover:underline">
                      <span className="font-mono">{obligation.obligationNumber}</span> · <Money value={obligation.amount} />
                    </Link>
                  ) : undefined,
                },
                {
                  label: "PPA",
                  value: ppa ? (
                    <Link href={`/ppas/${ppa.id}`} className="hover:underline">
                      {ppa.code} · {ppa.name}
                    </Link>
                  ) : undefined,
                },
              ]}
            />
          </SectionCard>
          {expense && (
            <SectionCard title="Expense record">
              <Link href="/finance/expenses" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <Receipt className="size-4 text-muted-foreground" />
                <span className="flex-1 text-sm">
                  <span className="font-mono">{expense.expenseNumber}</span> recorded {formatDate(expense.date)} under {expense.category}
                </span>
                <Money value={expense.amount} />
              </Link>
            </SectionCard>
          )}
          <SectionCard title="Supporting documents">
            <AttachmentsPanel
              attachments={d.attachments}
              required={!["Released", "Cancelled"].includes(d.status)}
              onAdd={can("finance") && d.status !== "Cancelled" ? (files) => disbursementActions.addAttachments(d.id, files) : undefined}
            />
          </SectionCard>
        </div>
        <SectionCard title="Approval timeline" className="h-fit">
          <ApprovalTimeline workflow={DISBURSEMENT_WORKFLOW} status={d.status} history={d.history} users={users} />
        </SectionCard>
      </div>
    </div>
  )
}
