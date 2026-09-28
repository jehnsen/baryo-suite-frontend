"use client"

import { useCallback, useEffect, useState } from "react"

export type LoadStatus = "loading" | "ready" | "error"

/**
 * Simulates request latency for mock data so every page exercises its
 * loading, empty and error states exactly as it will against a real API.
 *
 * Demo overrides via query string: `?state=loading | empty | error`.
 */
export function usePageLoad(delay = 380) {
  const [status, setStatus] = useState<LoadStatus>("loading")
  const [demoEmpty, setDemoEmpty] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("state")
    if (demo === "loading") return
    const t = window.setTimeout(() => {
      setDemoEmpty(demo === "empty")
      // A retry after a demo error succeeds, like a transient network failure.
      setStatus(demo === "error" && attempt === 0 ? "error" : "ready")
    }, delay)
    return () => window.clearTimeout(t)
  }, [delay, attempt])

  const retry = useCallback(() => {
    setStatus("loading")
    setAttempt((a) => a + 1)
  }, [])

  return {
    status,
    isLoading: status === "loading",
    isError: status === "error",
    demoEmpty,
    retry,
  }
}

export type PageLoad = ReturnType<typeof usePageLoad>
