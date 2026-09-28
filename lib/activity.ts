import {
  Banknote,
  Boxes,
  ChartColumn,
  KeyRound,
  CalendarDays,
  ClipboardList,
  FilePen,
  FolderKanban,
  HandCoins,
  Landmark,
  Monitor,
  NotebookPen,
  PiggyBank,
  Receipt,
  ScrollText,
  UsersRound,
  BellRing,
  CheckCircle2,
  FileBadge,
  FileClock,
  Gavel,
  Home,
  LogIn,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import type { AuditAction, AuditLog, AuditModule, User } from "@/types"
import type { ActivityItem } from "@/components/shared/activity-feed"
import type { Tone } from "@/lib/status"

export const MODULE_ICONS: Record<AuditModule, LucideIcon> = {
  Residents: Users,
  Households: Home,
  Certificates: FileBadge,
  "Service Requests": FileClock,
  Blotter: Gavel,
  Incidents: ShieldAlert,
  Officials: ShieldCheck,
  Announcements: BellRing,
  Users: UserCog,
  Settings: Settings,
  Auth: LogIn,
  Budget: PiggyBank,
  "Fund Sources": Landmark,
  PPAs: ClipboardList,
  Collections: HandCoins,
  Obligations: FilePen,
  Disbursements: Banknote,
  Expenses: Receipt,
  Sessions: CalendarDays,
  Minutes: NotebookPen,
  Ordinances: ScrollText,
  Resolutions: ScrollText,
  Committees: UsersRound,
  Assemblies: UsersRound,
  Projects: FolderKanban,
  Assets: Monitor,
  Inventory: Boxes,
  Reports: ChartColumn,
  Access: KeyRound,
}

export const ACTION_TONES: Partial<Record<AuditAction, Tone>> = {
  Created: "info",
  Approved: "success",
  Issued: "success",
  Released: "success",
  Published: "success",
  Rejected: "danger",
  Cancelled: "danger",
  Archived: "neutral",
  Closed: "neutral",
  "Hearing Scheduled": "purple",
  "Status Changed": "warning",
  Submitted: "info",
  Returned: "warning",
  Recorded: "info",
  Deposited: "purple",
  Reconciled: "success",
  Assigned: "info",
  "Stock In": "success",
  "Stock Out": "info",
  Adjusted: "warning",
  Printed: "neutral",
  Exported: "purple",
  "Logged Out": "neutral",
  Granted: "success",
  Revoked: "danger",
}

const ACTION_VERBS: Record<AuditAction, string> = {
  Created: "created",
  Updated: "updated",
  Archived: "archived",
  Approved: "approved",
  Rejected: "rejected",
  Released: "released",
  Issued: "issued",
  Cancelled: "cancelled",
  "Status Changed": "updated the status of",
  "Hearing Scheduled": "scheduled a hearing for",
  Closed: "closed",
  Published: "published",
  "Logged In": "signed in",
  Submitted: "submitted",
  Returned: "returned",
  Recorded: "recorded",
  Deposited: "deposited",
  Reconciled: "reconciled",
  Assigned: "assigned",
  "Stock In": "stocked in",
  "Stock Out": "issued stock of",
  Adjusted: "adjusted stock of",
  Printed: "printed",
  Exported: "exported",
  "Logged Out": "signed out",
  Granted: "granted access to",
  Revoked: "revoked access to",
}

/** Deep link for an audit record, when the module has a detail route. */
export function recordHref(module: AuditModule, recordId?: string): string | undefined {
  if (!recordId) return undefined
  switch (module) {
    case "Residents":
      return `/residents/${recordId}`
    case "Households":
      return `/households/${recordId}`
    case "Certificates":
      return `/certificates/${recordId}`
    case "Service Requests":
      return `/requests/${recordId}`
    case "Blotter":
      return `/blotter/${recordId}`
    case "Incidents":
      return `/incidents?open=${recordId}`
    case "Officials":
      return `/officials/${recordId}`
    case "Budget":
      return `/finance/budget`
    case "PPAs":
      return `/ppas/${recordId}`
    case "Collections":
      return `/finance/collections?open=${recordId}`
    case "Obligations":
      return `/finance/obligations/${recordId}`
    case "Disbursements":
      return `/finance/disbursements/${recordId}`
    case "Expenses":
      return `/finance/expenses`
    case "Sessions":
      return `/governance/sessions/${recordId}`
    case "Minutes":
      return `/governance/minutes/${recordId}`
    case "Ordinances":
      return `/governance/ordinances/${recordId}`
    case "Resolutions":
      return `/governance/resolutions/${recordId}`
    case "Committees":
      return `/governance/committees/${recordId}`
    case "Assemblies":
      return `/governance/assemblies/${recordId}`
    case "Projects":
      return `/projects/${recordId}`
    case "Assets":
      return `/assets/${recordId}`
    case "Inventory":
      return `/inventory?open=${recordId}`
    case "Access":
      return `/admin/users?tab=access`
    case "Reports":
      return `/reports?report=${recordId}`
    default:
      return undefined
  }
}

export function auditToActivity(log: AuditLog, users: Map<string, User>): ActivityItem {
  const icon =
    log.action === "Approved" || log.action === "Issued"
      ? CheckCircle2
      : log.action === "Rejected" || log.action === "Cancelled"
        ? XCircle
        : MODULE_ICONS[log.module]
  return {
    id: log.id,
    actor: users.get(log.userId)?.name ?? "System",
    action: ACTION_VERBS[log.action],
    target: log.action === "Logged In" || log.action === "Logged Out" ? undefined : log.recordLabel,
    href: recordHref(log.module, log.recordId),
    timestamp: log.timestamp,
    icon,
    tone: ACTION_TONES[log.action] ?? "neutral",
  }
}
