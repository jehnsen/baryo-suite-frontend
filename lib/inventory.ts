import type { InventoryItem, InventoryTransaction } from "@/types"

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock"

export interface StockLevel extends InventoryItem {
  onHand: number
  lastUpdated?: string
  stockStatus: StockStatus
  transactions: InventoryTransaction[]
}

/** Signed effect of a transaction on quantity on hand. */
export const signedQuantity = (t: InventoryTransaction) => (t.type === "Stock Out" ? -t.quantity : t.quantity)

export const stockStatus = (onHand: number, reorderLevel: number): StockStatus =>
  onHand <= 0 ? "Out of Stock" : onHand <= reorderLevel ? "Low Stock" : "In Stock"

/** Quantity on hand is always derived from transactions (never stored). */
export function buildStockLevels(items: InventoryItem[], transactions: InventoryTransaction[]): StockLevel[] {
  const byItem = new Map<string, InventoryTransaction[]>()
  transactions.forEach((t) => byItem.set(t.itemId, [...(byItem.get(t.itemId) ?? []), t]))
  return items.map((item) => {
    const txs = (byItem.get(item.id) ?? []).sort((a, b) => b.date.localeCompare(a.date))
    const onHand = txs.reduce((s, t) => s + signedQuantity(t), 0)
    return { ...item, onHand, lastUpdated: txs[0]?.date, transactions: txs, stockStatus: stockStatus(onHand, item.reorderLevel) }
  })
}
