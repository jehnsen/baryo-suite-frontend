import { subMonths } from "date-fns"
import type { Certificate, ServiceRequest } from "@/types"
import { CERTIFICATE_STATUSES, CERTIFICATE_TYPES, REQUEST_CHANNELS, REQUEST_STATUSES, SERVICE_TYPES } from "@/lib/constants"
import { formalName, officialName, toISODate } from "@/lib/format"
import { countBy, durationStats, monthKey, monthLabel, monthsOfYear, percent, processingHours, sum, yearOf } from "@/lib/reports/metrics"
import { defineReport, type ReportFilterSpec } from "@/lib/reports/types"

/* Certificates & Services — from certificates and service requests. */

const cf = {
  range: { id: "dateRange", label: "Date issued", getDate: (c) => c.dateIssued },
  type: { id: "certificateType", get: (c) => c.type },
  status: { id: "status", options: CERTIFICATE_STATUSES, get: (c) => c.status },
  released: { id: "status", options: CERTIFICATE_STATUSES, get: (c) => c.status, defaultValues: ["Released"] },
  purok: { id: "purok", get: (c, d) => d.by.resident.get(c.residentId)?.address.purok },
  year: { id: "fiscalYear", label: "Year", get: (c) => yearOf(c.dateIssued) },
} satisfies Record<string, ReportFilterSpec<Certificate>>

const certificateLink = { module: "certificates" as const, href: (c: Certificate) => `/certificates/${c.id}` }

export const certificatesIssued = defineReport<Certificate>({
  id: "certificates-issued",
  title: "Certificates Issued",
  description: "Certificate register with resident, purpose, issuing official, fee and status.",
  section: "services",
  slug: "certificates",
  source: (d) => [...d.certificates].sort((a, b) => b.dateIssued.localeCompare(a.dateIssued)),
  filters: [
    { id: "search", label: "Certificate no. or resident", getText: (c, d) => `${c.certificateNumber} ${formalName(d.by.resident.get(c.residentId))}` },
    cf.range,
    cf.type,
    cf.released,
    cf.purok,
  ],
  rowId: (c) => c.id,
  columns: [
    { id: "certificateNumber", header: "Certificate No.", format: "mono", value: (c) => c.certificateNumber, total: "count" },
    { id: "resident", header: "Resident", value: (c, d) => formalName(d.by.resident.get(c.residentId)) },
    { id: "type", header: "Certificate Type", value: (c) => c.type },
    { id: "purpose", header: "Purpose", value: (c) => c.purpose },
    { id: "dateIssued", header: "Issued Date", format: "date", value: (c) => c.dateIssued },
    { id: "issuedBy", header: "Issued By", value: (c, d) => officialName(d.by.official.get(c.issuedById)) },
    { id: "fee", header: "Fee", format: "peso", value: (c) => c.fee, total: "sum", hidden: true },
    { id: "orNumber", header: "O.R. No.", format: "mono", value: (c) => c.orNumber, hidden: true },
    { id: "status", header: "Status", format: "status", value: (c) => c.status },
  ],
  summary: (items) => {
    const top = countBy(items, (c) => c.type).sort((a, b) => b.value - a.value)[0]
    return [
      { label: "Certificates", value: items.length },
      { label: "Fees", value: sum(items, (c) => c.fee), format: "peso", hint: "Across listed certificates" },
      { label: "Free of charge", value: items.filter((c) => c.fee === 0).length, hint: "Indigency and first-time job seekers" },
      { label: "Most requested", value: top ? top.label.replace("Certificate of ", "") : "—", format: "text" },
    ]
  },
  rowLink: certificateLink,
  orientation: "landscape",
})

type TypeRow = { type: string; count: number; share: number; recent: number; previous: number; trend: number | undefined }

export const certificatesByType = defineReport<Certificate, TypeRow>({
  id: "certificates-by-type",
  title: "Certificates by Type",
  description: "Issued certificates per type with share of total and the three-month trend.",
  section: "services",
  slug: "certificates",
  source: (d) => d.certificates,
  filters: [cf.range, cf.released, cf.purok],
  rows: (items, d) => {
    const recentFrom = toISODate(subMonths(d.now, 3))
    const previousFrom = toISODate(subMonths(d.now, 6))
    return CERTIFICATE_TYPES.map((type) => {
      const list = items.filter((c) => c.type === type)
      const recent = list.filter((c) => c.dateIssued >= recentFrom).length
      const previous = list.filter((c) => c.dateIssued >= previousFrom && c.dateIssued < recentFrom).length
      return {
        type,
        count: list.length,
        share: percent(list.length, items.length),
        recent,
        previous,
        trend: previous ? percent(recent - previous, previous) : undefined,
      }
    })
  },
  rowId: (r) => r.type,
  columns: [
    { id: "type", header: "Certificate Type", value: (r) => r.type },
    { id: "count", header: "Issued Count", format: "number", value: (r) => r.count, total: "sum" },
    { id: "share", header: "Percentage", format: "progress", value: (r) => r.share },
    { id: "recent", header: "Last 3 Months", format: "number", value: (r) => r.recent, total: "sum" },
    { id: "previous", header: "Prior 3 Months", format: "number", value: (r) => r.previous, total: "sum" },
    {
      id: "trend",
      header: "Trend",
      format: "percent",
      value: (r) => (r.trend === undefined ? undefined : Math.round(r.trend)),
      detail: (r) => (r.trend === undefined ? undefined : r.trend > 0 ? "Rising" : r.trend < 0 ? "Falling" : "Steady"),
    },
  ],
  charts: [
    { type: "hbar", title: "Issued by type", wide: true, seriesName: "Certificates", data: ({ rows }) => rows.map((r) => ({ label: r.type, value: r.count })) },
  ],
  note: "Trend compares the last three months with the three months before them.",
})

const SHORT_TYPE: Record<string, string> = {
  "Barangay Clearance": "Clearance",
  "Certificate of Residency": "Residency",
  "Certificate of Indigency": "Indigency",
  "Certificate of Good Moral Character": "Good Moral",
  "Business Clearance": "Business",
  "First Time Job Seeker Certificate": "FTJS",
}

type MonthRow = { month: string } & Record<string, number | string>

export const certificateVolume = defineReport<Certificate, MonthRow>({
  id: "certificate-volume",
  title: "Monthly Certificate Volume",
  description: "Certificates issued each month of the year, by type.",
  section: "services",
  slug: "certificates",
  source: (d) => d.certificates.filter((c) => c.status !== "Cancelled"),
  filters: [cf.year, cf.type, cf.purok],
  rows: (items, d, f) => {
    const year = f.fiscalYear ?? d.now.getFullYear()
    return monthsOfYear(year, d.now).map((key) => {
      const inMonth = items.filter((c) => monthKey(c.dateIssued) === key)
      return {
        month: key,
        ...Object.fromEntries(CERTIFICATE_TYPES.map((t) => [t, inMonth.filter((c) => c.type === t).length])),
        total: inMonth.length,
      }
    })
  },
  rowId: (r) => r.month,
  columns: [
    { id: "month", header: "Month", value: (r) => monthLabel(r.month, "MMMM yyyy") },
    ...CERTIFICATE_TYPES.map((t) => ({ id: t, header: SHORT_TYPE[t], format: "number" as const, value: (r: MonthRow) => Number(r[t]), total: "sum" as const })),
    { id: "total", header: "Total", format: "number", value: (r) => Number(r.total), total: "sum" },
  ],
  summary: (items, rows) => {
    const peak = [...rows].sort((a, b) => Number(b.total) - Number(a.total))[0]
    return [
      { label: "Issued in period", value: items.length },
      { label: "Monthly average", value: rows.length ? items.length / rows.length : 0 },
      { label: "Peak month", value: peak ? monthLabel(peak.month, "MMMM") : "—", hint: peak ? `${peak.total} certificates` : undefined },
    ]
  },
  charts: [
    {
      type: "trend",
      title: "Monthly issuance",
      wide: true,
      seriesName: "Certificates",
      data: ({ rows }) => rows.map((r) => ({ label: monthLabel(r.month, "MMM"), value: Number(r.total) })),
    },
  ],
  note: "Cancelled certificates are excluded. The current year runs to the current month.",
})

/* -------------------------------------------------------- service requests -- */

const OPEN_REQUEST = ["Submitted", "Under Review", "Approved", "Ready for Release"]

const qf = {
  range: { id: "dateRange", label: "Date requested", getDate: (r) => r.dateRequested },
  service: { id: "serviceType", get: (r) => r.service },
  status: { id: "status", options: REQUEST_STATUSES, get: (r) => r.status },
  channel: { id: "category", label: "Channel", options: REQUEST_CHANNELS, get: (r) => r.channel },
  purok: { id: "purok", get: (r, d) => d.by.resident.get(r.residentId)?.address.purok },
} satisfies Record<string, ReportFilterSpec<ServiceRequest>>

type StatusRow = { status: string; count: number; share: number }

export const requestSummary = defineReport<ServiceRequest, StatusRow>({
  id: "request-summary",
  title: "Service Request Summary",
  description: "Requests by status with completion and rejection rates.",
  section: "services",
  slug: "services",
  source: (d) => d.serviceRequests,
  filters: [qf.range, qf.service, qf.channel, qf.purok],
  rows: (items) =>
    REQUEST_STATUSES.map((status) => ({
      status,
      count: items.filter((r) => r.status === status).length,
      share: percent(items.filter((r) => r.status === status).length, items.length),
    })),
  rowId: (r) => r.status,
  tableTitle: "Requests by status",
  columns: [
    { id: "status", header: "Status", format: "status", value: (r) => r.status },
    { id: "count", header: "Requests", format: "number", value: (r) => r.count, total: "sum" },
    { id: "share", header: "% of Requests", format: "progress", value: (r) => r.share },
  ],
  summary: (items) => {
    const n = (s: string) => items.filter((r) => r.status === s).length
    return [
      { label: "Total requests", value: items.length },
      { label: "Pending", value: n("Submitted"), tone: "info", hint: "Submitted, not yet reviewed" },
      { label: "Under review", value: n("Under Review"), tone: "warning" },
      { label: "Approved", value: n("Approved") + n("Ready for Release"), tone: "purple", hint: `${n("Ready for Release")} ready for release` },
      { label: "Completed", value: n("Completed"), tone: "success", hint: `${percent(n("Completed"), items.length).toFixed(0)}% of requests` },
      { label: "Rejected", value: n("Rejected"), tone: "danger" },
    ]
  },
  charts: [
    {
      type: "bar",
      title: "Requests by status",
      seriesName: "Requests",
      data: ({ rows }) => rows.map((r) => ({ label: r.status.replace("Ready for Release", "Ready"), value: r.count })),
    },
    { type: "proportion", title: "Requests by channel", data: ({ items }) => countBy(items, (r) => r.channel, REQUEST_CHANNELS) },
  ],
})

type ServiceRow = { service: string; total: number; open: number; completed: number; rejected: number; completionRate: number }

export const requestsByType = defineReport<ServiceRequest, ServiceRow>({
  id: "requests-by-type",
  title: "Service Requests by Type",
  description: "Volume and outcome of requests for each service.",
  section: "services",
  slug: "services",
  source: (d) => d.serviceRequests,
  filters: [qf.range, qf.status, qf.channel, qf.purok],
  rows: (items) =>
    SERVICE_TYPES.map((service) => {
      const list = items.filter((r) => r.service === service)
      const completed = list.filter((r) => r.status === "Completed").length
      return {
        service,
        total: list.length,
        open: list.filter((r) => OPEN_REQUEST.includes(r.status)).length,
        completed,
        rejected: list.filter((r) => r.status === "Rejected").length,
        completionRate: percent(completed, list.length),
      }
    }).filter((r) => r.total > 0),
  rowId: (r) => r.service,
  columns: [
    { id: "service", header: "Service", value: (r) => r.service },
    { id: "total", header: "Requests", format: "number", value: (r) => r.total, total: "sum" },
    { id: "open", header: "Open", format: "number", value: (r) => r.open, total: "sum" },
    { id: "completed", header: "Completed", format: "number", value: (r) => r.completed, total: "sum" },
    { id: "rejected", header: "Rejected", format: "number", value: (r) => r.rejected, total: "sum" },
    {
      id: "completionRate",
      header: "Completion Rate",
      format: "progress",
      value: (r) => r.completionRate,
      total: (rows) =>
        percent(
          sum(rows, (r) => r.completed),
          sum(rows, (r) => r.total),
        ),
    },
  ],
  charts: [
    {
      type: "hbar",
      title: "Requests by service",
      wide: true,
      seriesName: "Requests",
      data: ({ rows }) => rows.map((r) => ({ label: r.service, value: r.total })),
    },
  ],
})

type TimeRow = { service: string; count: number; average: number; fastest: number; slowest: number }

export const requestProcessingTime = defineReport<ServiceRequest, TimeRow>({
  id: "request-processing-time",
  title: "Service Request Processing Time",
  description: "Time from submission to completion or rejection, per service.",
  section: "services",
  slug: "services",
  source: (d) => d.serviceRequests.filter((r) => processingHours(r) !== undefined),
  filters: [qf.range, qf.channel, qf.purok],
  rows: (items) =>
    SERVICE_TYPES.map((service) => {
      const stats = durationStats(items.filter((r) => r.service === service).map((r) => processingHours(r)!))
      return { service, count: stats.count, average: stats.average, fastest: stats.fastest, slowest: stats.slowest }
    }).filter((r) => r.count > 0),
  rowId: (r) => r.service,
  columns: [
    { id: "service", header: "Service Type", value: (r) => r.service },
    { id: "count", header: "Closed Requests", format: "number", value: (r) => r.count, total: "sum" },
    {
      id: "average",
      header: "Average Processing Time",
      format: "hours",
      value: (r) => r.average,
      total: (rows) => (sum(rows, (r) => r.count) ? sum(rows, (r) => r.average * r.count) / sum(rows, (r) => r.count) : 0),
    },
    { id: "fastest", header: "Fastest", format: "hours", value: (r) => r.fastest },
    { id: "slowest", header: "Slowest", format: "hours", value: (r) => r.slowest },
  ],
  summary: (items) => {
    const stats = durationStats(items.map((r) => processingHours(r)!))
    return [
      { label: "Closed requests", value: stats.count },
      { label: "Average", value: stats.average, format: "hours" },
      { label: "Fastest", value: stats.fastest, format: "hours" },
      { label: "Slowest", value: stats.slowest, format: "hours" },
    ]
  },
  charts: [
    {
      type: "hbar",
      title: "Average hours to close",
      wide: true,
      seriesName: "Average hours",
      data: ({ rows }) => rows.map((r) => ({ label: r.service, value: Math.round(r.average * 10) / 10 })),
    },
  ],
  note: "Measured from the Submitted status to Completed or Rejected in each request's history. Open requests are excluded.",
})

export const SERVICE_REPORTS = [certificatesIssued, certificatesByType, certificateVolume, requestSummary, requestsByType, requestProcessingTime]
