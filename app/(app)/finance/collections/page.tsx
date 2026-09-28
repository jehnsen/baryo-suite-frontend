import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { CollectionsView } from "@/features/finance/collections-view"

export const metadata: Metadata = { title: "Collections" }

export default function Page() {
  // Reads ?open=<id> via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CollectionsView />
    </Suspense>
  )
}
