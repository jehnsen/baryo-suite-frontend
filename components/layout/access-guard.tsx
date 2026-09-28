"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { useCurrentUser } from "@/hooks/use-data"
import { accessForPath } from "@/lib/navigation"

/** Client-side mock RBAC: blocks routes the current role cannot access. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, canAccess } = useCurrentUser()
  const nav = accessForPath(pathname)
  if (nav && !nav.modules.some(canAccess)) {
    return (
      <EmptyState
        icon={Lock}
        title={`${nav.title} is not available for ${role}`}
        description="Your role does not have access to this module. Contact the barangay administrator if you need access."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        className="py-24"
      />
    )
  }
  return <>{children}</>
}
