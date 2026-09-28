/**
 * Centralized domain models for BaryoSuite.
 *
 * All dates are ISO-8601 strings (`yyyy-MM-dd` for dates, full ISO for
 * timestamps) so records stay serializable and map 1:1 to future API payloads.
 */

export type ID = string

/* -------------------------------------------------------------------------- */
/* Residents                                                                  */
/* -------------------------------------------------------------------------- */

export type Gender = "Male" | "Female"

export type CivilStatus = "Single" | "Married" | "Widowed" | "Separated" | "Live-in"

export type ResidentStatus = "Active" | "Moved Out" | "Deceased" | "Archived"

export type VoterStatus = "Registered" | "Not Registered"

export interface ResidentClassification {
  seniorCitizen: boolean
  pwd: boolean
  soloParent: boolean
  registeredVoter: boolean
  indigent: boolean
  student: boolean
  unemployed: boolean
}

export interface Address {
  houseNumber: string
  street: string
  sitio?: string
  purok: string
}

export interface Resident {
  id: ID
  residentNumber: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  photoUrl?: string
  birthDate: string
  birthplace: string
  gender: Gender
  civilStatus: CivilStatus
  nationality: string
  occupation?: string
  contactNumber?: string
  email?: string
  address: Address
  yearsOfResidency: number
  householdId?: ID
  relationshipToHead?: HouseholdRelationship
  classification: ResidentClassification
  status: ResidentStatus
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------------------------------- */
/* Households                                                                 */
/* -------------------------------------------------------------------------- */

export type HouseholdRelationship = "Head" | "Spouse" | "Son" | "Daughter" | "Parent" | "Sibling" | "Grandchild" | "Relative" | "Other"

export type HouseholdStatus = "Active" | "Inactive"
export type HousingType = "Concrete" | "Semi-Concrete" | "Light Materials" | "Apartment"
export type OwnershipStatus = "Owned" | "Rented" | "Informal Settler" | "Rent-Free with Consent"
export type WaterSource = "Level III (Piped)" | "Level II (Communal)" | "Level I (Deep Well)" | "Purchased/Refilling"
export type ToiletFacility = "Water-Sealed (Own)" | "Water-Sealed (Shared)" | "Pit Latrine" | "None"
export type IncomeRange = "Below ₱10,000" | "₱10,000 – ₱20,000" | "₱20,001 – ₱40,000" | "₱40,001 – ₱70,000" | "Above ₱70,000"

export interface Household {
  id: ID
  householdNumber: string
  headId: ID
  address: Address
  housingType: HousingType
  ownershipStatus: OwnershipStatus
  waterSource: WaterSource
  hasElectricity: boolean
  toiletFacility: ToiletFacility
  incomeRange: IncomeRange
  status: HouseholdStatus
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Certificates                                                               */
/* -------------------------------------------------------------------------- */

export type CertificateType =
  | "Barangay Clearance"
  | "Certificate of Residency"
  | "Certificate of Indigency"
  | "Certificate of Good Moral Character"
  | "Business Clearance"
  | "First Time Job Seeker Certificate"

export type CertificateStatus = "Draft" | "Pending" | "Approved" | "Released" | "Cancelled"

export interface Certificate {
  id: ID
  certificateNumber: string
  residentId: ID
  type: CertificateType
  purpose: string
  dateIssued: string
  validUntil?: string
  remarks?: string
  issuedById: ID // BarangayOfficial id
  status: CertificateStatus
  requestId?: ID
  orNumber?: string
  fee: number
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Service requests                                                           */
/* -------------------------------------------------------------------------- */

export type ServiceType =
  | "Barangay Clearance"
  | "Residency Certificate"
  | "Indigency Certificate"
  | "Business Clearance"
  | "Good Moral Certificate"
  | "First Time Job Seeker Certificate"
  | "Other Service"

export type RequestStatus = "Submitted" | "Under Review" | "Approved" | "Ready for Release" | "Completed" | "Rejected"

export type RequestChannel = "Walk-in" | "Online" | "Phone"

export interface StatusChange<S extends string = string> {
  status: S
  at: string
  byUserId?: ID
  note?: string
}

export interface InternalNote {
  id: ID
  authorId: ID
  body: string
  createdAt: string
}

export interface ServiceRequest {
  id: ID
  requestNumber: string
  residentId: ID
  service: ServiceType
  purpose: string
  details?: string
  channel: RequestChannel
  dateRequested: string
  assignedToId?: ID // User id
  status: RequestStatus
  history: StatusChange<RequestStatus>[]
  notes: InternalNote[]
  certificateId?: ID
}

/* -------------------------------------------------------------------------- */
/* Blotter                                                                    */
/* -------------------------------------------------------------------------- */

export type BlotterStatus = "Reported" | "Under Investigation" | "For Mediation" | "Settled" | "Referred" | "Closed"

export type BlotterIncidentType =
  | "Physical Injury"
  | "Verbal Altercation"
  | "Unpaid Debt"
  | "Property Dispute"
  | "Noise Complaint"
  | "Trespassing"
  | "Threat"
  | "Damage to Property"
  | "Domestic Dispute"
  | "Other"

/** A party may be a registered resident or a non-resident (free text). */
export interface CaseParty {
  residentId?: ID
  name: string
  address?: string
  contactNumber?: string
}

export interface Hearing {
  id: ID
  date: string
  time: string
  venue: string
  type: "Mediation" | "Conciliation" | "Arbitration"
  status: "Scheduled" | "Completed" | "Rescheduled" | "No Show"
  notes?: string
}

export interface Attachment {
  id: ID
  name: string
  size: number
  type: string
  uploadedAt: string
}

export interface BlotterCase {
  id: ID
  blotterNumber: string
  date: string
  time: string
  location: string
  complainant: CaseParty
  respondent: CaseParty
  witnesses: CaseParty[]
  incidentType: BlotterIncidentType
  narrative: string
  assignedOfficerId?: ID // BarangayOfficial id
  status: BlotterStatus
  hearings: Hearing[]
  attachments: Attachment[]
  notes: InternalNote[]
  history: StatusChange<BlotterStatus>[]
  incidentId?: ID
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Incidents                                                                  */
/* -------------------------------------------------------------------------- */

export type IncidentType = "Theft" | "Public Disturbance" | "Accident" | "Fire" | "Vehicular Incident" | "Vandalism" | "Missing Person" | "Other"

export type IncidentStatus = "Reported" | "Investigating" | "Resolved" | "Closed"
export type IncidentSeverity = "Low" | "Moderate" | "High"

export interface Incident {
  id: ID
  incidentNumber: string
  date: string
  time: string
  location: string
  purok?: string
  type: IncidentType
  severity: IncidentSeverity
  description: string
  personsInvolved: string[]
  reportedBy: string
  assignedOfficerId?: ID
  status: IncidentStatus
  history: StatusChange<IncidentStatus>[]
  blotterId?: ID
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Officials                                                                  */
/* -------------------------------------------------------------------------- */

export type OfficialPosition = "Punong Barangay" | "Kagawad" | "SK Chairperson" | "Barangay Secretary" | "Barangay Treasurer" | "Barangay Tanod" | "Staff"

export type OfficialStatus = "Active" | "On Leave" | "Inactive"

export interface BarangayOfficial {
  id: ID
  residentId?: ID
  firstName: string
  middleName?: string
  lastName: string
  photoUrl?: string
  position: OfficialPosition
  committee?: string
  contactNumber: string
  email?: string
  termStart: string
  termEnd: string
  status: OfficialStatus
  rank: number // sort order in directory
}

/* -------------------------------------------------------------------------- */
/* Announcements                                                              */
/* -------------------------------------------------------------------------- */

export type AnnouncementCategory = "General" | "Emergency" | "Health" | "Community" | "Public Service"
export type AnnouncementAudience = "All Residents" | "Selected Purok" | "Senior Citizens" | "Youth"
export type AnnouncementStatus = "Draft" | "Published" | "Archived"

export interface Announcement {
  id: ID
  title: string
  description: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  puroks?: string[]
  publishDate: string
  expirationDate?: string
  status: AnnouncementStatus
  authorId: ID
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Users, roles, permissions                                                  */
/* -------------------------------------------------------------------------- */

export type Role = "Administrator" | "Punong Barangay" | "Secretary" | "Treasurer" | "Kagawad" | "Tanod" | "Encoder" | "Viewer"

/** Every navigable module. New modules (Health, DRRM, …) extend this union. */
export type ModuleKey =
  | "dashboard"
  | "residents"
  | "households"
  | "certificates"
  | "requests"
  | "blotter"
  | "incidents"
  | "officials"
  | "announcements"
  | "users"
  | "audit-logs"
  | "settings"
  // Phase 2 — Finance & Treasury
  | "finance-dashboard"
  | "budget"
  | "allocations"
  | "collections"
  | "obligations"
  | "disbursements"
  | "expenses"
  | "financial-reports"
  // Phase 2 — Governance
  | "sessions"
  | "ordinances"
  | "resolutions"
  | "committees"
  | "minutes"
  | "assemblies"
  // Phase 2 — Operations
  | "projects"
  | "assets"
  | "inventory"

export type UserStatus = "Active" | "Invited" | "Suspended"

export interface User {
  id: ID
  name: string
  email: string
  role: Role
  status: UserStatus
  officialId?: ID
  lastLogin?: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

export type AuditModule =
  | "Residents"
  | "Households"
  | "Certificates"
  | "Service Requests"
  | "Blotter"
  | "Incidents"
  | "Officials"
  | "Announcements"
  | "Users"
  | "Settings"
  | "Auth"
  // Phase 2
  | "Budget"
  | "Fund Sources"
  | "PPAs"
  | "Collections"
  | "Obligations"
  | "Disbursements"
  | "Expenses"
  | "Sessions"
  | "Minutes"
  | "Ordinances"
  | "Resolutions"
  | "Committees"
  | "Assemblies"
  | "Projects"
  | "Assets"
  | "Inventory"

export type AuditAction =
  | "Created"
  | "Updated"
  | "Archived"
  | "Approved"
  | "Rejected"
  | "Released"
  | "Issued"
  | "Cancelled"
  | "Status Changed"
  | "Hearing Scheduled"
  | "Closed"
  | "Published"
  | "Logged In"
  // Phase 2
  | "Submitted"
  | "Returned"
  | "Recorded"
  | "Deposited"
  | "Reconciled"
  | "Assigned"
  | "Stock In"
  | "Stock Out"
  | "Adjusted"

export interface AuditLog {
  id: ID
  timestamp: string
  userId: ID
  action: AuditAction
  module: AuditModule
  recordId?: ID
  recordLabel: string
  details: string
  ipAddress?: string
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export interface Purok {
  id: ID
  name: string
  sitios: string[]
}

export interface BarangaySettings {
  barangayName: string
  barangayCode: string
  municipality: string
  province: string
  region: string
  address: string
  contactNumber: string
  email: string
  logoUrl?: string
  sealUrl?: string
  punongBarangayId: ID
  secretaryId: ID
  treasurerId: ID
  puroks: Purok[]
  certificateTypes: { type: CertificateType; fee: number; validityDays: number }[]
  incidentTypes: IncidentType[]
  classifications: (keyof ResidentClassification)[]
  /** Budget utilization alert thresholds in percent (Phase 2). */
  budgetThresholds: { warning: number; critical: number }
}

/* -------------------------------------------------------------------------- */
/* Phase 2 domains                                                            */
/* -------------------------------------------------------------------------- */

export * from "./finance"
export * from "./governance"
export * from "./operations"
