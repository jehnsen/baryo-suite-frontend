import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from "date-fns"
import type { BarangaySession, BlotterCase, Committee, Household, Project, Resident, ServiceRequest } from "@/types"
import { computeAge } from "@/lib/format"
import type { Ledger } from "@/lib/finance"

/**
 * Centralized report calculations. Definitions call these instead of
 * repeating math inline, so a figure means the same thing in every report.
 */

/* ----------------------------------------------------------- basic math -- */

/** part ÷ whole × 100, or 0 when whole is 0. */
export const percent = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

export const sum = <T>(items: T[], value: (t: T) => number) => items.reduce((s, t) => s + value(t), 0)

export const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0)

/** Count per key, in a fixed key order when given (zero-count keys kept). */
export function countBy<T>(items: T[], key: (t: T) => string | string[] | undefined, order?: readonly string[]) {
  const counts = new Map<string, number>((order ?? []).map((k) => [k, 0]))
  items.forEach((t) => {
    const k = key(t)
    ;(Array.isArray(k) ? k : k === undefined ? [] : [k]).forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1))
  })
  return [...counts.entries()].map(([label, value]) => ({ label, value }))
}

/** Sum per key, in a fixed key order when given. */
export function sumBy<T>(items: T[], key: (t: T) => string, amount: (t: T) => number, order?: readonly string[]) {
  const sums = new Map<string, number>((order ?? []).map((k) => [k, 0]))
  items.forEach((t) => sums.set(key(t), (sums.get(key(t)) ?? 0) + amount(t)))
  return [...sums.entries()].map(([label, value]) => ({ label, value }))
}

export function groupBy<T>(items: T[], key: (t: T) => string) {
  const groups = new Map<string, T[]>()
  items.forEach((t) => groups.set(key(t), [...(groups.get(key(t)) ?? []), t]))
  return groups
}

/* ------------------------------------------------------------ residents -- */

/** Report age brackets (0–5 … 60+). */
export const REPORT_AGE_GROUPS = [
  { label: "0–5", min: 0, max: 5 },
  { label: "6–12", min: 6, max: 12 },
  { label: "13–17", min: 13, max: 17 },
  { label: "18–30", min: 18, max: 30 },
  { label: "31–59", min: 31, max: 59 },
  { label: "60+", min: 60, max: 200 },
] as const

export const ageOf = (r: Pick<Resident, "birthDate">, now: Date) => computeAge(r.birthDate, now)
export const ageGroupOf = (age: number) => REPORT_AGE_GROUPS.find((g) => age >= g.min && age <= g.max)?.label ?? "—"

/** Youth per RA 10742 (Sangguniang Kabataan Reform Act): ages 15–30. */
export const isYouth = (age: number) => age >= 15 && age <= 30

export const voterStatus = (r: Resident) => (r.classification.registeredVoter ? "Registered" : "Not Registered")

export function averageHouseholdSize(households: Household[], members: Map<string, Resident[]>) {
  return households.length ? sum(households, (h) => members.get(h.id)?.length ?? 0) / households.length : 0
}

/* ------------------------------------------------------------- services -- */

/** Hours from submission to completion (or rejection); undefined while still open. */
export function processingHours(r: ServiceRequest): number | undefined {
  const start = r.history.find((h) => h.status === "Submitted")?.at ?? r.dateRequested
  const end = r.history.find((h) => h.status === "Completed" || h.status === "Rejected")?.at
  if (!end) return undefined
  return Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)) / 60)
}

export function durationStats(hours: number[]) {
  return { count: hours.length, average: average(hours), fastest: hours.length ? Math.min(...hours) : 0, slowest: hours.length ? Math.max(...hours) : 0 }
}

/** "45 min" · "5.2 hrs" · "2.4 days" */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—"
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} hrs`
  return `${(hours / 24).toFixed(1)} days`
}

/* ---------------------------------------------------------- peace/order -- */

export const OPEN_BLOTTER_STATUSES = ["Reported", "Under Investigation", "For Mediation"] as const
export const isOpenCase = (b: BlotterCase) => (OPEN_BLOTTER_STATUSES as readonly string[]).includes(b.status)

/** Cases settled or closed at the barangay level ÷ all cases. Referred cases are disposed but not resolved. */
export const resolutionRate = (cases: BlotterCase[]) => percent(cases.filter((b) => b.status === "Settled" || b.status === "Closed").length, cases.length)

/** Purok of a case: the location text when it names one, otherwise the complainant's purok. */
export function blotterPurok(b: BlotterCase, residents: Map<string, Resident>): string {
  const named = b.location.match(/Purok \d+/)?.[0]
  if (named) return named
  return (b.complainant.residentId && residents.get(b.complainant.residentId)?.address.purok) || "Unspecified"
}

/** Days from filing to the first Settled/Closed status. */
export function daysToResolve(b: BlotterCase): number | undefined {
  const end = b.history.find((h) => h.status === "Settled" || h.status === "Closed")?.at
  return end ? differenceInCalendarDays(parseISO(end), parseISO(b.date)) : undefined
}

/* ----------------------------------------------------------- governance -- */

export const PRESENT_STATUSES = ["Present", "Late"] as const
export const attendedCount = (s: BarangaySession) => s.attendance.filter((a) => (PRESENT_STATUSES as readonly string[]).includes(a.status)).length
export const attendanceRate = (s: BarangaySession) => percent(attendedCount(s), s.attendance.length)

/** Sessions where the committee chair delivered the committee's report. */
export function committeeReportCount(c: Committee, sessions: BarangaySession[]) {
  const short = c.name.replace(/^Committee on /, "")
  return sessions.filter((s) => s.status === "Completed" && s.agenda.some((a) => a.type === "Report" && a.title.includes(short))).length
}

/* ------------------------------------------------------------- projects -- */

/** Budget, obligations and disbursements of a project, read from its PPA in the ledger. */
export function projectFinancials(p: Project, ppa: Parameters<Ledger["forPPA"]>[0] | undefined, ledger: Ledger) {
  const m = ppa ? ledger.forPPA(ppa) : undefined
  return {
    budget: m?.approved ?? 0,
    obligated: m?.obligated ?? 0,
    disbursed: m?.disbursed ?? 0,
    /** Financial progress = disbursed ÷ budget (same as the project detail page). */
    financialProgress: m?.disbursementRate ?? 0,
  }
}

export const isProjectClosed = (p: Project) => p.status === "Completed" || p.status === "Cancelled"

/** Days past the target date for unfinished projects (0 when on schedule). */
export function daysDelayed(p: Project, today: string): number {
  if (isProjectClosed(p)) return 0
  return Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(p.targetDate)))
}

export const isProjectDelayed = (p: Project, today: string) => p.status === "Delayed" || daysDelayed(p, today) > 0

/* ---------------------------------------------------------------- dates -- */

export const monthKey = (iso: string) => iso.slice(0, 7)
export const monthLabel = (key: string, pattern = "MMM yyyy") => format(parseISO(`${key}-01`), pattern)
export const yearOf = (iso: string) => Number(iso.slice(0, 4))

/** yyyy-MM keys for Jan–Dec of a year, stopping at the current month for the current year. */
export function monthsOfYear(year: number, now: Date): string[] {
  const last = year === now.getFullYear() ? now.getMonth() + 1 : year < now.getFullYear() ? 12 : 0
  return Array.from({ length: last }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
}
