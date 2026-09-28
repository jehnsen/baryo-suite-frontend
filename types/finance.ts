import type { Attachment, ID, StatusChange } from "./index"

/* Finance & Treasury (Phase 2). Amounts are PHP numbers; dates are ISO strings. */

export type BudgetCategory =
  | "General Administration"
  | "Peace and Order"
  | "Health"
  | "Social Services"
  | "Infrastructure"
  | "DRRM"
  | "Environmental Programs"
  | "Youth Development"
  | "Community Programs"
  | "Other Services"

export type BudgetStatus = "Draft" | "For Review" | "For Authorization" | "Approved" | "Active" | "Closed"

export interface AnnualBudget {
  id: ID
  fiscalYear: number
  title: string
  estimatedIncome: number
  approvedBudget: number
  status: BudgetStatus
  approvalDate?: string
  /** Appropriation ordinance that enacted this budget. */
  ordinanceId?: ID
  notes?: string
  history: StatusChange<BudgetStatus>[]
  createdAt: string
}

/** Share of an annual budget for one category. Obligated/disbursed are derived, never stored. */
export interface BudgetAllocation {
  id: ID
  budgetId: ID
  category: BudgetCategory
  approvedAmount: number
  /** Set when a supplemental budget or realignment changes the allocation. */
  revisedAmount?: number
  remarks?: string
}

export type FundSourceType =
  "National Tax Allotment" | "Local Collections" | "Grants" | "Donations" | "Municipal / City Assistance" | "Provincial Assistance" | "Other Sources"

export interface FundSource {
  id: ID
  name: string
  type: FundSourceType
  description: string
  amount: number
  fiscalYear: number
  dateReceived: string
  referenceNumber: string
}

export type PPAType = "Program" | "Project" | "Activity"
export type PPAStatus = "Planned" | "Approved" | "Ongoing" | "Delayed" | "Completed" | "Cancelled"

/** Program, Project or Activity funded from a budget allocation. */
export interface PPA {
  id: ID
  code: string
  name: string
  type: PPAType
  description: string
  budgetId: ID
  category: BudgetCategory
  approvedBudget: number
  revisedBudget?: number
  fundSourceId: ID
  committeeId?: ID
  responsibleOfficialId: ID
  startDate: string
  targetCompletion: string
  status: PPAStatus
  /** Physical accomplishment for programs/activities; projects use Project.physicalProgress. */
  physicalProgress: number
}

export type CollectionType = "Barangay Clearance" | "Certification Fee" | "Business Clearance" | "Facility Fee" | "Other Barangay Collection"
export type PaymentMethod = "Cash" | "Bank Transfer" | "GCash" | "Maya" | "Other"
export type CollectionStatus = "Recorded" | "Deposited" | "Reconciled" | "Cancelled"

export interface Collection {
  id: ID
  transactionNumber: string
  orNumber: string
  date: string
  payerName: string
  residentId?: ID
  businessName?: string
  type: CollectionType
  description: string
  amount: number
  paymentMethod: PaymentMethod
  /** User who received the payment. */
  collectorId: ID
  status: CollectionStatus
  certificateId?: ID
  depositReference?: string
  createdAt: string
}

export type ObligationStatus = "Draft" | "For Review" | "Approved" | "Partially Disbursed" | "Fully Disbursed" | "Cancelled"

/** Obligation Request (ObR). Budget category is derived from the PPA. */
export interface Obligation {
  id: ID
  obligationNumber: string
  date: string
  payee: string
  description: string
  ppaId: ID
  fundSourceId: ID
  amount: number
  attachments: Attachment[]
  /** Official who requested the obligation. */
  requestedById: ID
  status: ObligationStatus
  history: StatusChange<ObligationStatus>[]
  createdAt: string
}

export type DisbursementStatus = "Draft" | "For Review" | "For Approval" | "Approved" | "Released" | "Cancelled"
export type DisbursementMethod = "Check" | "Cash" | "Bank Transfer" | "Other"

/** Disbursement Voucher (DV). PPA and category are derived through the obligation. */
export interface Disbursement {
  id: ID
  disbursementNumber: string
  voucherNumber: string
  date: string
  payee: string
  obligationId: ID
  fundSourceId: ID
  amount: number
  paymentMethod: DisbursementMethod
  referenceNumber?: string
  attachments: Attachment[]
  remarks?: string
  status: DisbursementStatus
  history: StatusChange<DisbursementStatus>[]
  createdAt: string
}

/** Recorded when a disbursement is released. */
export interface Expense {
  id: ID
  expenseNumber: string
  date: string
  category: BudgetCategory
  ppaId?: ID
  payee: string
  description: string
  amount: number
  fundSourceId: ID
  reference: string
  attachments: Attachment[]
  disbursementId?: ID
}
