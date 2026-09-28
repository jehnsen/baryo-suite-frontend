"use client"

import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PageLoad } from "@/hooks/use-page-load"
import { EmptyState } from "./empty-state"
import { ErrorState } from "./error-state"
import { DetailSkeleton } from "./loading-skeleton"

/** Renders the skeleton / error state for a page load, otherwise children. */
export function LoadState({ load, skeleton = <DetailSkeleton />, children }: { load: PageLoad; skeleton?: React.ReactNode; children: React.ReactNode }) {
  if (load.isLoading) return <>{skeleton}</>
  if (load.isError) return <ErrorState onRetry={load.retry} className="py-24" />
  return <>{children}</>
}

export function RecordNotFound({ entity, backHref, backLabel }: { entity: string; backHref: string; backLabel: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`${entity} not found`}
      description="This record may have been removed, or the link is incorrect."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      }
      className="py-24"
    />
  )
}
