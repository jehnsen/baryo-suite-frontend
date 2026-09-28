"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Ban, CheckCheck, HandCoins, Landmark, Plus, Printer, Receipt } from "lucide-react"
import { toast } from "sonner"
import type { Collection } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailDrawer } from "@/components/shared/detail-drawer"
import { EmptyState } from "@/components/shared/empty-state"
import { FiscalYearSelector } from "@/components/shared/fiscal-year-selector"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCollections, useCurrentUser, useLookups, useSettings } from "@/hooks/use-data"
import { useFiscalYear } from "@/hooks/use-finance"
import { usePageLoad } from "@/hooks/use-page-load"
import { COLLECTION_STATUSES, COLLECTION_TYPES, PAYMENT_METHODS, toOptions } from "@/lib/constants"
import { formatDate, formatPeso, formatPesoCompact, toISODate } from "@/lib/format"
import { collectionActions } from "@/lib/store/finance-actions"
import { CollectionReceipt } from "./collection-receipt"

const col = createAppColumnHelper<Collection>()

type Pending = { kind: "deposit"; ids: string[] } | { kind: "reconcile"; ids: string[] } | { kind: "cancel"; ids: string[] }

export function CollectionsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const load = usePageLoad()
  const collections = useCollections()
  const settings = useSettings()
  const { users } = useLookups()
  const { fiscalYear } = useFiscalYear()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canEdit = can("finance")
  const [viewId, setViewId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [reference, setReference] = useState("")
  const viewing = collections.find((c) => c.id === (viewId ?? searchParams.get("open")))

  const data = useMemo(() => collections.filter((c) => c.date.startsWith(String(fiscalYear))), [collections, fiscalYear])
  const undeposited = data.filter((c) => c.status === "Recorded")
  const stats = useMemo(() => {
    const valid = data.filter((c) => c.status !== "Cancelled")
    const today = toISODate(new Date())
    const month = today.slice(0, 7)
    return {
      ytd: valid.reduce((s, c) => s + c.amount, 0),
      today: valid.filter((c) => c.date === today).reduce((s, c) => s + c.amount, 0),
      todayCount: valid.filter((c) => c.date === today).length,
      month: valid.filter((c) => c.date.startsWith(month)).reduce((s, c) => s + c.amount, 0),
      undepositedAmount: undeposited.reduce((s, c) => s + c.amount, 0),
    }
  }, [data, undeposited])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("orNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="O.R. No." />,
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "OR Number" },
          enableHiding: false,
        }),
        col.accessor("transactionNumber", {
          header: "Transaction",
          cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>,
          meta: { label: "Transaction Number" },
        }),
        col.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        col.accessor("payerName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Payor" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-40">
              {row.original.residentId ? (
                <Link href={`/residents/${row.original.residentId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
                  {getValue()}
                </Link>
              ) : (
                <span className="font-medium">{getValue()}</span>
              )}
              {row.original.businessName && <p className="text-xs text-muted-foreground">{row.original.businessName}</p>}
            </div>
          ),
          meta: { label: "Payer" },
        }),
        col.accessor("type", {
          header: "Type",
          cell: ({ row, getValue }) => (
            <div className="min-w-40">
              <p className="whitespace-nowrap">{getValue()}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            </div>
          ),
          meta: { label: "Collection Type" },
        }),
        col.accessor("amount", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
          cell: ({ getValue }) => <Money value={getValue()} className="font-medium" />,
          meta: { label: "Amount" },
        }),
        col.accessor("paymentMethod", { header: "Method", cell: ({ getValue }) => <TagBadge>{getValue()}</TagBadge>, meta: { label: "Payment Method" } }),
        col.accessor((c) => users.get(c.collectorId)?.name ?? "—", {
          id: "collector",
          header: "Collector",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Collector" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => {
            const c = row.original
            return (
              <RowActions
                actions={[
                  { label: "View receipt", icon: Receipt, onSelect: () => setViewId(c.id) },
                  { label: "Print receipt", icon: Printer, onSelect: () => window.open(`/finance/collections/${c.id}/receipt`, "_blank") },
                  {
                    label: "Mark deposited",
                    icon: Landmark,
                    onSelect: () => setPending({ kind: "deposit", ids: [c.id] }),
                    hidden: !canEdit || c.status !== "Recorded",
                  },
                  {
                    label: "Mark reconciled",
                    icon: CheckCheck,
                    onSelect: () => setPending({ kind: "reconcile", ids: [c.id] }),
                    hidden: !canEdit || c.status !== "Deposited",
                  },
                  {
                    label: "Cancel receipt",
                    icon: Ban,
                    onSelect: () => setPending({ kind: "cancel", ids: [c.id] }),
                    destructive: true,
                    separator: true,
                    hidden: !canEdit || c.status === "Cancelled" || c.status === "Reconciled",
                  },
                ]}
              />
            )
          },
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [users, canEdit],
  )

  const filters: DataTableFilter<Collection>[] = useMemo(
    () => [
      { id: "type", label: "Type", options: toOptions(COLLECTION_TYPES), getValue: (c) => c.type },
      { id: "method", label: "Method", options: toOptions(PAYMENT_METHODS), getValue: (c) => c.paymentMethod },
      { id: "status", label: "Status", options: toOptions(COLLECTION_STATUSES), getValue: (c) => c.status },
    ],
    [],
  )

  const pendingCopy =
    pending &&
    {
      deposit: {
        title: "Mark as deposited?",
        confirm: "Mark deposited",
        field: "Deposit slip / reference no.",
        placeholder: `LBP-DS-${toISODate(new Date()).replace(/-/g, "")}`,
      },
      reconcile: { title: "Mark as reconciled?", confirm: "Reconcile", field: "Bank statement reference (optional)", placeholder: "e.g. BS-2026-09" },
      cancel: { title: "Cancel receipt?", confirm: "Cancel receipt", field: "Reason", placeholder: "e.g. Spoiled O.R. – wrong amount" },
    }[pending.kind]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Official receipts for barangay fees, clearances and charges."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Collections" }]}
        actions={
          <>
            <FiscalYearSelector />
            {canEdit && undeposited.length > 0 && (
              <Button variant="outline" onClick={() => setPending({ kind: "deposit", ids: undeposited.map((c) => c.id) })}>
                <Landmark /> Deposit {undeposited.length} undeposited
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => open({ type: "collection" })}>
                <Plus /> Record collection
              </Button>
            )}
          </>
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Collections YTD" value={formatPesoCompact(stats.ytd)} icon={HandCoins} hint={formatPeso(stats.ytd)} />
          <StatCard label="This month" value={formatPesoCompact(stats.month)} hint="All collection types" />
          <StatCard label="Today" value={formatPeso(stats.today)} hint={`${stats.todayCount} receipts`} />
          <StatCard label="Undeposited" value={formatPesoCompact(stats.undepositedAmount)} hint={`${undeposited.length} receipts on hand`} />
        </div>
      )}
      <ContentTabs
        tabs={[
          {
            value: "all",
            label: "All collections",
            content: (
              <DataTable
                columns={columns}
                data={load.demoEmpty ? [] : data}
                getRowId={(c) => c.id}
                status={load.status}
                onRetry={load.retry}
                search={{
                  placeholder: "Search O.R. no., payor, business…",
                  getText: (c) => `${c.orNumber} ${c.transactionNumber} ${c.payerName} ${c.businessName ?? ""} ${c.description}`,
                }}
                filters={filters}
                dateFilter={{ getDate: (c) => c.date }}
                onRowClick={(c) => setViewId(c.id)}
                initialSorting={[{ id: "date", desc: true }]}
                initialVisibility={{ transactionNumber: false, collector: false }}
                empty={{ icon: HandCoins, title: `No collections for FY ${fiscalYear}` }}
              />
            ),
          },
          { value: "daily", label: "Daily summary", content: <DailySummary collections={data} /> },
        ]}
      />

      <DetailDrawer
        open={Boolean(viewing)}
        onOpenChange={(o) => {
          if (!o) {
            setViewId(null)
            if (searchParams.get("open")) router.replace("/finance/collections")
          }
        }}
        title={viewing ? `Receipt ${viewing.orNumber}` : ""}
        meta={viewing && <StatusBadge status={viewing.status} />}
        description={viewing?.depositReference ? `Deposited under ${viewing.depositReference}` : undefined}
        footer={
          viewing && (
            <Button asChild>
              <Link href={`/finance/collections/${viewing.id}/receipt`} target="_blank">
                <Printer /> Print receipt
              </Link>
            </Button>
          )
        }
      >
        {viewing && <CollectionReceipt collection={viewing} settings={settings} collector={users.get(viewing.collectorId)} />}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null)
            setReference("")
          }
        }}
        title={pendingCopy?.title ?? ""}
        description={
          pending &&
          `${pending.ids.length} receipt${pending.ids.length > 1 ? "s" : ""} · ${formatPeso(collections.filter((c) => pending.ids.includes(c.id)).reduce((s, c) => s + c.amount, 0))}`
        }
        confirmLabel={pendingCopy?.confirm}
        destructive={pending?.kind === "cancel"}
        confirmDisabled={pending?.kind !== "reconcile" && !reference.trim()}
        onConfirm={() => {
          if (!pending) return
          if (pending.kind === "deposit") collectionActions.setStatus(pending.ids, "Deposited", { depositReference: reference.trim() })
          if (pending.kind === "reconcile") collectionActions.setStatus(pending.ids, "Reconciled", { reason: reference.trim() || undefined })
          if (pending.kind === "cancel") collectionActions.setStatus(pending.ids, "Cancelled", { reason: reference.trim() })
          toast.success(pending.kind === "deposit" ? "Collections deposited" : pending.kind === "reconcile" ? "Collections reconciled" : "Receipt cancelled")
          setReference("")
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="collection-ref">{pendingCopy?.field}</Label>
          <Input id="collection-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={pendingCopy?.placeholder} />
        </div>
      </ConfirmDialog>
    </div>
  )
}

/** End-of-day report of collections by type and payment method. */
function DailySummary({ collections }: { collections: Collection[] }) {
  const [date, setDate] = useState(toISODate(new Date()))
  const { users } = useLookups()
  const day = collections.filter((c) => c.date === date && c.status !== "Cancelled")
  const byType = COLLECTION_TYPES.map((t) => ({ t, list: day.filter((c) => c.type === t) })).filter((x) => x.list.length)
  const byMethod = PAYMENT_METHODS.map((m) => ({ m, list: day.filter((c) => c.paymentMethod === m) })).filter((x) => x.list.length)
  const total = day.reduce((s, c) => s + c.amount, 0)
  const lastWithData = collections.find((c) => c.status !== "Cancelled")?.date

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="summary-date">Collection date</Label>
          <Input id="summary-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setDate(toISODate(new Date()))}>
          Today
        </Button>
        {lastWithData && lastWithData !== date && (
          <Button variant="ghost" size="sm" onClick={() => setDate(lastWithData)}>
            Latest with collections ({formatDate(lastWithData)})
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer /> Print summary
        </Button>
      </div>
      {day.length === 0 ? (
        <SectionCard>
          <EmptyState compact icon={HandCoins} title={`No collections on ${formatDate(date, "MMMM d, yyyy")}`} />
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title={`Report of Collections · ${formatDate(date, "MMMM d, yyyy")}`}
            description={`${day.length} receipts`}
            className="lg:col-span-2"
            contentClassName="px-0"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs">O.R. No.</TableHead>
                  <TableHead className="text-xs">Payor</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Collector</TableHead>
                  <TableHead className="pr-4 text-right text-xs">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {day.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4 font-mono text-xs">{c.orNumber}</TableCell>
                    <TableCell>{c.payerName}</TableCell>
                    <TableCell className="text-muted-foreground">{c.type}</TableCell>
                    <TableCell className="text-muted-foreground">{users.get(c.collectorId)?.name}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <Money value={c.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="pl-4 font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Money value={total} className="font-semibold" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </SectionCard>
          <div className="space-y-4">
            <SectionCard title="By collection type">
              <ul className="space-y-2 text-sm">
                {byType.map(({ t, list }) => (
                  <li key={t} className="flex justify-between gap-2">
                    <span>
                      {t} <span className="text-muted-foreground">({list.length})</span>
                    </span>
                    <Money value={list.reduce((s, c) => s + c.amount, 0)} />
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="By payment method">
              <ul className="space-y-2 text-sm">
                {byMethod.map(({ m, list }) => (
                  <li key={m} className="flex justify-between gap-2">
                    <span>
                      {m} <span className="text-muted-foreground">({list.length})</span>
                    </span>
                    <Money value={list.reduce((s, c) => s + c.amount, 0)} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
