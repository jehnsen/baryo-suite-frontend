import type { Collection, CollectionStatus, CollectionType, PaymentMethod } from "@/types"
import { certificates } from "./certificates"
import { residents } from "./residents"
import { MOCK_TODAY, createRng, pad } from "./_seed"

/**
 * FY 2026 treasury collections. Released certificates with an O.R. number are
 * carried over as collections (same O.R.), so the certificate and treasury
 * records reconcile. The rest are business clearances, facility rentals and
 * other barangay charges.
 */

const rng = createRng(4870)
const COLLECTORS = ["usr-004", "usr-004", "usr-004", "usr-003"]
const today = new Date(`${MOCK_TODAY}T00:00:00`)
const daysBefore = (iso: string) => Math.round((today.getTime() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000)

function statusFor(date: string): CollectionStatus {
  const age = daysBefore(date)
  if (age <= 1) return "Recorded"
  if (age <= 4) return rng.chance(0.5) ? "Recorded" : "Deposited"
  if (age <= 40) return rng.chance(0.25) ? "Deposited" : "Reconciled"
  return "Reconciled"
}

const BUSINESSES = [
  ["Aling Rosa Sari-Sari Store", 500],
  ["JM Water Refilling Station", 1500],
  ["San Roque Bakery", 1000],
  ["Dela Cruz Tricycle Parts", 1000],
  ["Mendoza Carinderia", 800],
  ["Bautista Computer Shop", 1500],
  ["Garcia Rice Retailer", 1000],
  ["Villanueva Hardware", 3000],
  ["Kuya Jun's Barbershop", 500],
  ["Santos Pharmacy", 2000],
  ["RB Motorcycle Repair", 1000],
  ["Mabini St. Laundry Shop", 800],
  ["Ocampo Dental Clinic", 2000],
  ["Riverside Food Stall", 500],
  ["Lacson Trading", 3000],
  ["Pascual Printing Services", 1000],
  ["Galang Welding Shop", 1500],
  ["Cunanan Poultry Supply", 1500],
  ["Sampaguita Beauty Salon", 800],
  ["Kawayan Fresh Market Stall 3", 500],
] as const

const FACILITIES = [
  ["Covered court rental – birthday event (4 hrs)", 1000],
  ["Covered court rental – basketball league (2 hrs)", 500],
  ["Multi-purpose hall rental – wake/vigil (per day)", 1500],
  ["Multi-purpose hall rental – seminar", 1200],
  ["Sound system rental", 700],
] as const

const OTHERS = [
  ["Market stall rental – Kawayan Fresh Market", 1500],
  ["Community Tax Certificate (barangay share)", 85],
  ["Tree cutting certification fee", 300],
  ["Filing fee – Lupon complaint", 100],
] as const

function build(): Collection[] {
  const list: Omit<Collection, "id" | "transactionNumber">[] = []
  const pickResident = () => rng.pick(residents.filter((r) => r.status === "Active" && Number(r.birthDate.slice(0, 4)) <= 2006))
  const method = (): PaymentMethod =>
    rng.weighted([
      ["Cash", 16],
      ["GCash", 3],
      ["Maya", 1],
      ["Bank Transfer", 1],
    ] as const)

  // 1) Certificate fees already paid in the Certificates module.
  certificates
    .filter((c) => c.status === "Released" && c.orNumber && c.fee > 0 && c.dateIssued >= "2026-01-01")
    .forEach((c) => {
      const r = residents.find((x) => x.id === c.residentId)
      const type: CollectionType =
        c.type === "Barangay Clearance" ? "Barangay Clearance" : c.type === "Business Clearance" ? "Business Clearance" : "Certification Fee"
      list.push({
        orNumber: c.orNumber!,
        date: c.dateIssued,
        payerName: r ? `${r.firstName} ${r.lastName}` : "Walk-in",
        residentId: c.residentId,
        type,
        description: `${c.type} – ${c.purpose}`,
        amount: c.fee,
        paymentMethod: "Cash",
        collectorId: rng.pick(COLLECTORS),
        status: statusFor(c.dateIssued),
        certificateId: c.id,
        createdAt: `${c.dateIssued}T10:00:00+08:00`,
      })
    })

  const dateIn = (month: number) => `2026-${pad(month, 2)}-${pad(rng.int(2, month === 9 ? 27 : 28), 2)}`
  let or = 46_100

  // 2) Business clearance renewals peak in January–February.
  for (let i = 0; i < 230; i++) {
    const month = rng.weighted([
      [1, 9],
      [2, 5],
      [3, 2],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [9, 1],
    ] as const)
    const [name, base] = rng.pick(BUSINESSES)
    const r = pickResident()
    const date = dateIn(month)
    list.push({
      orNumber: `OR-${pad(or++, 7)}`,
      date,
      payerName: `${r.firstName} ${r.lastName}`,
      residentId: r.id,
      businessName: name,
      type: "Business Clearance",
      description: `${month <= 2 ? "Renewal" : "New"} business clearance – ${name}`,
      amount: base,
      paymentMethod: method(),
      collectorId: rng.pick(COLLECTORS),
      status: statusFor(date),
      createdAt: `${date}T09:30:00+08:00`,
    })
  }

  // 3) Facility fees and other charges spread over the year.
  for (let i = 0; i < 70; i++) {
    const [description, amount] = rng.pick(FACILITIES)
    const r = pickResident()
    const date = dateIn(rng.int(1, 9))
    list.push({
      orNumber: `OR-${pad(or++, 7)}`,
      date,
      payerName: `${r.firstName} ${r.lastName}`,
      residentId: r.id,
      type: "Facility Fee",
      description,
      amount,
      paymentMethod: method(),
      collectorId: rng.pick(COLLECTORS),
      status: statusFor(date),
      createdAt: `${date}T14:00:00+08:00`,
    })
  }
  for (let month = 1; month <= 9; month++) {
    for (let stall = 1; stall <= 6; stall++) {
      const date = `2026-${pad(month, 2)}-${pad(Math.min(5 + stall, 12), 2)}`
      list.push({
        orNumber: `OR-${pad(or++, 7)}`,
        date,
        payerName: `Stall ${stall} Lessee`,
        businessName: `Kawayan Fresh Market Stall ${stall}`,
        type: "Other Barangay Collection",
        description: OTHERS[0][0],
        amount: OTHERS[0][1],
        paymentMethod: "Cash",
        collectorId: "usr-004",
        status: statusFor(date),
        createdAt: `${date}T08:30:00+08:00`,
      })
    }
  }
  for (let i = 0; i < 120; i++) {
    const [description, amount] = rng.pick(OTHERS.slice(1))
    const r = pickResident()
    const date = dateIn(
      rng.weighted([
        [1, 5],
        [2, 3],
        [3, 2],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [8, 1],
        [9, 1],
      ] as const),
    )
    list.push({
      orNumber: `OR-${pad(or++, 7)}`,
      date,
      payerName: `${r.firstName} ${r.lastName}`,
      residentId: r.id,
      type: "Other Barangay Collection",
      description,
      amount,
      paymentMethod: "Cash",
      collectorId: rng.pick(COLLECTORS),
      status: statusFor(date),
      createdAt: `${date}T11:00:00+08:00`,
    })
  }

  // A few cancelled receipts (spoiled O.R.s) keep the audit story realistic.
  list.slice(20, 23).forEach((c) => (c.status = "Cancelled"))

  return list
    .sort((a, b) => a.date.localeCompare(b.date) || a.orNumber.localeCompare(b.orNumber))
    .map((c, i) => ({
      ...c,
      id: `col-${pad(i + 1, 4)}`,
      transactionNumber: `COL-2026-${pad(i + 1, 5)}`,
      depositReference: c.status === "Deposited" || c.status === "Reconciled" ? `LBP-DS-${c.date.replace(/-/g, "")}` : undefined,
    }))
    .reverse()
}

export const collections: Collection[] = build()
