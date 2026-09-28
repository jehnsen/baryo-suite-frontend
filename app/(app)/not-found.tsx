import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Record not found"
      description="It may have been removed or the link is incorrect."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
      className="py-24"
    />
  )
}
