import type {
  Announcement,
  AnnouncementStatus,
  AuditAction,
  AuditModule,
  BarangayOfficial,
  BarangaySettings,
  BlotterCase,
  BlotterStatus,
  Certificate,
  CertificateStatus,
  Hearing,
  Household,
  HouseholdRelationship,
  Incident,
  IncidentStatus,
  RequestStatus,
  Resident,
  ServiceRequest,
  User,
} from "@/types"
import { CERTIFICATE_PREFIX, SERVICE_TO_CERTIFICATE } from "@/lib/constants"
import { fullName, toISODate } from "@/lib/format"
import { appStore, type AppState } from "./app-store"

/**
 * All mutations go through these functions. They are the seam where real API
 * calls will be plugged in later: keep signatures, replace bodies.
 */

let seq = 0
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`
const now = () => new Date().toISOString()
const today = () => toISODate(new Date())
const year = () => new Date().getFullYear()

function nextNumber(existing: string[], prefix: string, width = 4): string {
  const re = new RegExp(`^${prefix}-${year()}-(\\d+)$`)
  const max = existing.reduce((m, n) => {
    const match = n.match(re)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return `${prefix}-${year()}-${String(max + 1).padStart(width, "0")}`
}

const set = appStore.setState
const get = appStore.getState
const currentUserId = () => get().session.currentUserId

function log(action: AuditAction, module: AuditModule, recordLabel: string, details: string, recordId?: string) {
  const entry = {
    id: newId("log"),
    timestamp: now(),
    userId: currentUserId(),
    action,
    module,
    recordId,
    recordLabel,
    details,
    ipAddress: "192.168.1.24",
  }
  set((s) => ({ ...s, auditLogs: [entry, ...s.auditLogs] }))
}

function patchIn<K extends keyof AppState, T extends { id: string }>(key: K, id: string, patch: (item: T) => T) {
  set((s) => ({ ...s, [key]: (s[key] as unknown as T[]).map((item) => (item.id === id ? patch(item) : item)) }))
}

const residentName = (id: string) => fullName(get().residents.find((r) => r.id === id))

/* -------------------------------------------------------------------------- */

export type ResidentInput = Omit<Resident, "id" | "residentNumber" | "createdAt" | "updatedAt" | "status"> & {
  status?: Resident["status"]
}

export const residentActions = {
  create(input: ResidentInput): Resident {
    const residentNumber = nextNumber(
      get().residents.map((r) => r.residentNumber),
      "SRQ",
      5,
    )
    const resident: Resident = { status: "Active", ...input, id: newId("res"), residentNumber, createdAt: now(), updatedAt: now() }
    set((s) => ({ ...s, residents: [resident, ...s.residents] }))
    log("Created", "Residents", `${fullName(resident)} (${residentNumber})`, `Registered new resident in ${resident.address.purok}.`, resident.id)
    return resident
  },
  update(id: string, patch: Partial<Resident>) {
    patchIn<"residents", Resident>("residents", id, (r) => ({ ...r, ...patch, updatedAt: now() }))
    log("Updated", "Residents", residentName(id), "Resident profile updated.", id)
  },
  archive(id: string) {
    patchIn<"residents", Resident>("residents", id, (r) => ({ ...r, status: "Archived", updatedAt: now() }))
    log("Archived", "Residents", residentName(id), "Resident record archived.", id)
  },
  restore(id: string) {
    patchIn<"residents", Resident>("residents", id, (r) => ({ ...r, status: "Active", updatedAt: now() }))
    log("Updated", "Residents", residentName(id), "Resident record restored to Active.", id)
  },
}

/* -------------------------------------------------------------------------- */

export type HouseholdInput = Omit<Household, "id" | "householdNumber" | "createdAt">
export interface MemberAssignment {
  residentId: string
  relationship: HouseholdRelationship
}

export const householdActions = {
  create(input: HouseholdInput, members: MemberAssignment[] = []): Household {
    const purokNo = input.address.purok.replace(/\D/g, "").padStart(2, "0")
    const prefix = `HH-${purokNo}-`
    const max = get().households.reduce((m, h) => (h.householdNumber.startsWith(prefix) ? Math.max(m, Number(h.householdNumber.slice(prefix.length))) : m), 0)
    const household: Household = { ...input, id: newId("hh"), householdNumber: `${prefix}${String(max + 1).padStart(3, "0")}`, createdAt: now() }
    set((s) => ({ ...s, households: [household, ...s.households] }))
    householdActions.assignMembers(
      household.id,
      [{ residentId: input.headId, relationship: "Head" }, ...members.filter((m) => m.residentId !== input.headId)],
      { silent: true },
    )
    log("Created", "Households", household.householdNumber, `Household created with head ${residentName(input.headId)}.`, household.id)
    return household
  },
  update(id: string, patch: Partial<Household>) {
    const prev = get().households.find((h) => h.id === id)
    patchIn<"households", Household>("households", id, (h) => ({ ...h, ...patch }))
    if (patch.headId && prev && patch.headId !== prev.headId) {
      householdActions.assignMembers(id, [{ residentId: patch.headId, relationship: "Head" }], { silent: true })
    }
    log("Updated", "Households", prev?.householdNumber ?? id, "Household details updated.", id)
  },
  assignMembers(householdId: string, members: MemberAssignment[], opts: { silent?: boolean } = {}) {
    const household = get().households.find((h) => h.id === householdId)
    if (!household) return
    const byId = new Map(members.map((m) => [m.residentId, m.relationship]))
    set((s) => ({
      ...s,
      residents: s.residents.map((r) =>
        byId.has(r.id) ? { ...r, householdId, relationshipToHead: byId.get(r.id), address: { ...household.address }, updatedAt: now() } : r,
      ),
    }))
    if (!opts.silent) {
      log(
        "Updated",
        "Households",
        household.householdNumber,
        `Assigned ${members.map((m) => residentName(m.residentId)).join(", ")} to household.`,
        householdId,
      )
    }
  },
  removeMember(residentId: string) {
    const r = get().residents.find((x) => x.id === residentId)
    const hh = get().households.find((h) => h.id === r?.householdId)
    patchIn<"residents", Resident>("residents", residentId, (x) => ({ ...x, householdId: undefined, relationshipToHead: undefined, updatedAt: now() }))
    log("Updated", "Households", hh?.householdNumber ?? "—", `Removed ${residentName(residentId)} from household.`, hh?.id)
  },
}

/* -------------------------------------------------------------------------- */

export type CertificateInput = Omit<Certificate, "id" | "certificateNumber" | "createdAt" | "status"> & { status?: CertificateStatus }

export const certificateActions = {
  create(input: CertificateInput): Certificate {
    const prefix = CERTIFICATE_PREFIX[input.type]
    const certificate: Certificate = {
      status: "Pending",
      ...input,
      id: newId("crt"),
      certificateNumber: nextNumber(
        get().certificates.map((c) => c.certificateNumber),
        prefix,
      ),
      createdAt: now(),
    }
    set((s) => ({ ...s, certificates: [certificate, ...s.certificates] }))
    log(
      "Created",
      "Certificates",
      `${certificate.certificateNumber} – ${residentName(input.residentId)}`,
      `${input.type} prepared (${certificate.status}).`,
      certificate.id,
    )
    return certificate
  },
  update(id: string, patch: Partial<Certificate>) {
    const cert = get().certificates.find((c) => c.id === id)
    patchIn<"certificates", Certificate>("certificates", id, (c) => ({ ...c, ...patch }))
    log("Updated", "Certificates", `${cert?.certificateNumber} – ${residentName(cert?.residentId ?? "")}`, "Certificate details updated.", id)
  },
  setStatus(id: string, status: CertificateStatus, extra: Partial<Certificate> = {}) {
    const cert = get().certificates.find((c) => c.id === id)
    if (!cert) return
    patchIn<"certificates", Certificate>("certificates", id, (c) => ({ ...c, ...extra, status, dateIssued: status === "Released" ? today() : c.dateIssued }))
    const action: AuditAction = status === "Approved" ? "Approved" : status === "Released" ? "Issued" : status === "Cancelled" ? "Cancelled" : "Status Changed"
    log(action, "Certificates", `${cert.certificateNumber} – ${residentName(cert.residentId)}`, `${cert.type} marked as ${status}.`, id)

    // Keep the linked service request in sync with the document lifecycle.
    if (cert.requestId) {
      if (status === "Approved") requestActions.setStatus(cert.requestId, "Ready for Release", "Certificate approved and signed.", { silentCascade: true })
      if (status === "Released")
        requestActions.setStatus(cert.requestId, "Completed", `Released ${cert.certificateNumber} to claimant.`, { silentCascade: true })
    }
  },
}

/* -------------------------------------------------------------------------- */

export type RequestInput = Pick<ServiceRequest, "residentId" | "service" | "purpose" | "details" | "channel" | "assignedToId">

export const requestActions = {
  create(input: RequestInput): ServiceRequest {
    const at = now()
    const request: ServiceRequest = {
      ...input,
      id: newId("req"),
      requestNumber: nextNumber(
        get().serviceRequests.map((r) => r.requestNumber),
        "REQ",
      ),
      dateRequested: at,
      status: "Submitted",
      history: [{ status: "Submitted", at, byUserId: currentUserId() }],
      notes: [],
    }
    set((s) => ({ ...s, serviceRequests: [request, ...s.serviceRequests] }))
    log("Created", "Service Requests", `${request.requestNumber} – ${request.service}`, `Request filed for ${residentName(input.residentId)}.`, request.id)
    return request
  },
  setStatus(id: string, status: RequestStatus, note?: string, opts: { silentCascade?: boolean; orNumber?: string } = {}) {
    const req = get().serviceRequests.find((r) => r.id === id)
    if (!req) return
    let certificateId = req.certificateId

    // Approving a document request creates the certificate for processing.
    const certType = SERVICE_TO_CERTIFICATE[req.service]
    if (status === "Approved" && certType && !certificateId && !opts.silentCascade) {
      const conf = get().settings.certificateTypes.find((c) => c.type === certType)
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + (conf?.validityDays ?? 90))
      const cert = certificateActions.create({
        residentId: req.residentId,
        type: certType,
        purpose: req.purpose,
        dateIssued: today(),
        validUntil: toISODate(validUntil),
        issuedById: get().settings.secretaryId,
        fee: conf?.fee ?? 0,
        requestId: req.id,
        status: "Pending",
      })
      certificateId = cert.id
    }

    patchIn<"serviceRequests", ServiceRequest>("serviceRequests", id, (r) => ({
      ...r,
      status,
      certificateId,
      assignedToId: r.assignedToId ?? currentUserId(),
      history: [...r.history, { status, at: now(), byUserId: currentUserId(), note }],
    }))
    log(
      status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Status Changed",
      "Service Requests",
      `${req.requestNumber} – ${req.service}`,
      `Status changed to ${status}.${note ? " " + note : ""}`,
      id,
    )

    if (!opts.silentCascade && certificateId && (status === "Ready for Release" || status === "Completed")) {
      const cert = get().certificates.find((c) => c.id === certificateId)
      const target: CertificateStatus = status === "Completed" ? "Released" : "Approved"
      if (cert && cert.status !== target) {
        patchIn<"certificates", Certificate>("certificates", certificateId, (c) => ({
          ...c,
          status: target,
          ...(target === "Released" ? { dateIssued: today(), orNumber: opts.orNumber ?? c.orNumber } : {}),
        }))
        log(
          target === "Released" ? "Issued" : "Approved",
          "Certificates",
          `${cert.certificateNumber} – ${residentName(cert.residentId)}`,
          `${cert.type} marked as ${target} via ${req.requestNumber}.`,
          certificateId,
        )
      }
    }
  },
  assign(id: string, userId: string) {
    const req = get().serviceRequests.find((r) => r.id === id)
    patchIn<"serviceRequests", ServiceRequest>("serviceRequests", id, (r) => ({ ...r, assignedToId: userId }))
    const user = get().users.find((u) => u.id === userId)
    log("Updated", "Service Requests", req?.requestNumber ?? id, `Assigned to ${user?.name ?? userId}.`, id)
  },
  addNote(id: string, body: string) {
    patchIn<"serviceRequests", ServiceRequest>("serviceRequests", id, (r) => ({
      ...r,
      notes: [...r.notes, { id: newId("note"), authorId: currentUserId(), body, createdAt: now() }],
    }))
  },
}

/* -------------------------------------------------------------------------- */

export type BlotterInput = Omit<BlotterCase, "id" | "blotterNumber" | "createdAt" | "history" | "hearings" | "notes" | "attachments" | "status"> & {
  attachments?: BlotterCase["attachments"]
}

export const blotterActions = {
  create(input: BlotterInput): BlotterCase {
    const at = now()
    const blotter: BlotterCase = {
      attachments: [],
      ...input,
      id: newId("blt"),
      blotterNumber: nextNumber(
        get().blotters.map((b) => b.blotterNumber),
        "BLT",
      ),
      status: "Reported",
      hearings: [],
      notes: [],
      history: [{ status: "Reported", at, byUserId: currentUserId() }],
      createdAt: at,
    }
    set((s) => ({ ...s, blotters: [blotter, ...s.blotters] }))
    log(
      "Created",
      "Blotter",
      `${blotter.blotterNumber} – ${blotter.incidentType}`,
      `Blotter entry recorded. Complainant: ${blotter.complainant.name}.`,
      blotter.id,
    )
    return blotter
  },
  update(id: string, patch: Partial<BlotterCase>) {
    const b = get().blotters.find((x) => x.id === id)
    patchIn<"blotters", BlotterCase>("blotters", id, (x) => ({ ...x, ...patch }))
    log("Updated", "Blotter", b?.blotterNumber ?? id, "Case details updated.", id)
  },
  setStatus(id: string, status: BlotterStatus, note?: string) {
    const b = get().blotters.find((x) => x.id === id)
    patchIn<"blotters", BlotterCase>("blotters", id, (x) => ({ ...x, status, history: [...x.history, { status, at: now(), byUserId: currentUserId(), note }] }))
    log(
      status === "Closed" ? "Closed" : "Status Changed",
      "Blotter",
      `${b?.blotterNumber} – ${b?.incidentType}`,
      `Case status changed to ${status}.${note ? " " + note : ""}`,
      id,
    )
  },
  scheduleHearing(id: string, hearing: Omit<Hearing, "id" | "status">) {
    const b = get().blotters.find((x) => x.id === id)
    patchIn<"blotters", BlotterCase>("blotters", id, (x) => ({
      ...x,
      status: x.status === "Reported" || x.status === "Under Investigation" ? "For Mediation" : x.status,
      history:
        x.status === "Reported" || x.status === "Under Investigation"
          ? [...x.history, { status: "For Mediation" as const, at: now(), byUserId: currentUserId(), note: `${hearing.type} hearing scheduled.` }]
          : x.history,
      hearings: [...x.hearings, { ...hearing, id: newId("hr"), status: "Scheduled" }],
    }))
    log("Hearing Scheduled", "Blotter", b?.blotterNumber ?? id, `${hearing.type} hearing on ${hearing.date} at ${hearing.time}.`, id)
  },
  addNote(id: string, body: string) {
    patchIn<"blotters", BlotterCase>("blotters", id, (x) => ({
      ...x,
      notes: [...x.notes, { id: newId("note"), authorId: currentUserId(), body, createdAt: now() }],
    }))
  },
}

/* -------------------------------------------------------------------------- */

export type IncidentInput = Omit<Incident, "id" | "incidentNumber" | "createdAt" | "history" | "status" | "blotterId">

export const incidentActions = {
  create(input: IncidentInput): Incident {
    const at = now()
    const incident: Incident = {
      ...input,
      id: newId("inc"),
      incidentNumber: nextNumber(
        get().incidents.map((i) => i.incidentNumber),
        "INC",
      ),
      status: "Reported",
      history: [{ status: "Reported", at, byUserId: currentUserId() }],
      createdAt: at,
    }
    set((s) => ({ ...s, incidents: [incident, ...s.incidents] }))
    log("Created", "Incidents", `${incident.incidentNumber} – ${incident.type}`, `Incident reported at ${incident.location}.`, incident.id)
    return incident
  },
  update(id: string, patch: Partial<Incident>) {
    const i = get().incidents.find((x) => x.id === id)
    patchIn<"incidents", Incident>("incidents", id, (x) => ({ ...x, ...patch }))
    log("Updated", "Incidents", i?.incidentNumber ?? id, "Incident details updated.", id)
  },
  setStatus(id: string, status: IncidentStatus) {
    const i = get().incidents.find((x) => x.id === id)
    patchIn<"incidents", Incident>("incidents", id, (x) => ({ ...x, status, history: [...x.history, { status, at: now(), byUserId: currentUserId() }] }))
    log(status === "Closed" ? "Closed" : "Status Changed", "Incidents", `${i?.incidentNumber} – ${i?.type}`, `Status changed to ${status}.`, id)
  },
  linkBlotter(id: string, blotterId: string) {
    patchIn<"incidents", Incident>("incidents", id, (x) => ({ ...x, blotterId }))
  },
}

/* -------------------------------------------------------------------------- */

export type OfficialInput = Omit<BarangayOfficial, "id" | "rank">

export const officialActions = {
  create(input: OfficialInput): BarangayOfficial {
    const official: BarangayOfficial = { ...input, id: newId("off"), rank: get().officials.length + 1 }
    set((s) => ({ ...s, officials: [...s.officials, official] }))
    log("Created", "Officials", fullName(official), `Added ${official.position}.`, official.id)
    return official
  },
  update(id: string, patch: Partial<BarangayOfficial>) {
    patchIn<"officials", BarangayOfficial>("officials", id, (o) => ({ ...o, ...patch }))
    log("Updated", "Officials", fullName(get().officials.find((o) => o.id === id)), "Official profile updated.", id)
  },
}

/* -------------------------------------------------------------------------- */

export type AnnouncementInput = Omit<Announcement, "id" | "createdAt" | "authorId">

export const announcementActions = {
  create(input: AnnouncementInput): Announcement {
    const a: Announcement = { ...input, id: newId("ann"), authorId: currentUserId(), createdAt: now() }
    set((s) => ({ ...s, announcements: [a, ...s.announcements] }))
    log(a.status === "Published" ? "Published" : "Created", "Announcements", a.title, `${a.status} for ${a.audience}.`, a.id)
    return a
  },
  update(id: string, patch: Partial<Announcement>) {
    patchIn<"announcements", Announcement>("announcements", id, (a) => ({ ...a, ...patch }))
    log("Updated", "Announcements", get().announcements.find((a) => a.id === id)?.title ?? id, "Announcement updated.", id)
  },
  setStatus(id: string, status: AnnouncementStatus) {
    patchIn<"announcements", Announcement>("announcements", id, (a) => ({ ...a, status }))
    log(
      status === "Published" ? "Published" : status === "Archived" ? "Archived" : "Updated",
      "Announcements",
      get().announcements.find((a) => a.id === id)?.title ?? id,
      `Marked as ${status}.`,
      id,
    )
  },
}

/* -------------------------------------------------------------------------- */

export type UserInput = Pick<User, "name" | "email" | "role" | "officialId">

export const userActions = {
  invite(input: UserInput): User {
    const user: User = { ...input, id: newId("usr"), status: "Invited", createdAt: now() }
    set((s) => ({ ...s, users: [...s.users, user] }))
    log("Created", "Users", user.email, `Invited user with role ${user.role}.`, user.id)
    return user
  },
  update(id: string, patch: Partial<User>) {
    const prev = get().users.find((u) => u.id === id)
    patchIn<"users", User>("users", id, (u) => ({ ...u, ...patch }))
    const changes = [
      patch.role && patch.role !== prev?.role ? `role ${prev?.role} → ${patch.role}` : null,
      patch.status && patch.status !== prev?.status ? `status ${prev?.status} → ${patch.status}` : null,
    ].filter(Boolean)
    log("Updated", "Users", prev?.email ?? id, changes.length ? `Changed ${changes.join(", ")}.` : "User details updated.", id)
  },
}

/* -------------------------------------------------------------------------- */

export const settingsActions = {
  update(patch: Partial<BarangaySettings>, section = "Barangay profile") {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    log("Updated", "Settings", section, `${section} updated.`)
  },
}

export const sessionActions = {
  switchUser(userId: string) {
    set((s) => ({ ...s, session: { currentUserId: userId } }))
  },
}

/** Simulated network latency for mock mutations. */
export const simulateLatency = (ms = 550) => new Promise((resolve) => setTimeout(resolve, ms))
