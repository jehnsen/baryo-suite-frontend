"use client"

import { useMemo } from "react"
import type { InventoryItem, InventoryTransaction } from "@/types"
import { useInventoryItems, useInventoryTransactions } from "@/hooks/use-data"

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock"

export interface StockLevel extends InventoryItem {
  onHand: number
  lastUpdated?: string
  stockStatus: StockStatus
  transactions: InventoryTransaction[]
}

/** Signed effect of a transaction on quantity on hand. */
export const signedQuantity = (t: InventoryTransaction) => (t.type === "Stock Out" ? -t.quantity : t.quantity)

/** Quantity on hand is always derived from transactions (never stored). */
export function useStockLevels(): StockLevel[] {
  const items = useInventoryItems()
  const transactions = useInventoryTransactions()
  return useMemo(() => {
    const byItem = new Map<string, InventoryTransaction[]>()
    transactions.forEach((t) => byItem.set(t.itemId, [...(byItem.get(t.itemId) ?? []), t]))
    return items.map((item) => {
      const txs = (byItem.get(item.id) ?? []).sort((a, b) => b.date.localeCompare(a.date))
      const onHand = txs.reduce((s, t) => s + signedQuantity(t), 0)
      return {
        ...item,
        onHand,
        lastUpdated: txs[0]?.date,
        transactions: txs,
        stockStatus: onHand <= 0 ? "Out of Stock" : onHand <= item.reorderLevel ? "Low Stock" : "In Stock",
      }
    })
  }, [items, transactions])
}
