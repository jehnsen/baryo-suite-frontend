import type {
  Announcement,
  AuditLog,
  BarangayOfficial,
  BarangaySettings,
  BlotterCase,
  Certificate,
  Household,
  Incident,
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
  session: { currentUserId: string }
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
  session: { currentUserId: "usr-001" },
})

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStoreSelector(appStore, selector)
}
