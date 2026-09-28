"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { useCurrentUser } from "@/hooks/use-data"
import { accessForPath } from "@/lib/navigation"

/**
 * Client-side mock RBAC: blocks routes the current account cannot access and
 * flags view & print-only modules (their actions are hidden by `can()`).
 */
export function AccessGuard({ children, notice = true }: { children: React.ReactNode; notice?: boolean }) {
  const pathname = usePathname()
  const { role, accessLevel, can } = useCurrentUser()
  const nav = accessForPath(pathname)
  const levels = nav?.modules.map(accessLevel) ?? []
  if (nav && levels.every((l) => l === "none")) {
    return (
      <EmptyState
        icon={Lock}
        title={`${nav.title} is not available for ${role}`}
        description="Your account does not have access to this module. Ask the barangay administrator to grant access if you need it."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        className="py-24"
      />
    )
  }
  const viewOnly = notice && nav && !nav.modules.some((m) => m.startsWith("reports")) && levels.length > 0 && !levels.includes("full")
  return (
    <>
      {viewOnly && (
        <p
          className="no-print mb-5 flex items-center gap-2 rounded-lg border border-border/80 bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
          role="status"
        >
          <Eye className="size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium text-foreground">View & print only.</span>{" "}
            {role === "Administrator"
              ? "Records here are managed by the Secretary or Treasurer."
              : can("financeApprove")
                ? "You can still approve records that are waiting for your approval."
                : "Ask the administrator for full access to make changes."}
          </span>
        </p>
      )}
      {children}
    </>
  )
}
