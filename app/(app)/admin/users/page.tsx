import { Suspense } from "react"
import type { Metadata } from "next"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { UsersView } from "@/features/users/users-view"

export const metadata: Metadata = { title: "Users" }

export default function Page() {
  // Reads ?tab=access (audit log links) via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UsersView />
    </Suspense>
  )
}
