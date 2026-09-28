/**
 * Single source of truth for status → color tone. Every StatusBadge in the app
 * resolves through this map so a status looks the same in every module.
 *
 *  neutral – inactive / draft / closed-out
 *  info    – new, in the queue
 *  warning – needs someone's attention
 *  purple  – escalated or at a formal step (mediation, ready for release)
 *  success – done, good standing
 *  danger  – rejected, cancelled, failed
 */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "purple"

const STATUS_TONES: Record<string, Tone> = {
  // generic
  Active: "success",
  Inactive: "neutral",
  Archived: "neutral",
  Draft: "neutral",
  Pending: "warning",
  Approved: "info",
  Completed: "success",
  Rejected: "danger",
  Cancelled: "danger",
  Closed: "neutral",
  // residents
  "Moved Out": "neutral",
  Deceased: "neutral",
  Registered: "success",
  "Not Registered": "neutral",
  // certificates
  Released: "success",
  // requests
  Submitted: "info",
  "Under Review": "warning",
  "Ready for Release": "purple",
  // blotter
  Reported: "info",
  "Under Investigation": "warning",
  "For Mediation": "purple",
  Settled: "success",
  Referred: "danger",
  // incidents
  Investigating: "warning",
  Resolved: "success",
  // hearings
  Scheduled: "info",
  Rescheduled: "warning",
  "No Show": "danger",
  // officials / users
  "On Leave": "warning",
  Invited: "info",
  Suspended: "danger",
  // announcements
  Published: "success",
  // Phase 2 — finance
  "For Review": "warning",
  "For Authorization": "purple",
  "For Approval": "purple",
  "Partially Disbursed": "info",
  "Fully Disbursed": "success",
  Recorded: "info",
  Deposited: "purple",
  Reconciled: "success",
  "Within Budget": "success",
  "Nearing Limit": "warning",
  Critical: "danger",
  Exhausted: "danger",
  // Phase 2 — governance
  Ongoing: "info",
  Proposed: "info",
  Effective: "success",
  Repealed: "neutral",
  Present: "success",
  Late: "warning",
  Excused: "neutral",
  Absent: "danger",
  Carried: "success",
  Lost: "danger",
  Deferred: "warning",
  Withdrawn: "neutral",
  Open: "info",
  "In Progress": "warning",
  Done: "success",
  // Phase 2 — operations
  Planned: "neutral",
  Planning: "neutral",
  Procurement: "purple",
  Delayed: "danger",
  "In Storage": "neutral",
  "Under Maintenance": "warning",
  Disposed: "neutral",
  Excellent: "success",
  Good: "success",
  Fair: "warning",
  Poor: "danger",
  "For Repair": "warning",
  Unserviceable: "danger",
  "Low Stock": "warning",
  "Out of Stock": "danger",
  "In Stock": "success",
  "Stock In": "success",
  "Stock Out": "info",
  Adjustment: "warning",
  // severity
  Low: "neutral",
  Moderate: "warning",
  High: "danger",
}

export function toneFor(status: string): Tone {
  return STATUS_TONES[status] ?? "neutral"
}

export const TONE_CLASSES: Record<Tone, { badge: string; dot: string; icon: string }> = {
  neutral: {
    badge: "bg-[var(--tone-neutral-bg)] text-[var(--tone-neutral)]",
    dot: "bg-[var(--tone-neutral)]",
    icon: "text-[var(--tone-neutral)] bg-[var(--tone-neutral-bg)]",
  },
  info: { badge: "bg-[var(--tone-info-bg)] text-[var(--tone-info)]", dot: "bg-[var(--tone-info)]", icon: "text-[var(--tone-info)] bg-[var(--tone-info-bg)]" },
  warning: {
    badge: "bg-[var(--tone-warning-bg)] text-[var(--tone-warning)]",
    dot: "bg-[var(--tone-warning)]",
    icon: "text-[var(--tone-warning)] bg-[var(--tone-warning-bg)]",
  },
  success: {
    badge: "bg-[var(--tone-success-bg)] text-[var(--tone-success)]",
    dot: "bg-[var(--tone-success)]",
    icon: "text-[var(--tone-success)] bg-[var(--tone-success-bg)]",
  },
  danger: {
    badge: "bg-[var(--tone-danger-bg)] text-[var(--tone-danger)]",
    dot: "bg-[var(--tone-danger)]",
    icon: "text-[var(--tone-danger)] bg-[var(--tone-danger-bg)]",
  },
  purple: {
    badge: "bg-[var(--tone-purple-bg)] text-[var(--tone-purple)]",
    dot: "bg-[var(--tone-purple)]",
    icon: "text-[var(--tone-purple)] bg-[var(--tone-purple-bg)]",
  },
}
