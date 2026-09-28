import type { Asset, InventoryTransaction } from "@/types"
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, INVENTORY_CATEGORIES } from "@/lib/constants"
import { formatPesoCompact, officialName } from "@/lib/format"
import { signedQuantity, type StockLevel } from "@/lib/inventory"
import { countBy, percent, sum, sumBy, yearOf } from "@/lib/reports/metrics"
import { defineReport, type ReportColumn, type ReportFilterSpec } from "@/lib/reports/types"

/* Assets & Inventory — asset registry and stock levels (on hand is summed from transactions). */

const af = {
  search: { id: "search", label: "Asset no., name or serial", getText: (a) => `${a.assetNumber} ${a.name} ${a.serialNumber ?? ""}` },
  category: { id: "category", options: ASSET_CATEGORIES, get: (a) => a.category },
  condition: { id: "condition", get: (a) => a.condition },
  status: { id: "status", options: ASSET_STATUSES, get: (a) => a.status },
  inService: { id: "status", options: ASSET_STATUSES, get: (a) => a.status, defaultValues: ["Active", "In Storage", "Under Maintenance"] },
  custodian: { id: "official", label: "Custodian", get: (a) => a.custodianId },
  acquired: { id: "dateRange", label: "Acquisition date", getDate: (a) => a.acquisitionDate },
} satisfies Record<string, ReportFilterSpec<Asset>>

const ac = {
  number: { id: "assetNumber", header: "Asset No.", format: "mono", value: (a) => a.assetNumber, total: "count" },
  name: { id: "name", header: "Asset", value: (a) => a.name, detail: (a) => a.serialNumber },
  category: { id: "category", header: "Category", value: (a) => a.category },
  acquired: { id: "acquisitionDate", header: "Acquisition Date", format: "date", value: (a) => a.acquisitionDate },
  cost: { id: "cost", header: "Cost", format: "peso", value: (a) => a.acquisitionCost, total: "sum" },
  custodian: { id: "custodian", header: "Custodian", value: (a, d) => officialName(d.by.official.get(a.custodianId)) },
  location: { id: "location", header: "Location", value: (a) => a.location },
  condition: { id: "condition", header: "Condition", format: "status", value: (a) => a.condition },
  source: { id: "source", header: "Funding Source", value: (a) => a.source },
  status: { id: "status", header: "Status", format: "status", value: (a) => a.status },
} satisfies Record<string, ReportColumn<Asset>>

const assetLink = { module: "assets" as const, href: (a: Asset) => `/assets/${a.id}` }
const byNumber = (list: Asset[]) => [...list].sort((a, b) => a.assetNumber.localeCompare(b.assetNumber))

const NEEDS_ATTENTION = ["Poor", "For Repair", "Unserviceable"]

export const assetRegistry = defineReport<Asset>({
  id: "asset-registry",
  title: "Asset Registry",
  description: "Property register with acquisition cost, custodian, location, condition and status.",
  section: "assets",
  slug: "assets",
  source: (d) => byNumber(d.assets),
  filters: [af.search, af.category, af.condition, af.inService, af.custodian, af.acquired],
  rowId: (a) => a.id,
  columns: [ac.number, ac.name, ac.category, ac.acquired, ac.cost, ac.custodian, ac.location, ac.condition, ac.status],
  summary: (items) => [
    { label: "Assets", value: items.length },
    { label: "Acquisition cost", value: sum(items, (a) => a.acquisitionCost), format: "peso" },
    {
      label: "Need attention",
      value: items.filter((a) => NEEDS_ATTENTION.includes(a.condition)).length,
      tone: "warning",
      hint: "Poor, for repair or unserviceable",
    },
    { label: "Under maintenance", value: items.filter((a) => a.status === "Under Maintenance").length },
  ],
  groupings: [
    { id: "category", label: "Category", by: (a) => a.category, order: ASSET_CATEGORIES },
    { id: "location", label: "Location", by: (a) => a.location },
  ],
  rowLink: assetLink,
  orientation: "landscape",
})

type ConditionRow = { condition: string; count: number; cost: number; share: number }

export const assetsByCondition = defineReport<Asset, ConditionRow>({
  id: "assets-by-condition",
  title: "Assets by Condition",
  description: "How many assets are in each condition, and their acquisition cost.",
  section: "assets",
  slug: "assets",
  source: (d) => d.assets,
  filters: [af.category, af.inService, af.custodian],
  rows: (items) =>
    ASSET_CONDITIONS.map((condition) => {
      const list = items.filter((a) => a.condition === condition)
      return { condition, count: list.length, cost: sum(list, (a) => a.acquisitionCost), share: percent(list.length, items.length) }
    }),
  rowId: (r) => r.condition,
  columns: [
    { id: "condition", header: "Condition", format: "status", value: (r) => r.condition },
    { id: "count", header: "Assets", format: "number", value: (r) => r.count, total: "sum" },
    { id: "cost", header: "Acquisition Cost", format: "peso", value: (r) => r.cost, total: "sum" },
    { id: "share", header: "% of Assets", format: "progress", value: (r) => r.share },
  ],
  summary: (_items, rows) => rows.map((r) => ({ label: r.condition, value: r.count, hint: `${r.share.toFixed(0)}% of assets` })),
  charts: [
    {
      type: "bar",
      title: "Assets by condition",
      wide: true,
      seriesName: "Assets",
      data: ({ rows }) => rows.map((r) => ({ label: r.condition, value: r.count })),
    },
  ],
})

export const assetCustodian = defineReport<Asset>({
  id: "asset-custodian",
  title: "Asset Custodian Report",
  description: "Assets grouped by accountable official, with the value each one holds.",
  section: "assets",
  slug: "assets",
  source: (d) => byNumber(d.assets),
  filters: [af.custodian, af.category, af.condition, af.inService],
  rowId: (a) => a.id,
  groupings: [{ id: "custodian", label: "Custodian", by: (a, d) => officialName(d.by.official.get(a.custodianId), true) }],
  defaultGrouping: "custodian",
  columns: [ac.number, ac.name, ac.category, ac.location, ac.condition, ac.cost],
  summary: (items) => {
    const byCustodian = sumBy(
      items,
      (a) => a.custodianId,
      (a) => a.acquisitionCost,
    ).sort((a, b) => b.value - a.value)
    return [
      { label: "Assets", value: items.length },
      { label: "Custodians", value: byCustodian.length },
      { label: "Total value", value: sum(items, (a) => a.acquisitionCost), format: "peso" },
    ]
  },
  rowLink: assetLink,
  signatories: ["preparedBy", "treasurer", "punongBarangay"],
})

export const assetAcquisition = defineReport<Asset>({
  id: "asset-acquisition",
  title: "Asset Acquisition Summary",
  description: "Acquisitions summarized by fiscal year, category or funding source.",
  section: "assets",
  slug: "assets",
  source: (d) => [...d.assets].sort((a, b) => a.acquisitionDate.localeCompare(b.acquisitionDate)),
  filters: [af.acquired, af.category, af.status],
  rowId: (a) => a.id,
  groupings: [
    { id: "year", label: "Fiscal year", by: (a) => `FY ${yearOf(a.acquisitionDate)}`, summary: true },
    { id: "category", label: "Category", by: (a) => a.category, order: ASSET_CATEGORIES, summary: true },
    { id: "source", label: "Funding source", by: (a) => a.source, summary: true },
  ],
  defaultGrouping: "year",
  columns: [ac.number, ac.name, ac.acquired, ac.category, ac.source, ac.cost],
  summary: (items, _rows, d) => {
    const thisYear = items.filter((a) => yearOf(a.acquisitionDate) === d.now.getFullYear())
    return [
      { label: "Assets acquired", value: items.length },
      { label: "Total cost", value: sum(items, (a) => a.acquisitionCost), format: "peso" },
      { label: "This year", value: thisYear.length, hint: formatPesoCompact(sum(thisYear, (a) => a.acquisitionCost)) },
    ]
  },
  charts: [
    {
      type: "bar",
      title: "Acquisition cost by year",
      valueFormat: "peso",
      seriesName: "Acquisition cost",
      data: ({ items }) =>
        sumBy(
          items,
          (a) => String(yearOf(a.acquisitionDate)),
          (a) => a.acquisitionCost,
        ).sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      type: "hbar",
      title: "Acquisition cost by funding source",
      valueFormat: "peso",
      seriesName: "Acquisition cost",
      data: ({ items }) =>
        sumBy(
          items,
          (a) => a.source,
          (a) => a.acquisitionCost,
        ).sort((a, b) => b.value - a.value),
    },
  ],
  rowLink: assetLink,
  note: "Switch the grouping to summarize by category or funding source; turn on Show details to list the assets in each group.",
})

/* --------------------------------------------------------------- inventory -- */

const sf = {
  search: { id: "search", label: "Item code or name", getText: (i) => `${i.code} ${i.name}` },
  category: { id: "category", options: INVENTORY_CATEGORIES, get: (i) => i.category },
  status: { id: "status", options: ["In Stock", "Low Stock", "Out of Stock"], get: (i) => i.stockStatus },
} satisfies Record<string, ReportFilterSpec<StockLevel>>

const stockColumns: ReportColumn<StockLevel>[] = [
  { id: "code", header: "Item Code", format: "mono", value: (i) => i.code, total: "count" },
  { id: "name", header: "Item", value: (i) => i.name, detail: (i) => i.location },
  { id: "category", header: "Category", value: (i) => i.category },
  { id: "unit", header: "Unit", value: (i) => i.unit },
  { id: "onHand", header: "Available Quantity", format: "number", value: (i) => i.onHand },
  { id: "reorderLevel", header: "Reorder Level", format: "number", value: (i) => i.reorderLevel },
  { id: "lastUpdated", header: "Last Movement", format: "date", value: (i) => i.lastUpdated, hidden: true },
  { id: "status", header: "Status", format: "status", value: (i) => i.stockStatus },
]

const inventoryLink = { module: "inventory" as const, href: (i: { id: string }) => `/inventory?open=${i.id}` }
const byCode = (list: StockLevel[]) => [...list].sort((a, b) => a.code.localeCompare(b.code))

export const inventoryStock = defineReport<StockLevel>({
  id: "inventory-stock",
  title: "Inventory Stock Report",
  description: "Quantity on hand of every supply item against its reorder level.",
  section: "assets",
  slug: "inventory",
  source: (d) => byCode(d.stockLevels),
  filters: [sf.search, sf.category, sf.status],
  rowId: (i) => i.id,
  columns: stockColumns,
  groupings: [{ id: "category", label: "Category", by: (i) => i.category, order: INVENTORY_CATEGORIES }],
  summary: (items) => [
    { label: "Items", value: items.length },
    { label: "In stock", value: items.filter((i) => i.stockStatus === "In Stock").length, tone: "success" },
    { label: "Low stock", value: items.filter((i) => i.stockStatus === "Low Stock").length, tone: "warning" },
    { label: "Out of stock", value: items.filter((i) => i.stockStatus === "Out of Stock").length, tone: "danger" },
  ],
  charts: [{ type: "proportion", title: "Stock status", data: ({ items }) => countBy(items, (i) => i.stockStatus, ["In Stock", "Low Stock", "Out of Stock"]) }],
  rowLink: inventoryLink,
})

export const lowStock = defineReport<StockLevel>({
  id: "low-stock",
  title: "Low Stock Report",
  description: "Items at or below their reorder level, for replenishment.",
  section: "assets",
  slug: "inventory",
  source: (d) => byCode(d.stockLevels.filter((i) => i.onHand <= i.reorderLevel)),
  filters: [sf.category],
  rowId: (i) => i.id,
  columns: [
    ...stockColumns.slice(0, 6),
    { id: "shortfall", header: "To Reorder Level", format: "number", value: (i) => Math.max(0, i.reorderLevel - i.onHand), total: "sum" },
    stockColumns[7],
  ],
  summary: (items) => [
    { label: "Items to replenish", value: items.length, tone: "warning" },
    { label: "Out of stock", value: items.filter((i) => i.onHand <= 0).length, tone: "danger" },
    { label: "Relief supplies affected", value: items.filter((i) => i.category === "Relief Supplies").length },
  ],
  rowLink: inventoryLink,
  signatories: ["preparedBy", "treasurer", "punongBarangay"],
  note: "Only items whose quantity on hand is at or below the reorder level are listed.",
})

type TxRow = InventoryTransaction & { itemName: string; itemCode: string; itemCategory: string; unit: string }

export const inventoryTransactions = defineReport<TxRow>({
  id: "inventory-transactions",
  title: "Inventory Transaction Report",
  description: "Stock in, stock out and adjustments with quantity, user and reference.",
  section: "assets",
  slug: "inventory",
  source: (d) =>
    d.inventoryTransactions
      .map((t) => {
        const item = d.by.inventoryItem.get(t.itemId)
        return { ...t, itemName: item?.name ?? "—", itemCode: item?.code ?? "—", itemCategory: item?.category ?? "—", unit: item?.unit ?? "" }
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "search", label: "Item or reference", getText: (t) => `${t.itemCode} ${t.itemName} ${t.reference ?? ""}` },
    { id: "dateRange", label: "Transaction date", getDate: (t) => t.date },
    { id: "transactionType", get: (t) => t.type },
    { id: "category", label: "Item category", options: INVENTORY_CATEGORIES, get: (t) => t.itemCategory },
  ],
  rowId: (t) => t.id,
  columns: [
    { id: "date", header: "Date", format: "date", value: (t) => t.date },
    { id: "item", header: "Item", value: (t) => t.itemName, detail: (t) => t.itemCode, total: "count" },
    { id: "type", header: "Transaction Type", format: "status", value: (t) => t.type },
    { id: "quantity", header: "Quantity", format: "number", value: (t) => signedQuantity(t), detail: (t) => t.unit },
    { id: "user", header: "User", value: (t, d) => d.by.user.get(t.byUserId)?.name },
    { id: "reference", header: "Reference", value: (t) => t.reference, detail: (t) => (t.issuedTo ? `To: ${t.issuedTo}` : undefined) },
    { id: "remarks", header: "Remarks", value: (t) => t.remarks },
  ],
  summary: (items) => [
    { label: "Transactions", value: items.length },
    { label: "Stock in", value: items.filter((t) => t.type === "Stock In").length, tone: "success" },
    { label: "Stock out", value: items.filter((t) => t.type === "Stock Out").length, tone: "info" },
    { label: "Adjustments", value: items.filter((t) => t.type === "Adjustment").length, tone: "warning" },
  ],
  rowLink: { module: "inventory", href: (t) => `/inventory?open=${t.itemId}` },
  orientation: "landscape",
  note: "Quantity is signed: stock out is negative, adjustments carry their own sign.",
})

export const ASSET_REPORTS = [assetRegistry, assetsByCondition, assetCustodian, assetAcquisition, inventoryStock, lowStock, inventoryTransactions]
