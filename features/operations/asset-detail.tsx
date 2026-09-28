"use client"

import Link from "next/link"
import { useState } from "react"
import { Activity, QrCode, Trash2, UserRoundCog, Wrench } from "lucide-react"
import { toast } from "sonner"
import type { Asset } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Timeline } from "@/components/shared/timeline"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAssets, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, fullName, officialName } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { assetActions } from "@/lib/store/operations-actions"
import { AssignAssetDialog, ConditionDialog, MaintenanceDialog } from "./asset-dialogs"

export function AssetDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const asset = useAssets().find((a) => a.id === id)
  return <LoadState load={load}>{asset ? <Content a={asset} /> : <RecordNotFound entity="Asset" backHref="/assets" backLabel="Back to assets" />}</LoadState>
}

function Content({ a }: { a: Asset }) {
  const { officials, users, disbursements } = useLookups()
  const { open } = useEntityDialogs()
  const { can, canAccess } = useCurrentUser()
  const [dialog, setDialog] = useState<"assign" | "condition" | "maintenance" | "dispose" | null>(null)
  const [reason, setReason] = useState("")
  const canEdit = can("operations") && a.status !== "Disposed"
  const custodian = officials.get(a.custodianId)
  const dv = a.disbursementId ? disbursements.get(a.disbursementId) : undefined
  const maintenanceCost = a.maintenance.reduce((s, m) => s + m.cost, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: a.assetNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {a.name} <StatusBadge status={a.status} /> <StatusBadge status={a.condition} showDot={false} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{a.assetNumber}</span> · {a.category}
          </>
        }
        actions={
          canEdit && (
            <>
              <Button variant="outline" onClick={() => setDialog("dispose")}>
                <Trash2 /> Dispose
              </Button>
              <Button variant="outline" onClick={() => open({ type: "asset", record: a })}>
                Edit
              </Button>
              <Button variant="outline" onClick={() => setDialog("condition")}>
                <Activity /> Record condition
              </Button>
              <Button variant="outline" onClick={() => setDialog("maintenance")}>
                <Wrench /> Maintenance
              </Button>
              <Button onClick={() => setDialog("assign")}>
                <UserRoundCog /> Assign
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Asset information">
            <DetailList
              columns={3}
              items={[
                { label: "Asset number", value: <span className="font-mono">{a.assetNumber}</span> },
                { label: "Serial / plate no.", value: a.serialNumber },
                { label: "Category", value: a.category },
                { label: "Acquisition date", value: formatDate(a.acquisitionDate, "MMMM d, yyyy") },
                { label: "Acquisition cost", value: <Money value={a.acquisitionCost} /> },
                { label: "Source", value: a.source },
                {
                  label: "Paid through",
                  value: dv ? (
                    canAccess("disbursements") ? (
                      <Link href={`/finance/disbursements/${dv.id}`} className="font-mono text-xs hover:underline">
                        {dv.voucherNumber}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{dv.voucherNumber}</span>
                    )
                  ) : undefined,
                },
                { label: "Location", value: a.location },
                { label: "Maintenance spend", value: <Money value={maintenanceCost} /> },
                { label: "Description", value: a.description, full: true },
              ]}
            />
          </SectionCard>
          <SectionCard title={`Maintenance history (${a.maintenance.length})`} contentClassName="px-0">
            {a.maintenance.length === 0 ? (
              <EmptyState compact icon={Wrench} title="No maintenance recorded" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Work done</TableHead>
                    <TableHead className="text-xs">By</TableHead>
                    <TableHead className="pr-4 text-right text-xs">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.maintenance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4 whitespace-nowrap">{formatDate(m.date)}</TableCell>
                      <TableCell>{m.type}</TableCell>
                      <TableCell className="whitespace-normal">{m.description}</TableCell>
                      <TableCell className="text-muted-foreground">{m.performedBy}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Money value={m.cost} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
          <SectionCard title="Attachments">
            <AttachmentsPanel
              attachments={a.attachments}
              emptyLabel="No PAR/ICS or photos attached"
              onAdd={canEdit ? (files) => assetActions.addAttachments(a.id, files) : undefined}
            />
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Custodian">
            <div className="flex items-center gap-3">
              <PersonAvatar name={fullName(custodian)} size="md" />
              <div>
                <Link href={`/officials/${a.custodianId}`} className="text-sm font-medium hover:underline">
                  {officialName(custodian, true)}
                </Link>
                <p className="text-xs text-muted-foreground">{custodian?.position}</p>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Asset tag">
            <div className="flex items-center gap-4">
              <div
                className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground"
                aria-label="QR code placeholder"
              >
                <QrCode className="size-8" />
                <span className="text-[10px]">QR placeholder</span>
              </div>
              <p className="text-xs text-muted-foreground">
                QR tags encoding <span className="font-mono">{a.assetNumber}</span> will be printable once asset tagging is enabled.
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Condition history">
            <Timeline
              items={[...a.conditionHistory].reverse().map((c, i) => ({
                id: `${c.date}-${i}`,
                title: c.condition,
                tone: toneFor(c.condition),
                timestamp: formatDate(c.date),
                description: [c.remarks, users.get(c.byUserId)?.name].filter(Boolean).join(" · "),
              }))}
            />
          </SectionCard>
        </div>
      </div>

      <AssignAssetDialog asset={a} open={dialog === "assign"} onOpenChange={(o) => !o && setDialog(null)} />
      <ConditionDialog asset={a} open={dialog === "condition"} onOpenChange={(o) => !o && setDialog(null)} />
      <MaintenanceDialog asset={a} open={dialog === "maintenance"} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === "dispose"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null)
            setReason("")
          }
        }}
        title="Dispose asset?"
        description={`${a.assetNumber} will be marked Disposed and removed from the in-service count.`}
        confirmLabel="Dispose"
        destructive
        confirmDisabled={!reason.trim()}
        onConfirm={() => {
          assetActions.dispose(a.id, reason.trim())
          toast.success("Asset disposed", { description: a.assetNumber })
          setReason("")
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="dispose-reason">
            Reason / reference (IIRUP) <span className="text-destructive">*</span>
          </Label>
          <Input id="dispose-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Beyond economic repair – IIRUP No. 2026-03" />
        </div>
      </ConfirmDialog>
    </div>
  )
}
