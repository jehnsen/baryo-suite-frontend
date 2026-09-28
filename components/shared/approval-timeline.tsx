import { Ban, CheckCircle2, Circle, Clock, RotateCcw } from "lucide-react"
import type { StatusChange, User } from "@/types"
import type { WorkflowDefinition } from "@/lib/workflows"
import { formatDateTime } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { Timeline, type TimelineItem } from "./timeline"

interface ApprovalTimelineProps<S extends string> {
  workflow: WorkflowDefinition<S>
  status: S
  history: StatusChange<S>[]
  users: Map<string, User>
}

/**
 * Renders any workflow: completed steps with approver, timestamp and remarks;
 * the current step highlighted; remaining steps pending; off-path outcomes
 * (cancelled, rejected, delayed, returned) shown where they happened.
 */
export function ApprovalTimeline<S extends string>({ workflow, status, history, users }: ApprovalTimelineProps<S>) {
  const stepStatuses = workflow.steps.map((s) => s.status)
  const labelFor = (st: S) => workflow.steps.find((s) => s.status === st)?.label ?? st

  const items: TimelineItem[] = history.map((h, i) => {
    const isCurrent = i === history.length - 1
    const onPath = stepStatuses.includes(h.status)
    const returned = i > 0 && onPath && stepStatuses.indexOf(h.status) < stepStatuses.indexOf(history[i - 1].status)
    return {
      id: `${h.status}-${i}`,
      title: returned ? `Returned to ${labelFor(h.status).toLowerCase()}` : labelFor(h.status),
      icon: workflow.terminal.includes(h.status) ? Ban : returned ? RotateCcw : isCurrent ? Clock : CheckCircle2,
      tone:
        workflow.terminal.includes(h.status) || returned
          ? toneFor(h.status) === "neutral"
            ? "danger"
            : toneFor(h.status)
          : !onPath
            ? toneFor(h.status)
            : isCurrent
              ? "info"
              : "success",
      timestamp: formatDateTime(h.at),
      description: (
        <>
          {h.byUserId && <span>by {users.get(h.byUserId)?.name ?? "Staff"}</span>}
          {h.note && <span className="mt-0.5 block text-foreground/80">“{h.note}”</span>}
        </>
      ),
    }
  })

  // Upcoming steps (not for terminal outcomes).
  if (!workflow.terminal.includes(status)) {
    const currentIdx = stepStatuses.includes(status) ? stepStatuses.indexOf(status) : Math.max(...history.map((h) => stepStatuses.indexOf(h.status)))
    workflow.steps.slice(currentIdx + 1).forEach((s) => items.push({ id: `pending-${s.status}`, title: s.label, icon: Circle, pending: true }))
  }

  return <Timeline items={items} />
}
