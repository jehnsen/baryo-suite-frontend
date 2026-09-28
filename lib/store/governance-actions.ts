import type {
  BarangayAssembly,
  BarangaySession,
  Committee,
  MeetingMinutes,
  MinutesStatus,
  Ordinance,
  OrdinanceStatus,
  Resolution,
  ResolutionStatus,
  SessionStatus,
} from "@/types"
import { appendAttachments, get, log, newId, now, patchIn, set, statusEntry, today } from "./helpers"

/* Governance mutations. Legislation stores its sessionId; sessions never duplicate that link. */

export type SessionInput = Omit<BarangaySession, "id" | "createdAt" | "status" | "motions" | "decisions"> &
  Partial<Pick<BarangaySession, "motions" | "decisions">>

export const barangaySessionActions = {
  create(input: SessionInput): BarangaySession {
    const s: BarangaySession = { motions: [], decisions: [], ...input, id: newId("ses"), status: "Scheduled", createdAt: now() }
    set((st) => ({ ...st, sessions: [s, ...st.sessions] }))
    log("Created", "Sessions", `${s.sessionNumber} – ${s.title}`, `${s.type} session scheduled on ${s.date}.`, s.id)
    return s
  },
  update(id: string, patch: Partial<BarangaySession>) {
    patchIn<"sessions", BarangaySession>("sessions", id, (s) => ({ ...s, ...patch }))
    log("Updated", "Sessions", get().sessions.find((s) => s.id === id)?.sessionNumber ?? id, "Session record updated.", id)
  },
  setStatus(id: string, status: SessionStatus) {
    patchIn<"sessions", BarangaySession>("sessions", id, (s) => ({ ...s, status }))
    log("Status Changed", "Sessions", get().sessions.find((s) => s.id === id)?.sessionNumber ?? id, `Session marked ${status}.`, id)
  },
}

export const minutesActions = {
  /** Start minutes from a session: one discussion block per agenda item. */
  createForSession(sessionId: string): MeetingMinutes {
    const session = get().sessions.find((s) => s.id === sessionId)!
    const m: MeetingMinutes = {
      id: newId("min"),
      sessionId,
      callToOrder: session.time,
      adjournment: "",
      discussions: session.agenda.map((a) => ({ agendaItemId: a.id, summary: "" })),
      actionItems: [],
      preparedById: get().settings.secretaryId,
      status: "Draft",
      createdAt: now(),
    }
    set((s) => ({ ...s, minutes: [m, ...s.minutes] }))
    log("Created", "Minutes", session.sessionNumber, "Minutes drafted.", m.id)
    return m
  },
  update(id: string, patch: Partial<MeetingMinutes>) {
    patchIn<"minutes", MeetingMinutes>("minutes", id, (m) => ({ ...m, ...patch }))
    const m = get().minutes.find((x) => x.id === id)
    log("Updated", "Minutes", get().sessions.find((s) => s.id === m?.sessionId)?.sessionNumber ?? id, "Minutes updated.", id)
  },
  setStatus(id: string, status: MinutesStatus) {
    patchIn<"minutes", MeetingMinutes>("minutes", id, (m) => ({ ...m, status, approvedAt: status === "Approved" ? now() : m.approvedAt }))
    const m = get().minutes.find((x) => x.id === id)
    log(
      status === "Approved" ? "Approved" : "Submitted",
      "Minutes",
      get().sessions.find((s) => s.id === m?.sessionId)?.sessionNumber ?? id,
      `Minutes marked ${status}.`,
      id,
    )
  },
}

export type OrdinanceInput = Pick<Ordinance, "ordinanceNumber" | "title" | "description" | "sponsorId" | "committeeId" | "sessionId" | "dateIntroduced">

export const ordinanceActions = {
  create(input: OrdinanceInput): Ordinance {
    const o: Ordinance = { ...input, id: newId("ord"), status: "Draft", attachments: [], history: [statusEntry<OrdinanceStatus>("Draft")] }
    set((s) => ({ ...s, ordinances: [o, ...s.ordinances] }))
    log("Created", "Ordinances", o.ordinanceNumber, `Drafted: ${o.title}.`, o.id)
    return o
  },
  update(id: string, patch: Partial<Ordinance>) {
    patchIn<"ordinances", Ordinance>("ordinances", id, (o) => ({ ...o, ...patch }))
    log("Updated", "Ordinances", get().ordinances.find((o) => o.id === id)?.ordinanceNumber ?? id, "Ordinance details updated.", id)
  },
  transition(id: string, to: OrdinanceStatus, remarks?: string, fields: { effectiveDate?: string } = {}) {
    const o = get().ordinances.find((x) => x.id === id)
    patchIn<"ordinances", Ordinance>("ordinances", id, (x) => ({
      ...x,
      status: to,
      dateApproved: to === "Approved" ? today() : x.dateApproved,
      effectiveDate: fields.effectiveDate ?? x.effectiveDate,
      history: [...x.history, statusEntry(to, remarks)],
    }))
    log(
      to === "Approved" ? "Approved" : to === "Archived" ? "Archived" : "Status Changed",
      "Ordinances",
      o?.ordinanceNumber ?? id,
      `Ordinance ${to.toLowerCase()}.${remarks ? " " + remarks : ""}`,
      id,
    )
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("ordinances", id, files),
}

export type ResolutionInput = Pick<Resolution, "resolutionNumber" | "title" | "description" | "sponsorId" | "committeeId" | "sessionId">

export const resolutionActions = {
  create(input: ResolutionInput): Resolution {
    const r: Resolution = { ...input, id: newId("res"), status: "Draft", attachments: [], history: [statusEntry<ResolutionStatus>("Draft")] }
    set((s) => ({ ...s, resolutions: [r, ...s.resolutions] }))
    log("Created", "Resolutions", r.resolutionNumber, `Drafted: ${r.title}.`, r.id)
    return r
  },
  update(id: string, patch: Partial<Resolution>) {
    patchIn<"resolutions", Resolution>("resolutions", id, (r) => ({ ...r, ...patch }))
    log("Updated", "Resolutions", get().resolutions.find((r) => r.id === id)?.resolutionNumber ?? id, "Resolution details updated.", id)
  },
  transition(id: string, to: ResolutionStatus, remarks?: string) {
    const r = get().resolutions.find((x) => x.id === id)
    patchIn<"resolutions", Resolution>("resolutions", id, (x) => ({
      ...x,
      status: to,
      dateApproved: to === "Approved" ? today() : x.dateApproved,
      history: [...x.history, statusEntry(to, remarks)],
    }))
    log(
      to === "Approved" ? "Approved" : to === "Rejected" ? "Rejected" : to === "Archived" ? "Archived" : "Status Changed",
      "Resolutions",
      r?.resolutionNumber ?? id,
      `Resolution ${to.toLowerCase()}.${remarks ? " " + remarks : ""}`,
      id,
    )
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("resolutions", id, files),
}

export type CommitteeInput = Omit<Committee, "id">

export const committeeActions = {
  create(input: CommitteeInput): Committee {
    const c: Committee = { ...input, id: newId("com") }
    set((s) => ({ ...s, committees: [...s.committees, c] }))
    log("Created", "Committees", c.name, "Committee created.", c.id)
    return c
  },
  update(id: string, patch: Partial<Committee>) {
    patchIn<"committees", Committee>("committees", id, (c) => ({ ...c, ...patch }))
    log("Updated", "Committees", get().committees.find((c) => c.id === id)?.name ?? id, "Committee membership or details updated.", id)
  },
}

export type AssemblyInput = Omit<BarangayAssembly, "id" | "attachments">

export const assemblyActions = {
  create(input: AssemblyInput): BarangayAssembly {
    const a: BarangayAssembly = { ...input, id: newId("asm"), attachments: [] }
    set((s) => ({ ...s, assemblies: [a, ...s.assemblies] }))
    log("Created", "Assemblies", a.title, `Assembly scheduled on ${a.date}.`, a.id)
    return a
  },
  update(id: string, patch: Partial<BarangayAssembly>) {
    patchIn<"assemblies", BarangayAssembly>("assemblies", id, (a) => ({ ...a, ...patch }))
    log(
      "Updated",
      "Assemblies",
      get().assemblies.find((a) => a.id === id)?.title ?? id,
      patch.status ? `Assembly marked ${patch.status}.` : "Assembly record updated.",
      id,
    )
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("assemblies", id, files),
}
