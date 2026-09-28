import Link from "next/link"
import { MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={MapPinOff}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
      />
    </main>
  )
}
