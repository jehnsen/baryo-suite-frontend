import type {
  AnnualBudget,
  Asset,
  BarangayAssembly,
  BarangaySession,
  BudgetAllocation,
  Collection,
  Committee,
  Disbursement,
  Expense,
  FundSource,
  InventoryItem,
  InventoryTransaction,
  MeetingMinutes,
  Obligation,
  Ordinance,
  PPA,
  Project,
  Resolution,
  Announcement,
  AuditLog,
  BarangayOfficial,
  BarangaySettings,
  BlotterCase,
  Certificate,
  Household,
  Incident,
  ReportRun,
  Resident,
  ServiceRequest,
  User,
} from "@/types"
import * as mock from "@/data/mock"
import { createStore, useStoreSelector } from "./create-store"

export interface AppState {
  residents: Resident[]
  households: Household[]
  certificates: Certificate[]
  serviceRequests: ServiceRequest[]
  blotters: BlotterCase[]
  incidents: Incident[]
  officials: BarangayOfficial[]
  announcements: Announcement[]
  users: User[]
  auditLogs: AuditLog[]
  settings: BarangaySettings
  // Phase 2 — finance
  budgets: AnnualBudget[]
  allocations: BudgetAllocation[]
  fundSources: FundSource[]
  ppas: PPA[]
  collections: Collection[]
  obligations: Obligation[]
  disbursements: Disbursement[]
  expenses: Expense[]
  // Phase 2 — governance
  sessions: BarangaySession[]
  minutes: MeetingMinutes[]
  ordinances: Ordinance[]
  resolutions: Resolution[]
  committees: Committee[]
  assemblies: BarangayAssembly[]
  // Phase 2 — operations
  projects: Project[]
  assets: Asset[]
  inventoryItems: InventoryItem[]
  inventoryTransactions: InventoryTransaction[]
  // Phase 3 — printed/exported report history (reports themselves are derived)
  reportRuns: ReportRun[]
  /** fiscalYear is the finance context shared by every finance screen. */
  session: { currentUserId: string; fiscalYear: number }
}

export const appStore = createStore<AppState>({
  residents: mock.residents,
  households: mock.households,
  certificates: mock.certificates,
  serviceRequests: mock.serviceRequests,
  blotters: mock.blotters,
  incidents: mock.incidents,
  officials: mock.officials,
  announcements: mock.announcements,
  users: mock.users,
  auditLogs: mock.auditLogs,
  settings: mock.barangaySettings,
  budgets: mock.budgets,
  allocations: mock.allocations,
  fundSources: mock.fundSources,
  ppas: mock.ppas,
  collections: mock.collections,
  obligations: mock.obligations,
  disbursements: mock.disbursements,
  expenses: mock.expenses,
  sessions: mock.sessions,
  minutes: mock.minutes,
  ordinances: mock.ordinances,
  resolutions: mock.resolutions,
  committees: mock.committees,
  assemblies: mock.assemblies,
  projects: mock.projects,
  assets: mock.assets,
  inventoryItems: mock.inventoryItems,
  inventoryTransactions: mock.inventoryTransactions,
  reportRuns: mock.reportRuns,
  session: { currentUserId: "usr-001", fiscalYear: 2026 },
})

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStoreSelector(appStore, selector)
}
