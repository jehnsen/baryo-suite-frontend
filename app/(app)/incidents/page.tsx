import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { IncidentsView } from "@/features/incidents/incidents-view"

export const metadata: Metadata = { title: "Incidents" }

export default function Page() {
  // IncidentsView reads ?open=<id> via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IncidentsView />
    </Suspense>
  )
}
