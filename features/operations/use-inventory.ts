"use client"

import { useMemo } from "react"
import { useInventoryItems, useInventoryTransactions } from "@/hooks/use-data"
import { buildStockLevels, type StockLevel } from "@/lib/inventory"

export { signedQuantity, type StockLevel, type StockStatus } from "@/lib/inventory"

/** Quantity on hand is always derived from transactions (never stored). */
export function useStockLevels(): StockLevel[] {
  const items = useInventoryItems()
  const transactions = useInventoryTransactions()
  return useMemo(() => buildStockLevels(items, transactions), [items, transactions])
}
