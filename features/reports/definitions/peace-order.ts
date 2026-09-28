import type { BlotterCase, Hearing, Incident } from "@/types"
import { BLOTTER_INCIDENT_TYPES, BLOTTER_STATUSES, INCIDENT_STATUSES, INCIDENT_TYPES } from "@/lib/constants"
import { formatTime, officialName } from "@/lib/format"
import type { ReportData } from "@/lib/reports/data"
import { average, blotterPurok, countBy, daysToResolve, isOpenCase, monthKey, monthLabel, percent, resolutionRate } from "@/lib/reports/metrics"
import { defineReport, type ReportFilterSpec, type ReportMetric } from "@/lib/reports/types"

/* Peace & Order — blotter cases (with hearings) and incident reports. */

const bf = {
  range: { id: "dateRange", label: "Date filed", getDate: (b) => b.date },
  status: { id: "status", options: BLOTTER_STATUSES, get: (b) => b.status },
  type: { id: "incidentType", get: (b) => b.incidentType },
  purok: { id: "purok", get: (b, d) => blotterPurok(b, d.by.resident) },
  officer: { id: "official", label: "Assigned officer", get: (b) => b.assignedOfficerId },
} satisfies Record<string, ReportFilterSpec<BlotterCase>>

const blotterLink = { module: "blotter" as const, href: (b: BlotterCase) => `/blotter/${b.id}` }
const byDateDesc = (d: ReportData) => [...d.blotters].sort((a, b) => b.date.localeCompare(a.date))

const blotterMetrics = (items: BlotterCase[]): ReportMetric[] => {
  const n = (s: string) => items.filter((b) => b.status === s).length
  return [
    { label: "Total cases", value: items.length },
    { label: "Open cases", value: items.filter(isOpenCase).length, tone: "warning", hint: "Reported, investigation or mediation" },
    { label: "Settled", value: n("Settled"), tone: "success" },
    { label: "Referred", value: n("Referred"), tone: "purple", hint: "To police, court or other agency" },
    { label: "Closed", value: n("Closed") },
  ]
}

type CountRow = { key: string; count: number; open: number; resolved: number; share: number }

const countRows = (items: BlotterCase[], keys: readonly string[], keyOf: (b: BlotterCase) => string): CountRow[] =>
  keys.map((key) => {
    const list = items.filter((b) => keyOf(b) === key)
    return {
      key,
      count: list.length,
      open: list.filter(isOpenCase).length,
      resolved: list.filter((b) => b.status === "Settled" || b.status === "Closed").length,
      share: percent(list.length, items.length),
    }
  })

const countColumns = (label: string) => [
  { id: "key", header: label, value: (r: CountRow) => r.key },
  { id: "count", header: "Cases", format: "number" as const, value: (r: CountRow) => r.count, total: "sum" as const },
  { id: "open", header: "Open", format: "number" as const, value: (r: CountRow) => r.open, total: "sum" as const },
  { id: "resolved", header: "Settled / Closed", format: "number" as const, value: (r: CountRow) => r.resolved, total: "sum" as const },
  { id: "share", header: "% of Cases", format: "progress" as const, value: (r: CountRow) => r.share },
]

type StatusRow = { status: string; count: number; share: number }

export const blotterSummary = defineReport<BlotterCase, StatusRow>({
  id: "blotter-summary",
  title: "Blotter Summary",
  description: "Blotter cases by status for the period.",
  section: "peace-order",
  slug: "blotter",
  source: (d) => d.blotters,
  filters: [bf.range, bf.status, bf.type, bf.purok],
  rows: (items) =>
    BLOTTER_STATUSES.map((status) => ({
      status,
      count: items.filter((b) => b.status === status).length,
      share: percent(items.filter((b) => b.status === status).length, items.length),
    })),
  rowId: (r) => r.status,
  tableTitle: "Cases by status",
  columns: [
    { id: "status", header: "Status", format: "status", value: (r) => r.status },
    { id: "count", header: "Cases", format: "number", value: (r) => r.count, total: "sum" },
    { id: "share", header: "% of Cases", format: "progress", value: (r) => r.share },
  ],
  summary: (items) => blotterMetrics(items),
  charts: [
    {
      type: "bar",
      title: "Cases by status",
      seriesName: "Cases",
      data: ({ rows }) => rows.map((r) => ({ label: r.status.replace("Under ", ""), value: r.count })),
    },
    {
      type: "trend",
      title: "Cases filed per month",
      seriesName: "Cases",
      data: ({ items }) =>
        countBy(items, (b) => monthKey(b.date))
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((x) => ({ label: monthLabel(x.label, "MMM yy"), value: x.value })),
    },
  ],
})

export const blotterRegister = defineReport<BlotterCase>({
  id: "blotter-register",
  title: "Blotter Case Register",
  description: "Every blotter case with parties, incident type, location and assigned officer.",
  section: "peace-order",
  slug: "blotter",
  source: byDateDesc,
  filters: [
    { id: "search", label: "Case no. or party", getText: (b) => `${b.blotterNumber} ${b.complainant.name} ${b.respondent.name}` },
    bf.range,
    bf.status,
    bf.type,
    bf.purok,
    bf.officer,
  ],
  rowId: (b) => b.id,
  columns: [
    { id: "blotterNumber", header: "Case No.", format: "mono", value: (b) => b.blotterNumber, total: "count" },
    { id: "date", header: "Date", format: "date", value: (b) => b.date },
    { id: "complainant", header: "Complainant", value: (b) => b.complainant.name },
    { id: "respondent", header: "Respondent", value: (b) => b.respondent.name },
    { id: "incidentType", header: "Incident Type", value: (b) => b.incidentType },
    { id: "purok", header: "Purok", value: (b, d) => blotterPurok(b, d.by.resident) },
    { id: "officer", header: "Assigned Officer", value: (b, d) => (b.assignedOfficerId ? officialName(d.by.official.get(b.assignedOfficerId)) : undefined) },
    { id: "status", header: "Status", format: "status", value: (b) => b.status },
  ],
  summary: (items) => blotterMetrics(items),
  rowLink: blotterLink,
  orientation: "landscape",
})

export const blotterByType = defineReport<BlotterCase, CountRow>({
  id: "blotter-by-type",
  title: "Blotter Cases by Type",
  description: "Case count and outcome per incident category.",
  section: "peace-order",
  slug: "blotter",
  source: (d) => d.blotters,
  filters: [bf.range, bf.status, bf.purok],
  rows: (items) => countRows(items, BLOTTER_INCIDENT_TYPES, (b) => b.incidentType).filter((r) => r.count > 0),
  rowId: (r) => r.key,
  columns: countColumns("Incident Type"),
  charts: [
    { type: "hbar", title: "Cases by incident type", wide: true, seriesName: "Cases", data: ({ rows }) => rows.map((r) => ({ label: r.key, value: r.count })) },
  ],
})

export const blotterByPurok = defineReport<BlotterCase, CountRow>({
  id: "blotter-by-purok",
  title: "Blotter Cases by Purok",
  description: "Where cases originate, by purok.",
  section: "peace-order",
  slug: "blotter",
  source: (d) => d.blotters,
  filters: [bf.range, bf.status, bf.type],
  rows: (items, d) => {
    const puroks = d.settings.puroks.map((p) => p.name)
    const rows = countRows(items, puroks, (b) => blotterPurok(b, d.by.resident))
    const other = items.filter((b) => !puroks.includes(blotterPurok(b, d.by.resident)))
    return other.length
      ? [...rows, ...countRows(other, ["Unspecified"], () => "Unspecified").map((r) => ({ ...r, share: percent(r.count, items.length) }))]
      : rows
  },
  rowId: (r) => r.key,
  columns: countColumns("Purok"),
  charts: [
    {
      type: "bar",
      title: "Cases by purok",
      wide: true,
      seriesName: "Cases",
      data: ({ rows }) => rows.map((r) => ({ label: r.key.replace("Purok ", "P-"), value: r.count })),
    },
  ],
  note: "Purok is taken from the incident location, or the complainant's address when the location does not name one.",
})

const RESOLUTION_STAGES: { label: string; status: string }[] = [
  { label: "Reported", status: "Reported" },
  { label: "For Investigation", status: "Under Investigation" },
  { label: "For Mediation", status: "For Mediation" },
  { label: "Settled", status: "Settled" },
  { label: "Referred", status: "Referred" },
  { label: "Closed", status: "Closed" },
]

type StageRow = { stage: string; status: string; count: number; share: number; avgDays: number | undefined }

export const blotterResolution = defineReport<BlotterCase, StageRow>({
  id: "blotter-resolution",
  title: "Blotter Resolution Summary",
  description: "Where cases stand in the Katarungang Pambarangay process, and how many are resolved.",
  section: "peace-order",
  slug: "blotter",
  source: (d) => d.blotters,
  filters: [bf.range, bf.type, bf.purok],
  rows: (items) =>
    RESOLUTION_STAGES.map(({ label, status }) => {
      const list = items.filter((b) => b.status === status)
      const days = list.map(daysToResolve).filter((x): x is number => x !== undefined)
      return { stage: label, status, count: list.length, share: percent(list.length, items.length), avgDays: days.length ? average(days) : undefined }
    }),
  rowId: (r) => r.status,
  columns: [
    { id: "stage", header: "Stage", value: (r) => r.stage },
    { id: "count", header: "Cases", format: "number", value: (r) => r.count, total: "sum" },
    { id: "share", header: "% of Cases", format: "progress", value: (r) => r.share },
    { id: "avgDays", header: "Avg. Days to Resolve", format: "number", value: (r) => (r.avgDays === undefined ? undefined : Math.round(r.avgDays)) },
  ],
  summary: (items) => {
    const days = items.map(daysToResolve).filter((x): x is number => x !== undefined)
    return [
      { label: "Cases", value: items.length },
      { label: "Resolution rate", value: resolutionRate(items), format: "percent", tone: "success", hint: "Settled or closed" },
      { label: "Still open", value: items.filter(isOpenCase).length, tone: "warning" },
      { label: "Referred out", value: items.filter((b) => b.status === "Referred").length },
      { label: "Avg. days to resolve", value: days.length ? Math.round(average(days)) : "—" },
    ]
  },
  charts: [
    { type: "bar", title: "Cases by stage", wide: true, seriesName: "Cases", data: ({ rows }) => rows.map((r) => ({ label: r.stage, value: r.count })) },
  ],
  note: "Resolution rate = settled + closed cases ÷ all cases. Referred cases leave the barangay process but are not counted as resolved.",
})

type HearingRow = Hearing & { caseId: string; blotterNumber: string; parties: string; officerId?: string }

export const hearingSchedule = defineReport<HearingRow>({
  id: "hearing-schedule",
  title: "Hearing Schedule Report",
  description: "Mediation, conciliation and arbitration hearings with parties, venue and officer.",
  section: "peace-order",
  slug: "blotter",
  source: (d) =>
    d.blotters
      .flatMap((b) =>
        b.hearings.map((h) => ({
          ...h,
          caseId: b.id,
          blotterNumber: b.blotterNumber,
          parties: `${b.complainant.name} vs. ${b.respondent.name}`,
          officerId: b.assignedOfficerId,
        })),
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  filters: [
    { id: "dateRange", label: "Hearing date", getDate: (h) => h.date },
    { id: "status", options: ["Scheduled", "Completed", "Rescheduled", "No Show"], get: (h) => h.status },
    { id: "category", label: "Hearing type", options: ["Mediation", "Conciliation", "Arbitration"], get: (h) => h.type },
    { id: "official", label: "Assigned officer", get: (h) => h.officerId },
  ],
  rowId: (h) => h.id,
  columns: [
    { id: "blotterNumber", header: "Case No.", format: "mono", value: (h) => h.blotterNumber, total: "count" },
    { id: "parties", header: "Parties", value: (h) => h.parties },
    { id: "date", header: "Hearing Date", format: "date", value: (h) => h.date },
    { id: "time", header: "Time", value: (h) => formatTime(h.time) },
    { id: "type", header: "Type", value: (h) => h.type },
    { id: "venue", header: "Venue", value: (h) => h.venue },
    { id: "officer", header: "Assigned Officer", value: (h, d) => (h.officerId ? officialName(d.by.official.get(h.officerId)) : undefined) },
    { id: "status", header: "Status", format: "status", value: (h) => h.status },
  ],
  summary: (items, _rows, d) => [
    { label: "Hearings", value: items.length },
    { label: "Upcoming", value: items.filter((h) => h.status === "Scheduled" && h.date >= d.today).length, tone: "info" },
    { label: "Completed", value: items.filter((h) => h.status === "Completed").length, tone: "success" },
    { label: "No show / rescheduled", value: items.filter((h) => h.status === "No Show" || h.status === "Rescheduled").length, tone: "warning" },
  ],
  rowLink: { module: "blotter", href: (h) => `/blotter/${h.caseId}` },
  orientation: "landscape",
})

/* --------------------------------------------------------------- incidents -- */

const OPEN_INCIDENT = ["Reported", "Investigating"]

export const incidentSummary = defineReport<Incident>({
  id: "incident-summary",
  title: "Incident Summary",
  description: "Incident reports by type, purok and month, with the incident register.",
  section: "peace-order",
  slug: "incidents",
  source: (d) => [...d.incidents].sort((a, b) => b.date.localeCompare(a.date)),
  filters: [
    { id: "dateRange", label: "Incident date", getDate: (i) => i.date },
    { id: "incidentType", options: INCIDENT_TYPES, get: (i) => i.type },
    { id: "status", options: INCIDENT_STATUSES, get: (i) => i.status },
    { id: "purok", get: (i) => i.purok ?? "Unspecified" },
    { id: "category", label: "Severity", options: ["Low", "Moderate", "High"], get: (i) => i.severity },
  ],
  rowId: (i) => i.id,
  tableTitle: "Incident register",
  columns: [
    { id: "incidentNumber", header: "Incident No.", format: "mono", value: (i) => i.incidentNumber, total: "count" },
    { id: "date", header: "Date", format: "date", value: (i) => i.date },
    { id: "type", header: "Type", value: (i) => i.type },
    { id: "location", header: "Location", value: (i) => i.location, detail: (i) => i.purok },
    { id: "severity", header: "Severity", value: (i) => i.severity },
    { id: "officer", header: "Assigned Officer", value: (i, d) => (i.assignedOfficerId ? officialName(d.by.official.get(i.assignedOfficerId)) : undefined) },
    { id: "status", header: "Status", format: "status", value: (i) => i.status },
  ],
  summary: (items) => [
    { label: "Total incidents", value: items.length },
    { label: "Resolved", value: items.filter((i) => !OPEN_INCIDENT.includes(i.status)).length, tone: "success", hint: "Resolved or closed" },
    { label: "Open", value: items.filter((i) => OPEN_INCIDENT.includes(i.status)).length, tone: "warning" },
    { label: "High severity", value: items.filter((i) => i.severity === "High").length, tone: "danger" },
    { label: "Escalated to blotter", value: items.filter((i) => i.blotterId).length },
  ],
  charts: [
    {
      type: "hbar",
      title: "Incidents by type",
      seriesName: "Incidents",
      data: ({ items }) => countBy(items, (i) => i.type, INCIDENT_TYPES).filter((x) => x.value > 0),
    },
    {
      type: "bar",
      title: "Incidents by purok",
      seriesName: "Incidents",
      data: ({ items, d }) =>
        countBy(
          items,
          (i) => i.purok ?? "Unspecified",
          d.settings.puroks.map((p) => p.name),
        ).map((x) => ({ ...x, label: x.label.replace("Purok ", "P-") })),
    },
    {
      type: "trend",
      title: "Monthly trend",
      wide: true,
      seriesName: "Incidents",
      data: ({ items }) =>
        countBy(items, (i) => monthKey(i.date))
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((x) => ({ label: monthLabel(x.label, "MMM yy"), value: x.value })),
    },
  ],
  rowLink: { module: "incidents", href: (i) => `/incidents?open=${i.id}` },
})

export const PEACE_ORDER_REPORTS = [blotterSummary, blotterRegister, blotterByType, blotterByPurok, blotterResolution, hearingSchedule, incidentSummary]
