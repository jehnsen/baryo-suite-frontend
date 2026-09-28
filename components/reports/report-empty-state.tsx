import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

/** Shown when a report has no rows for the applied filters. */
export function ReportEmptyState({ filtered, onReset }: { filtered: boolean; onReset?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-card">
      <EmptyState
        icon={SearchX}
        title={filtered ? "No records match these filters" : "No records to report yet"}
        description={
          filtered ? "Widen the date range or clear some filters, then apply again." : "This report fills in as records are added in the operational modules."
        }
        action={
          filtered && onReset ? (
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset filters
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
