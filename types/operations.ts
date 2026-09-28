import type { Attachment, ID, StatusChange } from "./index"

/* Operations (Phase 2): projects, assets and inventory. */

export type ProjectStatus = "Planning" | "Approved" | "Procurement" | "Ongoing" | "Delayed" | "Completed" | "Cancelled"
export type MilestoneStatus = "Pending" | "In Progress" | "Completed" | "Delayed"

export interface ProjectMilestone {
  id: ID
  title: string
  targetDate: string
  completionDate?: string
  progress: number
  status: MilestoneStatus
  remarks?: string
}

/**
 * Execution record of a Project-type PPA. Budget, fund source and financial
 * progress come from the PPA and the finance ledger — never stored here.
 */
export interface Project {
  id: ID
  code: string
  name: string
  description: string
  ppaId: ID
  location: string
  contractor: string
  responsibleOfficialId: ID
  startDate: string
  targetDate: string
  actualCompletion?: string
  physicalProgress: number
  status: ProjectStatus
  milestones: ProjectMilestone[]
  attachments: Attachment[]
  history: StatusChange<ProjectStatus>[]
}

export type AssetCategory =
  | "IT Equipment"
  | "Office Equipment"
  | "Communication"
  | "Security"
  | "Furniture"
  | "Power"
  | "Vehicle"
  | "Rescue Equipment"
  | "Medical Equipment"

export type AssetCondition = "Excellent" | "Good" | "Fair" | "Poor" | "For Repair" | "Unserviceable"
export type AssetStatus = "Active" | "In Storage" | "Under Maintenance" | "Disposed"

export interface MaintenanceRecord {
  id: ID
  date: string
  type: "Preventive" | "Repair" | "Inspection"
  description: string
  cost: number
  performedBy: string
}

export interface ConditionChange {
  date: string
  condition: AssetCondition
  remarks?: string
  byUserId: ID
}

export interface Asset {
  id: ID
  assetNumber: string
  name: string
  category: AssetCategory
  description?: string
  serialNumber?: string
  acquisitionDate: string
  acquisitionCost: number
  source: string
  /** Accountable official (property custodian). */
  custodianId: ID
  location: string
  condition: AssetCondition
  status: AssetStatus
  maintenance: MaintenanceRecord[]
  conditionHistory: ConditionChange[]
  attachments: Attachment[]
  /** Disbursement that paid for the asset, when purchased from the barangay fund. */
  disbursementId?: ID
}

export type InventoryCategory = "Office Supplies" | "Cleaning Supplies" | "Relief Supplies" | "Medical Supplies" | "Maintenance Supplies"
export type InventoryTransactionType = "Stock In" | "Stock Out" | "Adjustment"

/** Consumable item. Quantity on hand is derived from its transactions. */
export interface InventoryItem {
  id: ID
  code: string
  name: string
  category: InventoryCategory
  unit: string
  reorderLevel: number
  location: string
}

export interface InventoryTransaction {
  id: ID
  itemId: ID
  type: InventoryTransactionType
  /** Positive for Stock In/Out; signed (+/−) for Adjustment. */
  quantity: number
  date: string
  reference?: string
  issuedTo?: string
  remarks?: string
  byUserId: ID
}
