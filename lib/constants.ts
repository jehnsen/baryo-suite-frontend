import type {
  AgendaItemType,
  AssemblyStatus,
  AssetCategory,
  AssetCondition,
  AssetStatus,
  AttendanceStatus,
  BudgetCategory,
  BudgetStatus,
  CollectionStatus,
  CollectionType,
  DisbursementMethod,
  DisbursementStatus,
  FundSourceType,
  InventoryCategory,
  MilestoneStatus,
  MotionResult,
  ObligationStatus,
  OrdinanceStatus,
  PaymentMethod,
  PPAStatus,
  PPAType,
  ProjectStatus,
  ResolutionStatus,
  SessionStatus,
  SessionType,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementStatus,
  AuditAction,
  AuditModule,
  BlotterIncidentType,
  BlotterStatus,
  CertificateStatus,
  CertificateType,
  CivilStatus,
  Gender,
  HouseholdRelationship,
  HousingType,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  IncomeRange,
  OfficialPosition,
  OfficialStatus,
  OwnershipStatus,
  RequestChannel,
  RequestStatus,
  ResidentClassification,
  ResidentStatus,
  Role,
  ServiceType,
  ToiletFacility,
  UserStatus,
  WaterSource,
} from "@/types"

export const APP_NAME = "BaryoSuite"
export const APP_TAGLINE = "One Platform. Smarter Barangay Service."

export const GENDERS: Gender[] = ["Male", "Female"]
export const CIVIL_STATUSES: CivilStatus[] = ["Single", "Married", "Widowed", "Separated", "Live-in"]
export const RESIDENT_STATUSES: ResidentStatus[] = ["Active", "Moved Out", "Deceased", "Archived"]
export const RELATIONSHIPS: HouseholdRelationship[] = ["Head", "Spouse", "Son", "Daughter", "Parent", "Sibling", "Grandchild", "Relative", "Other"]

export const CLASSIFICATION_LABELS: Record<keyof ResidentClassification, string> = {
  seniorCitizen: "Senior Citizen",
  pwd: "PWD",
  soloParent: "Solo Parent",
  registeredVoter: "Registered Voter",
  indigent: "Indigent",
  student: "Student",
  unemployed: "Unemployed",
}

export const AGE_GROUPS = [
  { label: "0–5", min: 0, max: 5 },
  { label: "6–12", min: 6, max: 12 },
  { label: "13–17", min: 13, max: 17 },
  { label: "18–29", min: 18, max: 29 },
  { label: "30–44", min: 30, max: 44 },
  { label: "45–59", min: 45, max: 59 },
  { label: "60+", min: 60, max: 200 },
] as const

export const HOUSING_TYPES: HousingType[] = ["Concrete", "Semi-Concrete", "Light Materials", "Apartment"]
export const OWNERSHIP_STATUSES: OwnershipStatus[] = ["Owned", "Rented", "Rent-Free with Consent", "Informal Settler"]
export const WATER_SOURCES: WaterSource[] = ["Level III (Piped)", "Level II (Communal)", "Level I (Deep Well)", "Purchased/Refilling"]
export const TOILET_FACILITIES: ToiletFacility[] = ["Water-Sealed (Own)", "Water-Sealed (Shared)", "Pit Latrine", "None"]
export const INCOME_RANGES: IncomeRange[] = ["Below ₱10,000", "₱10,000 – ₱20,000", "₱20,001 – ₱40,000", "₱40,001 – ₱70,000", "Above ₱70,000"]

export const CERTIFICATE_TYPES: CertificateType[] = [
  "Barangay Clearance",
  "Certificate of Residency",
  "Certificate of Indigency",
  "Certificate of Good Moral Character",
  "Business Clearance",
  "First Time Job Seeker Certificate",
]
export const CERTIFICATE_STATUSES: CertificateStatus[] = ["Draft", "Pending", "Approved", "Released", "Cancelled"]

export const CERTIFICATE_PREFIX: Record<CertificateType, string> = {
  "Barangay Clearance": "BC",
  "Certificate of Residency": "CR",
  "Certificate of Indigency": "CI",
  "Certificate of Good Moral Character": "GM",
  "Business Clearance": "BUS",
  "First Time Job Seeker Certificate": "FTJS",
}

export const CERTIFICATE_PURPOSES: Record<CertificateType, string[]> = {
  "Barangay Clearance": [
    "Local employment",
    "Bank account opening",
    "Postal ID application",
    "NBI clearance requirement",
    "Loan application",
    "Travel requirement",
  ],
  "Certificate of Residency": ["School enrollment", "Scholarship application", "PhilHealth registration", "Voter's registration", "SSS requirement"],
  "Certificate of Indigency": [
    "Medical assistance (PCSO)",
    "Burial assistance",
    "Hospital bill discount",
    "DSWD AICS assistance",
    "Free legal assistance (PAO)",
  ],
  "Certificate of Good Moral Character": ["College admission", "Employment requirement", "Scholarship application"],
  "Business Clearance": [
    "New business permit – sari-sari store",
    "Renewal of business permit",
    "New business permit – food stall",
    "Renewal – water refilling station",
  ],
  "First Time Job Seeker Certificate": ["First-time job application (RA 11261)"],
}

export const SERVICE_TYPES: ServiceType[] = [
  "Barangay Clearance",
  "Residency Certificate",
  "Indigency Certificate",
  "Business Clearance",
  "Good Moral Certificate",
  "First Time Job Seeker Certificate",
  "Other Service",
]

export const SERVICE_TO_CERTIFICATE: Partial<Record<ServiceType, CertificateType>> = {
  "Barangay Clearance": "Barangay Clearance",
  "Residency Certificate": "Certificate of Residency",
  "Indigency Certificate": "Certificate of Indigency",
  "Business Clearance": "Business Clearance",
  "Good Moral Certificate": "Certificate of Good Moral Character",
  "First Time Job Seeker Certificate": "First Time Job Seeker Certificate",
}

export const REQUEST_STATUSES: RequestStatus[] = ["Submitted", "Under Review", "Approved", "Ready for Release", "Completed", "Rejected"]
export const REQUEST_FLOW: RequestStatus[] = ["Submitted", "Under Review", "Approved", "Ready for Release", "Completed"]
export const REQUEST_CHANNELS: RequestChannel[] = ["Walk-in", "Online", "Phone"]

export const BLOTTER_STATUSES: BlotterStatus[] = ["Reported", "Under Investigation", "For Mediation", "Settled", "Referred", "Closed"]
export const BLOTTER_FLOW: BlotterStatus[] = ["Reported", "Under Investigation", "For Mediation", "Settled", "Closed"]
export const BLOTTER_INCIDENT_TYPES: BlotterIncidentType[] = [
  "Physical Injury",
  "Verbal Altercation",
  "Unpaid Debt",
  "Property Dispute",
  "Noise Complaint",
  "Trespassing",
  "Threat",
  "Damage to Property",
  "Domestic Dispute",
  "Other",
]

export const INCIDENT_TYPES: IncidentType[] = ["Theft", "Public Disturbance", "Accident", "Fire", "Vehicular Incident", "Vandalism", "Missing Person", "Other"]
export const INCIDENT_STATUSES: IncidentStatus[] = ["Reported", "Investigating", "Resolved", "Closed"]
export const INCIDENT_SEVERITIES: IncidentSeverity[] = ["Low", "Moderate", "High"]

export const OFFICIAL_POSITIONS: OfficialPosition[] = [
  "Punong Barangay",
  "Kagawad",
  "SK Chairperson",
  "Barangay Secretary",
  "Barangay Treasurer",
  "Barangay Tanod",
  "Staff",
]
export const OFFICIAL_STATUSES: OfficialStatus[] = ["Active", "On Leave", "Inactive"]

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = ["General", "Emergency", "Health", "Community", "Public Service"]
export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = ["All Residents", "Selected Purok", "Senior Citizens", "Youth"]
export const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ["Draft", "Published", "Archived"]

export const ROLES: Role[] = ["Administrator", "Secretary", "Treasurer"]
export const USER_STATUSES: UserStatus[] = ["Active", "Invited", "Suspended"]

export const AUDIT_MODULES: AuditModule[] = [
  "Residents",
  "Households",
  "Certificates",
  "Service Requests",
  "Blotter",
  "Incidents",
  "Officials",
  "Announcements",
  "Users",
  "Settings",
  "Auth",
  "Budget",
  "Fund Sources",
  "PPAs",
  "Collections",
  "Obligations",
  "Disbursements",
  "Expenses",
  "Sessions",
  "Minutes",
  "Ordinances",
  "Resolutions",
  "Committees",
  "Assemblies",
  "Projects",
  "Assets",
  "Inventory",
  "Reports",
  "Access",
]
export const AUDIT_ACTIONS: AuditAction[] = [
  "Created",
  "Updated",
  "Archived",
  "Approved",
  "Rejected",
  "Released",
  "Issued",
  "Cancelled",
  "Status Changed",
  "Hearing Scheduled",
  "Closed",
  "Published",
  "Logged In",
  "Submitted",
  "Returned",
  "Recorded",
  "Deposited",
  "Reconciled",
  "Assigned",
  "Stock In",
  "Stock Out",
  "Adjusted",
  "Printed",
  "Exported",
  "Logged Out",
  "Granted",
  "Revoked",
]

/** Build `{label, value}` options from a string list. */
export const toOptions = <T extends string>(values: readonly T[]) => values.map((v) => ({ label: v, value: v }))

/* -------------------------------------------------------------------------- */
/* Phase 2 — Finance, Governance, Operations                                  */
/* -------------------------------------------------------------------------- */

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  "General Administration",
  "Peace and Order",
  "Health",
  "Social Services",
  "Infrastructure",
  "DRRM",
  "Environmental Programs",
  "Youth Development",
  "Community Programs",
  "Other Services",
]
export const BUDGET_STATUSES: BudgetStatus[] = ["Draft", "For Review", "For Authorization", "Approved", "Active", "Closed"]
export const FUND_SOURCE_TYPES: FundSourceType[] = [
  "National Tax Allotment",
  "Local Collections",
  "Grants",
  "Donations",
  "Municipal / City Assistance",
  "Provincial Assistance",
  "Other Sources",
]
export const PPA_TYPES: PPAType[] = ["Program", "Project", "Activity"]
export const PPA_STATUSES: PPAStatus[] = ["Planned", "Approved", "Ongoing", "Delayed", "Completed", "Cancelled"]
export const COLLECTION_TYPES: CollectionType[] = ["Barangay Clearance", "Certification Fee", "Business Clearance", "Facility Fee", "Other Barangay Collection"]
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "GCash", "Maya", "Other"]
export const COLLECTION_STATUSES: CollectionStatus[] = ["Recorded", "Deposited", "Reconciled", "Cancelled"]
export const OBLIGATION_STATUSES: ObligationStatus[] = ["Draft", "For Review", "Approved", "Partially Disbursed", "Fully Disbursed", "Cancelled"]
export const DISBURSEMENT_STATUSES: DisbursementStatus[] = ["Draft", "For Review", "For Approval", "Approved", "Released", "Cancelled"]
export const DISBURSEMENT_METHODS: DisbursementMethod[] = ["Check", "Cash", "Bank Transfer", "Other"]

/** Obligation statuses that commit budget (reduce the available balance). */
export const COMMITTED_OBLIGATION_STATUSES: ObligationStatus[] = ["Approved", "Partially Disbursed", "Fully Disbursed"]

export const SESSION_TYPES: SessionType[] = ["Regular", "Special", "Emergency"]
export const SESSION_STATUSES: SessionStatus[] = ["Scheduled", "Ongoing", "Completed", "Cancelled"]
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["Present", "Late", "Excused", "Absent"]
export const AGENDA_ITEM_TYPES: AgendaItemType[] = ["Preliminaries", "Report", "Legislation", "Budget", "Other Matters"]
export const MOTION_RESULTS: MotionResult[] = ["Carried", "Lost", "Deferred", "Withdrawn"]
export const ORDINANCE_STATUSES: OrdinanceStatus[] = ["Draft", "Under Review", "Approved", "Effective", "Repealed", "Archived"]
export const RESOLUTION_STATUSES: ResolutionStatus[] = ["Draft", "Proposed", "Approved", "Rejected", "Archived"]
export const ASSEMBLY_STATUSES: AssemblyStatus[] = ["Scheduled", "Completed", "Cancelled"]

export const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Approved", "Procurement", "Ongoing", "Delayed", "Completed", "Cancelled"]
export const MILESTONE_STATUSES: MilestoneStatus[] = ["Pending", "In Progress", "Completed", "Delayed"]
export const ASSET_CATEGORIES: AssetCategory[] = [
  "IT Equipment",
  "Office Equipment",
  "Communication",
  "Security",
  "Furniture",
  "Power",
  "Vehicle",
  "Rescue Equipment",
  "Medical Equipment",
]
export const ASSET_CONDITIONS: AssetCondition[] = ["Excellent", "Good", "Fair", "Poor", "For Repair", "Unserviceable"]
export const ASSET_STATUSES: AssetStatus[] = ["Active", "In Storage", "Under Maintenance", "Disposed"]
export const INVENTORY_CATEGORIES: InventoryCategory[] = ["Office Supplies", "Cleaning Supplies", "Relief Supplies", "Medical Supplies", "Maintenance Supplies"]
