import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { ReportsOverview } from "@/features/reports/reports-overview"

export const metadata: Metadata = { title: "Reports" }

export default function Page() {
  // Reads ?report=<id> (deep links from the audit log) via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsOverview />
    </Suspense>
  )
}
