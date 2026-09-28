import type { Attachment, ID, StatusChange } from "./index"

/* Governance (Phase 2). Links point one way (legislation → session) to avoid duplicated references. */

export type SessionType = "Regular" | "Special" | "Emergency"
export type SessionStatus = "Scheduled" | "Ongoing" | "Completed" | "Cancelled"
export type AttendanceStatus = "Present" | "Late" | "Excused" | "Absent"
export type AgendaItemType = "Preliminaries" | "Report" | "Legislation" | "Budget" | "Other Matters"
export type MotionResult = "Carried" | "Lost" | "Deferred" | "Withdrawn"

export interface AgendaItem {
  id: ID
  order: number
  title: string
  type: AgendaItemType
  presenterId?: ID
  notes?: string
}

export interface Motion {
  id: ID
  agendaItemId?: ID
  text: string
  movedById: ID
  secondedById?: ID
  result: MotionResult
  votesFor?: number
  votesAgainst?: number
  abstentions?: number
}

export interface SessionAttendance {
  officialId: ID
  status: AttendanceStatus
}

export interface BarangaySession {
  id: ID
  sessionNumber: string
  title: string
  type: SessionType
  date: string
  time: string
  venue: string
  presidingOfficerId: ID
  agenda: AgendaItem[]
  attendance: SessionAttendance[]
  motions: Motion[]
  decisions: string[]
  status: SessionStatus
  createdAt: string
}

export type MinutesStatus = "Draft" | "For Approval" | "Approved"
export type ActionItemStatus = "Open" | "In Progress" | "Done"

export interface ActionItem {
  id: ID
  task: string
  responsibleId: ID
  dueDate: string
  status: ActionItemStatus
}

/** Structured minutes. Attendance, agenda and motions are read from the session. */
export interface MeetingMinutes {
  id: ID
  sessionId: ID
  callToOrder: string
  adjournment: string
  discussions: { agendaItemId: ID; summary: string }[]
  actionItems: ActionItem[]
  preparedById: ID
  status: MinutesStatus
  approvedAt?: string
  createdAt: string
}

export type OrdinanceStatus = "Draft" | "Under Review" | "Approved" | "Effective" | "Repealed" | "Archived"

export interface Ordinance {
  id: ID
  ordinanceNumber: string
  title: string
  description: string
  sponsorId: ID
  committeeId?: ID
  sessionId?: ID
  dateIntroduced: string
  dateApproved?: string
  effectiveDate?: string
  status: OrdinanceStatus
  attachments: Attachment[]
  history: StatusChange<OrdinanceStatus>[]
}

export type ResolutionStatus = "Draft" | "Proposed" | "Approved" | "Rejected" | "Archived"

export interface Resolution {
  id: ID
  resolutionNumber: string
  title: string
  description: string
  sponsorId: ID
  committeeId?: ID
  sessionId?: ID
  dateApproved?: string
  status: ResolutionStatus
  attachments: Attachment[]
  history: StatusChange<ResolutionStatus>[]
}

export interface Committee {
  id: ID
  name: string
  chairpersonId: ID
  viceChairId?: ID
  memberIds: ID[]
  responsibilities: string[]
  status: "Active" | "Inactive"
}

export type AssemblyStatus = "Scheduled" | "Completed" | "Cancelled"

export interface BarangayAssembly {
  id: ID
  title: string
  date: string
  time: string
  venue: string
  agenda: string[]
  attendanceCount: number
  householdsRepresented?: number
  topics: string[]
  decisions: string[]
  minutesSummary?: string
  attachments: Attachment[]
  status: AssemblyStatus
}
