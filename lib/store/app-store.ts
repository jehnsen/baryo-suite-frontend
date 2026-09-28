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
  AccessGrant,
  ReportRun,
  Resident,
  ServiceRequest,
  User,
} from "@/types"
import * as mock from "@/data/mock"
import { readSessionCookie } from "@/lib/auth"
import { loadStoredGrants } from "./grant-storage"
import { createStore, useStoreSelector } from "./create-store"

// In the browser the store starts from the session cookie and saved grants. The server
// renders the app shell signed-out (SessionGate shows a loader until the client takes over).
const isBrowser = typeof window !== "undefined"

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
  /** Module grants to the Secretary/Treasurer (persisted in the browser; see SessionGate). */
  accessGrants: AccessGrant[]
  /** currentUserId is "" when signed out; fiscalYear is the finance context shared by every finance screen. */
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
  accessGrants: (isBrowser && loadStoredGrants()) || mock.accessGrants,
  session: { currentUserId: (isBrowser && readSessionCookie()) || "", fiscalYear: 2026 },
})

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStoreSelector(appStore, selector)
}
