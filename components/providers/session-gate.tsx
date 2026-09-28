"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Landmark } from "lucide-react"
import { useUsers } from "@/hooks/use-data"
import { clearSessionCookie } from "@/lib/auth"
import { useAppStore } from "@/lib/store/app-store"

const subscribeNoop = () => () => {}

/**
 * Renders the app shell only for a signed-in, active account. proxy.ts already
 * redirects requests without a session cookie; this also covers sign-out,
 * suspended accounts and the server render (which never knows the user).
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
  const userId = useAppStore((s) => s.session.currentUserId)
  const users = useUsers()
  const router = useRouter()
  const valid = users.some((u) => u.id === userId && u.status === "Active")

  useEffect(() => {
    if (!hydrated || valid) return
    clearSessionCookie()
    // No user id = signed out in this tab (proxy.ts handles first loads without a cookie).
    router.replace(userId ? "/login?reason=inactive" : "/login?reason=signed-out")
  }, [hydrated, valid, userId, router])

  if (!hydrated || !valid) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading BaryoSuite">
        <span className="flex size-12 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Landmark className="size-6" strokeWidth={1.7} aria-hidden />
        </span>
      </div>
    )
  }
  return <>{children}</>
}
