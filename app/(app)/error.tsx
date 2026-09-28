"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/shared/error-state"

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <ErrorState
      title="This page failed to load"
      description={error.digest ? `Reference: ${error.digest}` : "An unexpected error occurred. Please try again."}
      onRetry={retry}
      className="py-24"
    />
  )
}
