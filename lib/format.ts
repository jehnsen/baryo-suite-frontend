import { differenceInYears, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns"
import type { Address, BarangayOfficial, Resident } from "@/types"
import { AGE_GROUPS } from "@/lib/constants"

const toDate = (value: string | Date) => (typeof value === "string" ? parseISO(value) : value)

export function formatDate(value?: string | Date, pattern = "MMM d, yyyy"): string {
  if (!value) return "—"
  const d = toDate(value)
  return isValid(d) ? format(d, pattern) : "—"
}

export function formatDateTime(value?: string | Date): string {
  return formatDate(value, "MMM d, yyyy · h:mm a")
}

export function formatTime(hhmm?: string): string {
  if (!hhmm) return "—"
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return format(d, "h:mm a")
}

export function formatRelative(value?: string | Date): string {
  if (!value) return "—"
  const d = toDate(value)
  return isValid(d) ? formatDistanceToNowStrict(d, { addSuffix: true }) : "—"
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 })
export const formatPeso = (amount: number) => peso.format(amount)

export const formatNumber = (n: number) => new Intl.NumberFormat("en-PH").format(n)

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type PersonName = Pick<Resident, "firstName" | "lastName"> & { middleName?: string; suffix?: string }

/** "Juan S. Dela Cruz Jr." */
export function fullName(p?: PersonName | null): string {
  if (!p) return "—"
  const mi = p.middleName ? ` ${p.middleName[0]}.` : ""
  return `${p.firstName}${mi} ${p.lastName}${p.suffix ? " " + p.suffix : ""}`
}

/** "DELA CRUZ, Juan S." — registry ordering */
export function formalName(p?: PersonName | null): string {
  if (!p) return "—"
  const mi = p.middleName ? ` ${p.middleName[0]}.` : ""
  return `${p.lastName}, ${p.firstName}${mi}${p.suffix ? " " + p.suffix : ""}`
}

export function officialName(o?: BarangayOfficial | null, withHonorific = false): string {
  if (!o) return "—"
  const hon = withHonorific && o.position !== "Staff" && o.position !== "Barangay Tanod" ? "Hon. " : ""
  return `${hon}${fullName(o)}`
}

export function initials(name: string): string {
  return name
    .replace(/^(Hon\.|Ma\.)\s*/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÑñ]/.test(w) && !w.endsWith("."))
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function computeAge(birthDate: string, today: Date = new Date()): number {
  return differenceInYears(today, parseISO(birthDate))
}

export function ageGroupOf(age: number): string {
  return AGE_GROUPS.find((g) => age >= g.min && age <= g.max)?.label ?? "—"
}

export function formatAddress(a?: Address, opts: { includePurok?: boolean } = { includePurok: true }): string {
  if (!a) return "—"
  return [`${a.houseNumber} ${a.street}`, a.sitio, opts.includePurok ? a.purok : undefined].filter(Boolean).join(", ")
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

/** Local-date ISO string (yyyy-MM-dd) — avoids UTC shift from toISOString(). */
export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

/** ₱8.45M · ₱487.5K — for KPI tiles and chart axes. Use formatPeso for records. */
export function formatPesoCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? "−" : ""
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`
  if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return `${sign}₱${abs.toFixed(0)}`
}

export const formatPercent = (value: number, digits = 1) => `${(Number.isFinite(value) ? value : 0).toFixed(digits)}%`

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function chunkToWords(n: number): string {
  const parts: string[] = []
  if (n >= 100) parts.push(`${ONES[Math.floor(n / 100)]} Hundred`)
  const rest = n % 100
  if (rest >= 20) parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ""))
  else if (rest > 0) parts.push(ONES[rest])
  return parts.join(" ")
}

/** "One Thousand Five Hundred Pesos and 50/100" — for receipts and vouchers. */
export function pesosInWords(amount: number): string {
  const whole = Math.floor(amount)
  const cents = Math.round((amount - whole) * 100)
  if (whole === 0) return `Zero Pesos and ${String(cents).padStart(2, "0")}/100`
  const scales = ["", "Thousand", "Million", "Billion"]
  const words: string[] = []
  let n = whole
  let i = 0
  while (n > 0) {
    const chunk = n % 1000
    if (chunk) words.unshift(`${chunkToWords(chunk)}${scales[i] ? " " + scales[i] : ""}`)
    n = Math.floor(n / 1000)
    i++
  }
  return `${words.join(" ")} Peso${whole === 1 ? "" : "s"}${cents ? ` and ${String(cents).padStart(2, "0")}/100` : " Only"}`
}
