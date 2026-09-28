import type { Asset, AssetCategory, AssetCondition, AssetStatus, InventoryItem, InventoryTransaction, MaintenanceRecord, Project, ProjectMilestone, StatusChange } from "@/types"
import { finance } from "./_finance"
import { MOCK_TODAY, createRng, pad } from "./_seed"

/**
 * Operations dataset. Projects link to Project-type PPAs (budget and financial
 * progress come from finance); assets can link to the disbursement that paid
 * for them; inventory quantities are derived from transactions.
 */

const rng = createRng(3_2026)
const ts = (iso: string, hour: number, minute = 0) => `${iso}T${pad(hour, 2)}:${pad(minute, 2)}:00+08:00`
const ppaByCode = (code: string) => finance.ppas.find((p) => p.code === code)!

/* --------------------------------- Projects -------------------------------- */

const ms = (id: string, title: string, targetDate: string, progress: number, completionDate?: string, remarks?: string, delayed?: boolean): ProjectMilestone => ({
  id,
  title,
  targetDate,
  completionDate,
  progress,
  status: progress >= 100 ? "Completed" : delayed ? "Delayed" : progress > 0 ? "In Progress" : "Pending",
  remarks,
})

const projHistory = (entries: [Project["status"], string, string?][]): StatusChange<Project["status"]>[] =>
  entries.map(([status, date, note]) => ({ status, at: ts(date, 10), byUserId: status === "Approved" ? "usr-002" : "usr-005", note }))

export const projects: Project[] = [
  {
    id: "prj-2026-001",
    code: "PRJ-2026-001",
    name: "Drainage Improvement",
    description: "420 linear meters of reinforced concrete drainage along Riverside Rd. and Bonifacio St. to reduce flooding in Purok 3.",
    ppaId: ppaByCode("IN-2026-01").id,
    location: "Riverside Rd. and Bonifacio St., Purok 3",
    contractor: "JRB Construction & Supply",
    responsibleOfficialId: "off-005",
    startDate: "2026-04-15",
    targetDate: "2026-11-30",
    physicalProgress: 68,
    status: "Ongoing",
    milestones: [
      ms("ms-1-1", "Survey, program of works and MOA signing", "2026-03-31", 100, "2026-03-27"),
      ms("ms-1-2", "Mobilization and excavation (Riverside Rd.)", "2026-05-15", 100, "2026-05-12"),
      ms("ms-1-3", "Phase 1 – 250 m drainage, Riverside Rd.", "2026-07-15", 100, "2026-07-20", "Completed 5 days late due to typhoon."),
      ms("ms-1-4", "Phase 2 – 170 m drainage, Bonifacio St.", "2026-10-15", 45),
      ms("ms-1-5", "Manhole covers, backfill and turnover", "2026-11-30", 0),
    ],
    attachments: [
      { id: "att-prj1-1", name: "program-of-works-drainage.pdf", size: 1_204_000, type: "application/pdf", uploadedAt: ts("2026-03-20", 9) },
      { id: "att-prj1-2", name: "moa-baliwag-city.pdf", size: 640_800, type: "application/pdf", uploadedAt: ts("2026-03-27", 15) },
      { id: "att-prj1-3", name: "site-photo-july.jpg", size: 2_860_000, type: "image/jpeg", uploadedAt: ts("2026-07-21", 11) },
    ],
    history: projHistory([
      ["Planning", "2026-02-10"],
      ["Approved", "2026-03-20", "Funded by City assistance per MOA."],
      ["Procurement", "2026-03-27"],
      ["Ongoing", "2026-04-15", "Contractor mobilized."],
    ]),
  },
  {
    id: "prj-2026-002",
    code: "PRJ-2026-002",
    name: "Streetlight Installation",
    description: "40 solar-powered LED streetlights for Puroks 5, 6 and 7.",
    ppaId: ppaByCode("IN-2026-02").id,
    location: "Puroks 5, 6 and 7",
    contractor: "SolarLight Philippines Inc.",
    responsibleOfficialId: "off-005",
    startDate: "2026-05-25",
    targetDate: "2026-10-15",
    physicalProgress: 85,
    status: "Ongoing",
    milestones: [
      ms("ms-2-1", "Delivery of 40 solar streetlight units", "2026-06-15", 100, "2026-06-12"),
      ms("ms-2-2", "Installation – Purok 5 (14 units)", "2026-07-15", 100, "2026-07-10"),
      ms("ms-2-3", "Installation – Purok 6 (14 units)", "2026-08-31", 100, "2026-08-28"),
      ms("ms-2-4", "Installation – Purok 7 (12 units)", "2026-09-30", 40),
      ms("ms-2-5", "Testing and acceptance", "2026-10-15", 0),
    ],
    attachments: [{ id: "att-prj2-1", name: "streetlight-layout.pdf", size: 820_000, type: "application/pdf", uploadedAt: ts("2026-05-20", 9) }],
    history: projHistory([
      ["Planning", "2026-04-10"],
      ["Approved", "2026-05-18"],
      ["Procurement", "2026-05-19"],
      ["Ongoing", "2026-05-25"],
    ]),
  },
  {
    id: "prj-2026-003",
    code: "PRJ-2026-003",
    name: "Barangay Hall Renovation",
    description: "Roof replacement, repainting and restroom renovation of the barangay hall.",
    ppaId: ppaByCode("IN-2026-03").id,
    location: "Barangay Hall, Rizal St.",
    contractor: "M.D. Cruz Builders",
    responsibleOfficialId: "off-005",
    startDate: "2026-06-20",
    targetDate: "2026-09-15",
    physicalProgress: 55,
    status: "Delayed",
    milestones: [
      ms("ms-3-1", "Roof replacement", "2026-07-31", 100, "2026-08-14", "Delayed by two weeks of heavy rain."),
      ms("ms-3-2", "Repainting (interior and exterior)", "2026-08-31", 60, undefined, "Painters reassigned by contractor.", true),
      ms("ms-3-3", "Restroom renovation", "2026-09-15", 0, undefined, "Awaiting tiles delivery.", true),
    ],
    attachments: [],
    history: projHistory([
      ["Planning", "2026-05-02"],
      ["Approved", "2026-06-01"],
      ["Procurement", "2026-06-02"],
      ["Ongoing", "2026-06-20"],
      ["Delayed", "2026-09-16", "Target date missed; contractor given notice to catch up."],
    ]),
  },
  {
    id: "prj-2026-004",
    code: "PRJ-2026-004",
    name: "Road Repair – Kawayan St.",
    description: "Asphalt overlay and pothole repair of 300 meters along Kawayan St.",
    ppaId: ppaByCode("IN-2026-04").id,
    location: "Kawayan St., Purok 7",
    contractor: "To be procured",
    responsibleOfficialId: "off-005",
    startDate: "2026-10-01",
    targetDate: "2026-12-15",
    physicalProgress: 0,
    status: "Procurement",
    milestones: [
      ms("ms-4-1", "City Engineering road assessment", "2026-08-31", 100, "2026-08-25"),
      ms("ms-4-2", "Canvass and award", "2026-09-30", 50),
      ms("ms-4-3", "Asphalt overlay", "2026-11-30", 0),
      ms("ms-4-4", "Turnover", "2026-12-15", 0),
    ],
    attachments: [],
    history: projHistory([
      ["Planning", "2026-08-03"],
      ["Approved", "2026-08-25"],
      ["Procurement", "2026-09-07"],
    ]),
  },
  {
    id: "prj-2026-005",
    code: "PRJ-2026-005",
    name: "Covered Court Improvement",
    description: "Resurfacing, new ring system and LED floodlights for the barangay covered court.",
    ppaId: ppaByCode("YD-2026-02").id,
    location: "Barangay Covered Court",
    contractor: "Court Masters Sports Flooring",
    responsibleOfficialId: "off-009",
    startDate: "2026-09-01",
    targetDate: "2026-12-20",
    physicalProgress: 15,
    status: "Ongoing",
    milestones: [
      ms("ms-5-1", "Mobilization", "2026-09-05", 100, "2026-09-03"),
      ms("ms-5-2", "Court resurfacing", "2026-10-31", 25),
      ms("ms-5-3", "Ring system and floodlights", "2026-12-10", 0),
      ms("ms-5-4", "Turnover and inauguration", "2026-12-20", 0),
    ],
    attachments: [],
    history: projHistory([
      ["Planning", "2026-07-06"],
      ["Approved", "2026-08-17"],
      ["Procurement", "2026-08-18"],
      ["Ongoing", "2026-09-01"],
    ]),
  },
  {
    id: "prj-2025-001",
    code: "PRJ-2025-001",
    name: "Barangay Health Station Renovation",
    description: "Renovation of the health station consultation and waiting areas.",
    ppaId: finance.ppas.find((p) => p.budgetId === "bud-2025" && p.type === "Project" && p.category === "Health")!.id,
    location: "Barangay Health Station, Mabini St.",
    contractor: "M.D. Cruz Builders",
    responsibleOfficialId: "off-002",
    startDate: "2025-03-01",
    targetDate: "2025-07-31",
    actualCompletion: "2025-07-25",
    physicalProgress: 100,
    status: "Completed",
    milestones: [ms("ms-6-1", "Structural repairs", "2025-05-15", 100, "2025-05-10"), ms("ms-6-2", "Finishing works", "2025-07-15", 100, "2025-07-18"), ms("ms-6-3", "Turnover", "2025-07-31", 100, "2025-07-25")],
    attachments: [{ id: "att-prj6-1", name: "certificate-of-completion.pdf", size: 402_000, type: "application/pdf", uploadedAt: ts("2025-07-28", 10) }],
    history: projHistory([
      ["Planning", "2025-01-15"],
      ["Approved", "2025-02-10"],
      ["Procurement", "2025-02-11"],
      ["Ongoing", "2025-03-01"],
      ["Completed", "2025-07-25"],
    ]),
  },
]

/* ---------------------------------- Assets --------------------------------- */

const dvFor = (ppaCode: string) => {
  const ppa = ppaByCode(ppaCode)
  const obl = finance.obligations.find((o) => o.ppaId === ppa.id)
  return finance.disbursements.find((d) => d.obligationId === obl?.id && d.status === "Released")?.id
}

interface AssetSeed {
  name: string
  category: AssetCategory
  cost: number
  date: string
  source: string
  custodian: string
  location: string
  condition: AssetCondition
  status?: AssetStatus
  count?: number
  serial?: string
  dv?: string
}

const ASSETS: AssetSeed[] = [
  { name: "Desktop Computer (Core i5, 16GB)", category: "IT Equipment", cost: 38_500, date: "2024-02-12", source: "Barangay Fund", custodian: "off-010", location: "Secretary's Office", condition: "Good", count: 3 },
  { name: "Laptop (Core i5)", category: "IT Equipment", cost: 42_000, date: "2025-06-18", source: "Barangay Fund", custodian: "off-011", location: "Treasurer's Office", condition: "Excellent" },
  { name: "Laser Printer (Monochrome)", category: "Office Equipment", cost: 12_800, date: "2024-02-12", source: "Barangay Fund", custodian: "off-010", location: "Secretary's Office", condition: "Fair" },
  { name: "Ink Tank Printer (Color)", category: "Office Equipment", cost: 9_500, date: "2025-01-20", source: "Barangay Fund", custodian: "off-016", location: "Records Room", condition: "For Repair", status: "Under Maintenance" },
  { name: "Photocopier Machine", category: "Office Equipment", cost: 68_000, date: "2022-08-05", source: "City Government", custodian: "off-010", location: "Records Room", condition: "Fair" },
  { name: "CCTV Camera (IP, 4MP)", category: "Security", cost: 18_000, date: "2026-06-05", source: "Barangay Fund – CCTV Expansion Phase 2", custodian: "off-012", location: "Major intersections", condition: "Excellent", count: 8, dv: "PO-2026-02" },
  { name: "CCTV Network Video Recorder (16-ch)", category: "Security", cost: 26_000, date: "2023-04-11", source: "Barangay Fund", custodian: "off-012", location: "Barangay Operations Center", condition: "Good" },
  { name: "Handheld Radio (VHF)", category: "Communication", cost: 4_800, date: "2026-05-14", source: "Provincial Government of Bulacan", custodian: "off-012", location: "Tanod Outpost", condition: "Excellent", count: 6, dv: "DR-2026-01" },
  { name: "Base Radio Station", category: "Communication", cost: 28_000, date: "2021-09-01", source: "City Government", custodian: "off-007", location: "Barangay Operations Center", condition: "Fair" },
  { name: "Conference Table (12-seater)", category: "Furniture", cost: 24_000, date: "2020-03-10", source: "Barangay Fund", custodian: "off-010", location: "Session Hall", condition: "Good" },
  { name: "Monobloc Chairs (set of 50)", category: "Furniture", cost: 22_500, date: "2023-10-02", source: "Donation – San Roque Parish", custodian: "off-017", location: "Storage Room", condition: "Good", status: "In Storage" },
  { name: "Steel Filing Cabinet (4-drawer)", category: "Furniture", cost: 8_900, date: "2019-06-21", source: "Barangay Fund", custodian: "off-016", location: "Records Room", condition: "Good", count: 2 },
  { name: "Diesel Generator Set (15 kVA)", category: "Power", cost: 185_000, date: "2022-11-18", source: "City Government", custodian: "off-007", location: "Barangay Hall grounds", condition: "Good" },
  { name: "Patrol Vehicle (Mitsubishi L300)", category: "Vehicle", cost: 1_150_000, date: "2021-02-24", source: "City Government", custodian: "off-012", location: "Barangay Hall parking", condition: "Good", serial: "Plate No. SAB 4172" },
  { name: "Barangay Ambulance (Toyota Hiace)", category: "Vehicle", cost: 1_980_000, date: "2023-07-03", source: "Provincial Government of Bulacan", custodian: "off-002", location: "Health Station", condition: "Good", serial: "Plate No. SAF 8810" },
  { name: "Patrol Motorcycle (Honda XRM)", category: "Vehicle", cost: 78_000, date: "2019-05-15", source: "Barangay Fund", custodian: "off-013", location: "Tanod Outpost", condition: "Unserviceable", status: "Disposed" },
  { name: "Rubber Rescue Boat with Paddles", category: "Rescue Equipment", cost: 95_000, date: "2022-06-30", source: "Provincial Government of Bulacan", custodian: "off-007", location: "DRRM Storage", condition: "Good" },
  { name: "Life Vests (set of 20)", category: "Rescue Equipment", cost: 36_000, date: "2026-05-14", source: "Provincial Government of Bulacan", custodian: "off-007", location: "DRRM Storage", condition: "Excellent", dv: "DR-2026-01" },
  { name: "Spine Board with Head Immobilizer", category: "Rescue Equipment", cost: 12_500, date: "2024-08-09", source: "Barangay Fund", custodian: "off-007", location: "DRRM Storage", condition: "Good", count: 2 },
  { name: "Chainsaw", category: "Rescue Equipment", cost: 21_000, date: "2023-03-15", source: "Barangay Fund", custodian: "off-012", location: "DRRM Storage", condition: "Poor" },
  { name: "Digital BP Apparatus", category: "Medical Equipment", cost: 3_800, date: "2025-02-20", source: "Barangay Fund", custodian: "off-002", location: "Health Station", condition: "Good", count: 2 },
  { name: "Weighing Scale (Adult/Infant)", category: "Medical Equipment", cost: 6_500, date: "2024-01-25", source: "City Health Office", custodian: "off-002", location: "Health Station", condition: "Good" },
  { name: "Public Address System", category: "Communication", cost: 32_000, date: "2022-02-14", source: "Barangay Fund", custodian: "off-017", location: "Storage Room", condition: "Fair", status: "In Storage" },
  { name: "Air Conditioner (1.5 HP Inverter)", category: "Office Equipment", cost: 34_000, date: "2024-04-02", source: "Barangay Fund", custodian: "off-010", location: "Session Hall", condition: "Good", count: 2 },
]

function buildAssets(): Asset[] {
  const list: Asset[] = []
  let n = 0
  ASSETS.forEach((a) => {
    for (let i = 0; i < (a.count ?? 1); i++) {
      n++
      const year = a.date.slice(0, 4)
      const maintenance: MaintenanceRecord[] = []
      if (a.category === "Vehicle" || a.category === "Power") {
        maintenance.push({ id: `mnt-${n}-1`, date: "2026-02-10", type: "Preventive", description: a.category === "Vehicle" ? "Change oil, filters and tune-up" : "Change oil and load test", cost: a.category === "Vehicle" ? 6_800 : 3_200, performedBy: a.category === "Vehicle" ? "Baliwag Auto Service Center" : "PowerGen Services Bulacan" })
        maintenance.push({ id: `mnt-${n}-2`, date: "2026-08-12", type: "Inspection", description: "Semi-annual inspection", cost: 0, performedBy: "Barangay Tanod (Motorpool)" })
      }
      if (a.condition === "For Repair") maintenance.push({ id: `mnt-${n}-3`, date: "2026-09-18", type: "Repair", description: "Printhead replacement – awaiting parts", cost: 2_500, performedBy: "Baliwag Computer Center" })
      if (a.name.startsWith("Photocopier")) maintenance.push({ id: `mnt-${n}-4`, date: "2026-05-06", type: "Repair", description: "Drum and toner replacement", cost: 5_400, performedBy: "Copier Solutions Inc." })
      const conditionHistory = [{ date: a.date, condition: "Excellent" as AssetCondition, remarks: "Newly acquired.", byUserId: "usr-004" }]
      if (a.condition !== "Excellent") conditionHistory.push({ date: "2026-01-20", condition: a.condition, remarks: "Annual physical count and inspection.", byUserId: "usr-004" })
      list.push({
        id: `ast-${pad(n, 3)}`,
        assetNumber: `SRQ-${year}-${pad(n, 4)}`,
        name: a.name,
        category: a.category,
        serialNumber: a.serial ?? `SN-${rng.int(100000, 999999)}`,
        acquisitionDate: a.date,
        acquisitionCost: a.cost,
        source: a.source,
        custodianId: a.custodian,
        location: a.location,
        condition: a.condition,
        status: a.status ?? "Active",
        maintenance,
        conditionHistory,
        attachments: a.cost >= 50_000 ? [{ id: `att-ast-${n}`, name: `property-acknowledgement-receipt-${n}.pdf`, size: 128_400, type: "application/pdf", uploadedAt: ts(a.date, 10) }] : [],
        disbursementId: a.dv ? dvFor(a.dv) : undefined,
      })
    }
  })
  return list
}

export const assets = buildAssets()

/* --------------------------------- Inventory ------------------------------- */

const ITEMS: [name: string, category: InventoryItem["category"], unit: string, reorder: number, location: string, opening: number, monthlyUse: number][] = [
  ["Bond Paper A4 (80gsm)", "Office Supplies", "ream", 10, "Supply Cabinet A", 40, 6],
  ["Bond Paper Long (80gsm)", "Office Supplies", "ream", 10, "Supply Cabinet A", 30, 4],
  ["Ballpen (Black)", "Office Supplies", "box", 3, "Supply Cabinet A", 12, 1],
  ["Printer Ink (Black, 70ml)", "Office Supplies", "bottle", 6, "Supply Cabinet A", 20, 3],
  ["Printer Ink (Color set)", "Office Supplies", "set", 2, "Supply Cabinet A", 6, 1],
  ["Certificate Security Paper", "Office Supplies", "ream", 4, "Secretary's Office", 12, 2],
  ["Folder (Long, Kraft)", "Office Supplies", "pack", 5, "Supply Cabinet A", 15, 2],
  ["Liquid Detergent", "Cleaning Supplies", "gallon", 3, "Utility Room", 10, 1],
  ["Disinfectant", "Cleaning Supplies", "gallon", 4, "Utility Room", 12, 2],
  ["Garbage Bags (XL)", "Cleaning Supplies", "pack", 10, "Utility Room", 40, 6],
  ["Walis Tingting", "Cleaning Supplies", "piece", 5, "Utility Room", 15, 2],
  ["Rice (25 kg)", "Relief Supplies", "sack", 20, "DRRM Storage", 60, 0],
  ["Canned Sardines", "Relief Supplies", "case", 15, "DRRM Storage", 40, 0],
  ["Instant Noodles", "Relief Supplies", "case", 15, "DRRM Storage", 40, 0],
  ["Bottled Water (500ml)", "Relief Supplies", "case", 20, "DRRM Storage", 50, 0],
  ["Sleeping Mats", "Relief Supplies", "piece", 30, "DRRM Storage", 80, 0],
  ["Hygiene Kits", "Relief Supplies", "kit", 30, "DRRM Storage", 90, 0],
  ["Paracetamol 500mg", "Medical Supplies", "box", 10, "Health Station", 30, 4],
  ["Amlodipine 5mg", "Medical Supplies", "box", 8, "Health Station", 24, 3],
  ["Metformin 500mg", "Medical Supplies", "box", 8, "Health Station", 20, 3],
  ["Oral Rehydration Salts", "Medical Supplies", "box", 5, "Health Station", 15, 1],
  ["Face Masks (Surgical)", "Medical Supplies", "box", 10, "Health Station", 40, 4],
  ["LED Bulbs (9W)", "Maintenance Supplies", "piece", 10, "Maintenance Room", 30, 2],
  ["Electrical Tape", "Maintenance Supplies", "roll", 5, "Maintenance Room", 20, 1],
  ["Paint (White, 4L)", "Maintenance Supplies", "can", 4, "Maintenance Room", 10, 1],
]

const ISSUE_TO = ["Secretary's Office", "Treasurer's Office", "Barangay Health Station", "Tanod Outpost", "Records Room", "Session Hall", "Eco-Aides", "SK Office"]

function buildInventory() {
  const items: InventoryItem[] = []
  const transactions: InventoryTransaction[] = []
  let tx = 0
  const add = (t: Omit<InventoryTransaction, "id">) => transactions.push({ ...t, id: `itx-${pad(++tx, 4)}` })

  ITEMS.forEach(([name, category, unit, reorder, location, opening, monthlyUse], i) => {
    const id = `inv-${pad(i + 1, 3)}`
    const prefix = { "Office Supplies": "OFS", "Cleaning Supplies": "CLN", "Relief Supplies": "RLF", "Medical Supplies": "MED", "Maintenance Supplies": "MNT" }[category]
    items.push({ id, code: `${prefix}-${pad(i + 1, 3)}`, name, category, unit, reorderLevel: reorder, location })
    add({ itemId: id, type: "Stock In", quantity: opening, date: "2026-01-05", reference: "Beginning inventory (physical count)", byUserId: "usr-004" })
    let qty = opening
    for (let m = 1; m <= 9; m++) {
      if (monthlyUse > 0) {
        const use = Math.max(0, monthlyUse + rng.int(-1, 1))
        if (use > 0 && qty - use >= 0) {
          qty -= use
          add({ itemId: id, type: "Stock Out", quantity: use, date: `2026-${pad(m, 2)}-${pad(rng.int(3, 26), 2)}`, issuedTo: rng.pick(ISSUE_TO), reference: `RIS-2026-${pad(m, 2)}${pad(i, 2)}`, byUserId: rng.pick(["usr-004", "usr-008"]) })
        }
        if (qty <= reorder && m < 9 && rng.chance(0.7)) {
          const restock = Math.round(opening * 0.8)
          qty += restock
          add({ itemId: id, type: "Stock In", quantity: restock, date: `2026-${pad(m, 2)}-27`, reference: `Delivery – PO-2026-${pad(m, 2)}${pad(i, 2)}`, byUserId: "usr-004" })
        }
      }
    }
    // Typhoon relief release in July drew down relief supplies.
    if (category === "Relief Supplies") {
      const out = Math.round(opening * (name.startsWith("Rice") || name.startsWith("Bottled") ? 0.75 : 0.55))
      qty -= out
      add({ itemId: id, type: "Stock Out", quantity: out, date: "2026-07-24", issuedTo: "Relief operations – Purok 3 (86 families)", reference: "Res. No. 2026-010", byUserId: "usr-004" })
      if (!name.startsWith("Sleeping") && !name.startsWith("Hygiene")) {
        add({ itemId: id, type: "Stock In", quantity: Math.round(opening * 0.4), date: "2026-08-20", reference: "Replenishment – QRF", byUserId: "usr-004" })
      }
    }
    if (i % 7 === 3) add({ itemId: id, type: "Adjustment", quantity: -1, date: "2026-06-30", remarks: "Mid-year physical count variance (damaged).", byUserId: "usr-004" })
  })

  return { items, transactions: transactions.filter((t) => t.date <= MOCK_TODAY).sort((a, b) => b.date.localeCompare(a.date)) }
}

const inv = buildInventory()
export const inventoryItems = inv.items
export const inventoryTransactions = inv.transactions
