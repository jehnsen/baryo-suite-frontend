"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Pencil, Plus, SlidersHorizontal, TriangleAlert } from "lucide-react"
import type { InventoryTransaction, InventoryTransactionType } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailDrawer } from "@/components/shared/detail-drawer"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { UtilizationBar } from "@/components/shared/progress-metric"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { Timeline } from "@/components/shared/timeline"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useCurrentUser, useInventoryTransactions, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { INVENTORY_CATEGORIES, toOptions } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { InventoryTransactionDialog } from "./inventory-dialogs"
import { signedQuantity, useStockLevels, type StockLevel } from "./use-inventory"

const itemCol = createAppColumnHelper<StockLevel>()
const txCol = createAppColumnHelper<InventoryTransaction>()

export function InventoryView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const load = usePageLoad()
  const stock = useStockLevels()
  const transactions = useInventoryTransactions()
  const { users } = useLookups()
  const { can } = useCurrentUser()
  const canEdit = can("operations")
  const [viewId, setViewId] = useState<string | null>(null)
  const [tx, setTx] = useState<{ item: StockLevel; type: InventoryTransactionType } | null>(null)
  const { open } = useEntityDialogs()
  const viewing = stock.find((s) => s.id === (viewId ?? searchParams.get("open")))
  const low = stock.filter((s) => s.stockStatus !== "In Stock")
  const itemById = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock])

  const columns = useMemo(
    () =>
      itemCol.columns([
        itemCol.accessor("code", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium">{getValue()}</span>,
          meta: { label: "Item Code" },
          enableHiding: false,
        }),
        itemCol.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
          cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Item Name" },
        }),
        itemCol.accessor("category", {
          header: "Category",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Category" },
        }),
        itemCol.accessor("onHand", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="On hand" />,
          cell: ({ row, getValue }) => (
            <span className="font-medium tabular-nums">
              {getValue()} <span className="text-xs font-normal text-muted-foreground">{row.original.unit}</span>
            </span>
          ),
          meta: { label: "Quantity Available" },
        }),
        itemCol.accessor("reorderLevel", {
          header: "Reorder at",
          cell: ({ getValue }) => <span className="text-muted-foreground tabular-nums">{getValue()}</span>,
          meta: { label: "Reorder Level" },
        }),
        itemCol.accessor((s) => (s.reorderLevel ? (s.onHand / (s.reorderLevel * 3)) * 100 : 100), {
          id: "level",
          header: "Stock level",
          cell: ({ row, getValue }) => (
            <UtilizationBar
              value={getValue()}
              tone={row.original.stockStatus === "In Stock" ? "success" : row.original.stockStatus === "Low Stock" ? "warning" : "danger"}
              showLabel={false}
              className="w-24"
            />
          ),
          meta: { label: "Stock level" },
        }),
        itemCol.accessor("location", {
          header: "Location",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Storage Location" },
        }),
        itemCol.accessor("lastUpdated", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Last updated" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Last Updated" },
        }),
        itemCol.accessor("stockStatus", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Stock Status" } }),
        itemCol.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "Stock in", icon: ArrowDownToLine, onSelect: () => setTx({ item: row.original, type: "Stock In" }), hidden: !canEdit },
                {
                  label: "Stock out",
                  icon: ArrowUpFromLine,
                  onSelect: () => setTx({ item: row.original, type: "Stock Out" }),
                  hidden: !canEdit || row.original.onHand <= 0,
                },
                { label: "Adjustment", icon: SlidersHorizontal, onSelect: () => setTx({ item: row.original, type: "Adjustment" }), hidden: !canEdit },
                { label: "Edit item", icon: Pencil, onSelect: () => open({ type: "inventoryItem", record: row.original }), hidden: !canEdit, separator: true },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [canEdit, open],
  )

  const txColumns = useMemo(
    () =>
      txCol.columns([
        txCol.accessor("date", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Date" },
        }),
        txCol.accessor((t) => itemById.get(t.itemId)?.name ?? "—", {
          id: "item",
          header: "Item",
          cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Item" },
        }),
        txCol.accessor("type", { header: "Type", cell: ({ getValue }) => <StatusBadge status={getValue()} showDot={false} />, meta: { label: "Type" } }),
        txCol.accessor((t) => signedQuantity(t), {
          id: "qty",
          header: "Quantity",
          cell: ({ row, getValue }) => (
            <span className="tabular-nums">
              {getValue() > 0 ? "+" : ""}
              {getValue()} {itemById.get(row.original.itemId)?.unit}
            </span>
          ),
          meta: { label: "Quantity" },
        }),
        txCol.accessor((t) => t.issuedTo ?? t.reference ?? t.remarks ?? "", {
          id: "details",
          header: "Details",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-72 text-muted-foreground">{getValue()}</span>,
          meta: { label: "Details" },
        }),
        txCol.accessor((t) => users.get(t.byUserId)?.name ?? "—", {
          id: "by",
          header: "By",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Recorded by" },
        }),
      ]),
    [itemById, users],
  )

  const filters: DataTableFilter<StockLevel>[] = useMemo(
    () => [
      { id: "category", label: "Category", options: toOptions(INVENTORY_CATEGORIES), getValue: (s) => s.category },
      { id: "status", label: "Stock status", options: toOptions(["In Stock", "Low Stock", "Out of Stock"]), getValue: (s) => s.stockStatus },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Consumable supplies. Quantities are computed from stock transactions."
        breadcrumbs={[{ label: "Operations" }, { label: "Inventory" }]}
        actions={
          canEdit && (
            <Button onClick={() => open({ type: "inventoryItem" })}>
              <Plus /> Add item
            </Button>
          )
        }
      />
      {!load.isLoading && low.length > 0 && (
        <Alert className="border-[var(--tone-warning)]/40">
          <TriangleAlert className="text-[var(--tone-warning)]" />
          <AlertTitle>
            {low.length} item{low.length > 1 ? "s" : ""} at or below reorder level
          </AlertTitle>
          <AlertDescription>{low.map((s) => `${s.name} (${s.onHand} ${s.unit})`).join(" · ")}</AlertDescription>
        </Alert>
      )}
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Items tracked" value={stock.length} icon={Boxes} />
          <StatCard label="Low / out of stock" value={low.length} />
          <StatCard label="Transactions this month" value={transactions.filter((t) => t.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} />
          <StatCard
            label="Relief supplies on hand"
            value={stock.filter((s) => s.category === "Relief Supplies").reduce((sum, s) => sum + s.onHand, 0)}
            hint="Units across relief items"
          />
        </div>
      )}
      <ContentTabs
        tabs={[
          {
            value: "items",
            label: "Items",
            count: stock.length,
            content: (
              <DataTable
                columns={columns}
                data={load.demoEmpty ? [] : stock}
                getRowId={(s) => s.id}
                status={load.status}
                onRetry={load.retry}
                search={{ placeholder: "Search item code or name…", getText: (s) => `${s.code} ${s.name} ${s.location}` }}
                filters={filters}
                onRowClick={(s) => setViewId(s.id)}
                initialSorting={[{ id: "code", desc: false }]}
                initialVisibility={{ location: false }}
                pageSize={20}
                empty={{ icon: Boxes, title: "No inventory items" }}
              />
            ),
          },
          {
            value: "transactions",
            label: "Transaction history",
            content: (
              <DataTable
                columns={txColumns}
                data={load.demoEmpty ? [] : transactions}
                getRowId={(t) => t.id}
                status={load.status}
                onRetry={load.retry}
                search={{
                  placeholder: "Search item, recipient, reference…",
                  getText: (t) => `${itemById.get(t.itemId)?.name ?? ""} ${t.issuedTo ?? ""} ${t.reference ?? ""} ${t.remarks ?? ""}`,
                }}
                filters={[
                  { id: "type", label: "Type", options: toOptions(["Stock In", "Stock Out", "Adjustment"]), getValue: (t: InventoryTransaction) => t.type },
                ]}
                dateFilter={{ getDate: (t) => t.date }}
                initialSorting={[{ id: "date", desc: true }]}
                pageSize={20}
                empty={{ title: "No transactions" }}
              />
            ),
          },
        ]}
      />

      <DetailDrawer
        open={Boolean(viewing)}
        onOpenChange={(o) => {
          if (!o) {
            setViewId(null)
            if (searchParams.get("open")) router.replace("/inventory")
          }
        }}
        title={viewing?.name}
        description={viewing && <span className="font-mono">{viewing.code}</span>}
        meta={
          viewing && (
            <>
              <StatusBadge status={viewing.stockStatus} />
              <TagBadge>{viewing.category}</TagBadge>
            </>
          )
        }
        footer={
          viewing &&
          canEdit && (
            <>
              <Button variant="outline" onClick={() => setTx({ item: viewing, type: "Adjustment" })}>
                Adjust
              </Button>
              <Button variant="outline" disabled={viewing.onHand <= 0} onClick={() => setTx({ item: viewing, type: "Stock Out" })}>
                Stock out
              </Button>
              <Button onClick={() => setTx({ item: viewing, type: "Stock In" })}>Stock in</Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            <DetailList
              items={[
                { label: "On hand", value: `${viewing.onHand} ${viewing.unit}` },
                { label: "Reorder level", value: `${viewing.reorderLevel} ${viewing.unit}` },
                { label: "Storage location", value: viewing.location },
                { label: "Last updated", value: formatDate(viewing.lastUpdated) },
              ]}
            />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Transactions</h3>
              <Timeline
                items={viewing.transactions.slice(0, 15).map((t) => ({
                  id: t.id,
                  title: `${t.type} · ${signedQuantity(t) > 0 ? "+" : ""}${signedQuantity(t)} ${viewing.unit}`,
                  tone: toneFor(t.type),
                  timestamp: formatDate(t.date),
                  description: [t.issuedTo && `to ${t.issuedTo}`, t.reference, t.remarks, users.get(t.byUserId)?.name].filter(Boolean).join(" · "),
                }))}
              />
            </div>
          </>
        )}
      </DetailDrawer>

      <InventoryTransactionDialog item={tx?.item ?? null} type={tx?.type ?? "Stock In"} open={Boolean(tx)} onOpenChange={(o) => !o && setTx(null)} />
    </div>
  )
}
