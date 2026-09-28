import type { BarangayAssembly, BarangaySession, Committee, Ordinance, Resolution } from "@/types"
import { ASSEMBLY_STATUSES, ORDINANCE_STATUSES, RESOLUTION_STATUSES, SESSION_STATUSES, SESSION_TYPES } from "@/lib/constants"
import { officialName } from "@/lib/format"
import type { ReportData } from "@/lib/reports/data"
import { attendanceRate, attendedCount, average, committeeReportCount, percent, sum, yearOf } from "@/lib/reports/metrics"
import { defineReport, type ReportFilterSpec } from "@/lib/reports/types"

/* Governance — sessions, attendance, legislation, committees and assemblies. */

const sf = {
  year: { id: "fiscalYear", label: "Year", get: (s) => yearOf(s.date) },
  range: { id: "dateRange", label: "Session date", getDate: (s) => s.date },
  type: { id: "category", label: "Session type", options: SESSION_TYPES, get: (s) => s.type },
  status: { id: "status", options: SESSION_STATUSES, get: (s) => s.status },
} satisfies Record<string, ReportFilterSpec<BarangaySession>>

const legislationCount = (d: ReportData, sessionId: string) => ({
  ordinances: d.ordinances.filter((o) => o.sessionId === sessionId).length,
  resolutions: d.resolutions.filter((r) => r.sessionId === sessionId).length,
})

export const sessionSummary = defineReport<BarangaySession>({
  id: "session-summary",
  title: "Barangay Session Summary",
  description: "Sessions with attendance, agenda, motions and legislation acted on.",
  section: "governance",
  slug: "governance",
  source: (d) => [...d.sessions].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [sf.year, sf.range, sf.type, sf.status],
  rowId: (s) => s.id,
  columns: [
    { id: "sessionNumber", header: "Session No.", format: "mono", value: (s) => s.sessionNumber, total: "count" },
    { id: "type", header: "Type", value: (s) => s.type },
    { id: "date", header: "Date", format: "date", value: (s) => s.date },
    {
      id: "attendance",
      header: "Attendance",
      format: "number",
      value: (s) => (s.status === "Completed" ? attendedCount(s) : undefined),
      detail: (s) => (s.status === "Completed" ? `of ${s.attendance.length} · ${attendanceRate(s).toFixed(0)}%` : undefined),
    },
    { id: "agenda", header: "Agenda Items", format: "number", value: (s) => s.agenda.length, total: "sum" },
    { id: "motions", header: "Motions", format: "number", value: (s) => s.motions.length, total: "sum" },
    { id: "resolutions", header: "Resolutions", format: "number", value: (s, d) => legislationCount(d, s.id).resolutions, total: "sum" },
    { id: "ordinances", header: "Ordinances", format: "number", value: (s, d) => legislationCount(d, s.id).ordinances, total: "sum" },
    { id: "status", header: "Status", format: "status", value: (s) => s.status },
  ],
  summary: (items) => {
    const held = items.filter((s) => s.status === "Completed")
    return [
      { label: "Sessions", value: items.length },
      { label: "Held", value: held.length, tone: "success" },
      { label: "Average attendance", value: average(held.map(attendanceRate)), format: "percent" },
      { label: "Motions carried", value: sum(held, (s) => s.motions.filter((m) => m.result === "Carried").length) },
      { label: "Cancelled", value: items.filter((s) => s.status === "Cancelled").length },
    ]
  },
  rowLink: { module: "sessions", href: (s) => `/governance/sessions/${s.id}` },
  orientation: "landscape",
})

type AttendanceRow = { officialId: string; expected: number; present: number; late: number; excused: number; absent: number; rate: number }

export const sessionAttendance = defineReport<BarangaySession, AttendanceRow>({
  id: "session-attendance",
  title: "Session Attendance",
  description: "Attendance of each member of the Sangguniang Barangay across completed sessions.",
  section: "governance",
  slug: "governance",
  source: (d) => d.sessions.filter((s) => s.status === "Completed"),
  filters: [sf.year, sf.range, sf.type],
  rows: (items, d) => {
    const ids = [...new Set(items.flatMap((s) => s.attendance.map((a) => a.officialId)))]
    return ids
      .map((officialId) => {
        const marks = items.flatMap((s) => s.attendance.filter((a) => a.officialId === officialId))
        const n = (st: string) => marks.filter((m) => m.status === st).length
        const present = n("Present") + n("Late")
        return {
          officialId,
          expected: marks.length,
          present,
          late: n("Late"),
          excused: n("Excused"),
          absent: n("Absent"),
          rate: percent(present, marks.length),
        }
      })
      .sort((a, b) => (d.by.official.get(a.officialId)?.rank ?? 99) - (d.by.official.get(b.officialId)?.rank ?? 99))
  },
  rowId: (r) => r.officialId,
  columns: [
    { id: "official", header: "Official", value: (r, d) => officialName(d.by.official.get(r.officialId), true) },
    { id: "position", header: "Position", value: (r, d) => d.by.official.get(r.officialId)?.position },
    { id: "expected", header: "Sessions Expected", format: "number", value: (r) => r.expected },
    { id: "present", header: "Present", format: "number", value: (r) => r.present, detail: (r) => (r.late ? `${r.late} late` : undefined) },
    { id: "excused", header: "Excused", format: "number", value: (r) => r.excused },
    { id: "absent", header: "Absent", format: "number", value: (r) => r.absent },
    { id: "rate", header: "Attendance %", format: "progress", value: (r) => r.rate },
  ],
  summary: (items, rows) => [
    { label: "Sessions held", value: items.length },
    { label: "Average attendance", value: average(rows.map((r) => r.rate)), format: "percent" },
    { label: "Perfect attendance", value: rows.filter((r) => r.rate === 100).length, hint: "Members present at every session" },
  ],
  charts: [
    {
      type: "hbar",
      title: "Attendance rate by official",
      wide: true,
      seriesName: "Attendance",
      valueFormat: "percent",
      data: ({ rows, d }) => rows.map((r) => ({ label: officialName(d.by.official.get(r.officialId)), value: Math.round(r.rate) })),
    },
  ],
  note: "Present includes members who arrived late. Excused absences count against the attendance rate.",
})

export const ordinanceRegister = defineReport<Ordinance>({
  id: "ordinance-register",
  title: "Ordinance Register",
  description: "Barangay ordinances with sponsor, committee and approval and effectivity dates.",
  section: "governance",
  slug: "governance",
  access: ["governance", "public"],
  source: (d) => [...d.ordinances].sort((a, b) => b.ordinanceNumber.localeCompare(a.ordinanceNumber)),
  filters: [
    { id: "search", label: "Number or title", getText: (o) => `${o.ordinanceNumber} ${o.title}` },
    { id: "dateRange", label: "Date introduced", getDate: (o) => o.dateIntroduced },
    { id: "status", options: ORDINANCE_STATUSES, get: (o) => o.status },
    { id: "committee", get: (o) => o.committeeId },
    { id: "official", label: "Sponsor", get: (o) => o.sponsorId },
  ],
  rowId: (o) => o.id,
  columns: [
    { id: "ordinanceNumber", header: "Ordinance No.", format: "mono", value: (o) => o.ordinanceNumber, total: "count" },
    { id: "title", header: "Title", value: (o) => o.title },
    { id: "sponsor", header: "Sponsor", value: (o, d) => officialName(d.by.official.get(o.sponsorId), true) },
    {
      id: "committee",
      header: "Committee",
      value: (o, d) => (o.committeeId ? d.by.committee.get(o.committeeId)?.name.replace("Committee on ", "") : undefined),
    },
    { id: "dateApproved", header: "Approval Date", format: "date", value: (o) => o.dateApproved },
    { id: "effectiveDate", header: "Effective Date", format: "date", value: (o) => o.effectiveDate },
    { id: "status", header: "Status", format: "status", value: (o) => o.status },
  ],
  summary: (items) => [
    { label: "Ordinances", value: items.length },
    { label: "In effect", value: items.filter((o) => o.status === "Effective").length, tone: "success" },
    { label: "Pending", value: items.filter((o) => o.status === "Draft" || o.status === "Under Review").length, tone: "warning" },
    { label: "Repealed / archived", value: items.filter((o) => o.status === "Repealed" || o.status === "Archived").length },
  ],
  rowLink: { module: "ordinances", href: (o) => `/governance/ordinances/${o.id}` },
  orientation: "landscape",
})

export const resolutionRegister = defineReport<Resolution>({
  id: "resolution-register",
  title: "Resolution Register",
  description: "Resolutions with sponsor, the session that acted on them and approval date.",
  section: "governance",
  slug: "governance",
  access: ["governance", "public"],
  source: (d) => [...d.resolutions].sort((a, b) => b.resolutionNumber.localeCompare(a.resolutionNumber)),
  filters: [
    { id: "search", label: "Number or title", getText: (r) => `${r.resolutionNumber} ${r.title}` },
    { id: "dateRange", label: "Approval date", getDate: (r) => r.dateApproved },
    { id: "status", options: RESOLUTION_STATUSES, get: (r) => r.status },
    { id: "committee", get: (r) => r.committeeId },
    { id: "official", label: "Sponsor", get: (r) => r.sponsorId },
  ],
  rowId: (r) => r.id,
  columns: [
    { id: "resolutionNumber", header: "Resolution No.", format: "mono", value: (r) => r.resolutionNumber, total: "count" },
    { id: "title", header: "Title", value: (r) => r.title },
    { id: "sponsor", header: "Sponsor", value: (r, d) => officialName(d.by.official.get(r.sponsorId), true) },
    { id: "session", header: "Session", format: "mono", value: (r, d) => (r.sessionId ? d.by.session.get(r.sessionId)?.sessionNumber : undefined) },
    { id: "dateApproved", header: "Approval Date", format: "date", value: (r) => r.dateApproved },
    { id: "status", header: "Status", format: "status", value: (r) => r.status },
  ],
  summary: (items) => [
    { label: "Resolutions", value: items.length },
    { label: "Approved", value: items.filter((r) => r.status === "Approved").length, tone: "success" },
    { label: "Pending", value: items.filter((r) => r.status === "Draft" || r.status === "Proposed").length, tone: "warning" },
    { label: "Rejected", value: items.filter((r) => r.status === "Rejected").length, tone: "danger" },
  ],
  rowLink: { module: "resolutions", href: (r) => `/governance/resolutions/${r.id}` },
})

type CommitteeRow = Committee & { meetings: number; ppas: number; projects: number; ordinances: number; resolutions: number }

export const committeeActivity = defineReport<Committee, CommitteeRow>({
  id: "committee-activity",
  title: "Committee Activity Report",
  description: "Committee reports to session, PPAs, projects and legislation per committee.",
  section: "governance",
  slug: "governance",
  source: (d) => d.committees.filter(d.scope.committeeVisible),
  filters: [
    { id: "committee", get: (c) => c.id },
    { id: "status", options: ["Active", "Inactive"], get: (c) => c.status, defaultValues: ["Active"] },
  ],
  rows: (items, d) =>
    items.map((c) => {
      const ppaIds = new Set(d.ppas.filter((p) => p.committeeId === c.id).map((p) => p.id))
      return {
        ...c,
        meetings: committeeReportCount(c, d.sessions),
        ppas: ppaIds.size,
        projects: d.projects.filter((p) => ppaIds.has(p.ppaId)).length,
        ordinances: d.ordinances.filter((o) => o.committeeId === c.id).length,
        resolutions: d.resolutions.filter((r) => r.committeeId === c.id).length,
      }
    }),
  rowId: (c) => c.id,
  columns: [
    { id: "name", header: "Committee", value: (c) => c.name.replace("Committee on ", ""), total: "count" },
    { id: "chair", header: "Chairperson", value: (c, d) => officialName(d.by.official.get(c.chairpersonId), true) },
    { id: "meetings", header: "Meetings", format: "number", value: (c) => c.meetings, total: "sum" },
    { id: "ppas", header: "PPAs", format: "number", value: (c) => c.ppas, total: "sum" },
    { id: "projects", header: "Projects", format: "number", value: (c) => c.projects, total: "sum" },
    { id: "ordinances", header: "Ordinances", format: "number", value: (c) => c.ordinances, total: "sum" },
    { id: "resolutions", header: "Resolutions", format: "number", value: (c) => c.resolutions, total: "sum" },
  ],
  charts: [
    {
      type: "grouped",
      title: "Legislation by committee",
      wide: true,
      horizontal: true,
      series: [
        { key: "ordinances", name: "Ordinances" },
        { key: "resolutions", name: "Resolutions" },
      ],
      data: ({ rows }) => rows.map((c) => ({ label: c.name.replace("Committee on ", ""), ordinances: c.ordinances, resolutions: c.resolutions })),
    },
  ],
  rowLink: { module: "committees", href: (c) => `/governance/committees/${c.id}` },
  note: "Meetings counts sessions where the committee reported to the Sangguniang Barangay. PPAs and projects are those assigned to the committee.",
})

export const assemblyReport = defineReport<BarangayAssembly>({
  id: "assembly-report",
  title: "Barangay Assembly Report",
  description: "Assemblies with attendance, agenda and key decisions.",
  section: "governance",
  slug: "governance",
  access: ["governance", "public"],
  source: (d) => [...d.assemblies].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "dateRange", label: "Assembly date", getDate: (a) => a.date },
    { id: "status", options: ASSEMBLY_STATUSES, get: (a) => a.status },
  ],
  rowId: (a) => a.id,
  columns: [
    { id: "title", header: "Assembly", value: (a) => a.title, detail: (a) => a.venue, total: "count" },
    { id: "date", header: "Date", format: "date", value: (a) => a.date },
    {
      id: "attendance",
      header: "Attendance",
      format: "number",
      value: (a) => (a.status === "Completed" ? a.attendanceCount : undefined),
      detail: (a) => (a.householdsRepresented ? `${a.householdsRepresented} households` : undefined),
      total: "sum",
    },
    { id: "agenda", header: "Agenda", value: (a) => a.agenda.join("; ") },
    { id: "decisions", header: "Key Decisions", value: (a) => (a.decisions.length ? a.decisions.join("; ") : undefined) },
    { id: "status", header: "Status", format: "status", value: (a) => a.status },
  ],
  summary: (items) => {
    const held = items.filter((a) => a.status === "Completed")
    return [
      { label: "Assemblies", value: items.length },
      { label: "Held", value: held.length, tone: "success" },
      { label: "Average attendance", value: held.length ? Math.round(average(held.map((a) => a.attendanceCount))) : 0, hint: "Residents per assembly" },
      { label: "Decisions recorded", value: sum(held, (a) => a.decisions.length) },
    ]
  },
  rowLink: { module: "assemblies", href: (a) => `/governance/assemblies/${a.id}` },
  orientation: "landscape",
})

export const GOVERNANCE_REPORTS = [sessionSummary, sessionAttendance, ordinanceRegister, resolutionRegister, committeeActivity, assemblyReport]
