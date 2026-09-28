import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { InventoryView } from "@/features/operations/inventory-view"

export const metadata: Metadata = { title: "Inventory" }

export default function Page() {
  // Reads ?open=<id> via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InventoryView />
    </Suspense>
  )
}
