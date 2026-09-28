import type {
  AnnualBudget,
  Attachment,
  BudgetAllocation,
  BudgetCategory,
  Disbursement,
  DisbursementStatus,
  Expense,
  FundSource,
  Obligation,
  ObligationStatus,
  PPA,
  PPAStatus,
  PPAType,
  StatusChange,
} from "@/types"
import { createRng, pad } from "./_seed"

/**
 * Relational finance dataset:
 *   AnnualBudget → BudgetAllocation → PPA → Obligation → Disbursement → Expense
 * Obligated/disbursed totals are never stored; they are derived from these
 * records by lib/finance.ts.
 */

const rng = createRng(2026_0901)

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`
}
const ts = (iso: string, hour: number, minute = 0) => `${iso}T${pad(hour, 2)}:${pad(minute, 2)}:00+08:00`
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m, 2)}-${pad(Math.min(d, new Date(y, m, 0).getDate()), 2)}`

const TREASURER = "usr-004"
const PB = "usr-002"

/* ------------------------------ Annual budgets ----------------------------- */

const budgetHistory = (fy: number, final: AnnualBudget["status"]): StatusChange<AnnualBudget["status"]>[] => {
  const y = fy - 1
  const steps: StatusChange<AnnualBudget["status"]>[] = [
    { status: "Draft", at: ts(ymd(y, 9, 1), 9), byUserId: TREASURER, note: "Budget proposal prepared from the Annual Investment Program." },
    { status: "For Review", at: ts(ymd(y, 9, 22), 10), byUserId: TREASURER, note: "Submitted to the Committee on Appropriations." },
    { status: "For Authorization", at: ts(ymd(y, 10, 20), 14), byUserId: PB, note: "Endorsed to the Sangguniang Barangay for enactment." },
    { status: "Approved", at: ts(ymd(y, 12, 15), 16), byUserId: PB, note: "Enacted through the Appropriation Ordinance; reviewed by the City Budget Office." },
    { status: "Active", at: ts(ymd(fy, 1, 2), 8), byUserId: TREASURER },
    { status: "Closed", at: ts(ymd(fy + 1, 1, 15), 9), byUserId: TREASURER, note: "Fiscal year closed; unexpended balances reverted." },
  ]
  return steps.slice(0, steps.findIndex((s) => s.status === final) + 1)
}

export const budgets: AnnualBudget[] = [
  {
    id: "bud-2027",
    fiscalYear: 2027,
    title: "FY 2027 Annual Barangay Budget",
    estimatedIncome: 10_250_000,
    approvedBudget: 10_000_000,
    status: "For Review",
    ordinanceId: "ord-2026-007",
    notes: "Proposed budget under deliberation by the Committee on Appropriations. Includes Drainage Improvement Phase 2.",
    history: budgetHistory(2027, "For Review"),
    createdAt: ts("2026-09-01", 9),
  },
  {
    id: "bud-2026",
    fiscalYear: 2026,
    title: "FY 2026 Annual Barangay Budget",
    estimatedIncome: 8_600_000,
    approvedBudget: 8_450_000,
    status: "Active",
    approvalDate: "2025-12-15",
    ordinanceId: "ord-2025-006",
    notes: "Includes the 20% Development Fund, 5% BDRRM Fund and 10% SK Fund as required by law.",
    history: budgetHistory(2026, "Active"),
    createdAt: ts("2025-09-01", 9),
  },
  {
    id: "bud-2025",
    fiscalYear: 2025,
    title: "FY 2025 Annual Barangay Budget",
    estimatedIncome: 8_050_000,
    approvedBudget: 7_980_000,
    status: "Closed",
    approvalDate: "2024-12-16",
    history: budgetHistory(2025, "Closed"),
    createdAt: ts("2024-09-01", 9),
  },
  {
    id: "bud-2024",
    fiscalYear: 2024,
    title: "FY 2024 Annual Barangay Budget",
    estimatedIncome: 7_600_000,
    approvedBudget: 7_520_000,
    status: "Closed",
    approvalDate: "2023-12-18",
    history: budgetHistory(2024, "Closed"),
    createdAt: ts("2023-09-01", 9),
  },
]

/* ------------------------------- Allocations ------------------------------- */

const ALLOC_2026: Record<BudgetCategory, number> = {
  "General Administration": 1_862_500,
  "Peace and Order": 620_000,
  Health: 540_000,
  "Social Services": 480_000,
  Infrastructure: 2_000_000,
  DRRM: 422_500,
  "Environmental Programs": 280_000,
  "Youth Development": 845_000,
  "Community Programs": 520_000,
  "Other Services": 250_000,
}

const scaleAllocations = (factor: number, round = 500) =>
  Object.fromEntries(Object.entries(ALLOC_2026).map(([k, v]) => [k, Math.round((v * factor) / round) * round])) as Record<BudgetCategory, number>

const allocationSets: [string, Record<BudgetCategory, number>][] = [
  ["bud-2026", ALLOC_2026],
  ["bud-2025", scaleAllocations(0.955)],
  ["bud-2024", scaleAllocations(0.9)],
  ["bud-2027", { ...scaleAllocations(1.12), Infrastructure: 2_600_000, DRRM: 512_500 }],
]

export const allocations: BudgetAllocation[] = allocationSets.flatMap(([budgetId, amounts]) =>
  (Object.entries(amounts) as [BudgetCategory, number][]).map(([category, approvedAmount], i) => ({
    id: `alloc-${budgetId.slice(4)}-${pad(i + 1, 2)}`,
    budgetId,
    category,
    approvedAmount,
    ...(budgetId === "bud-2026" && category === "Health" ? { remarks: "Includes ₱80,000 dengue response realigned in April." } : {}),
  })),
)

/* ------------------------------- Fund sources ------------------------------ */

export const fundSources: FundSource[] = [
  {
    id: "fs-2026-nta",
    name: "National Tax Allotment FY 2026",
    type: "National Tax Allotment",
    description: "Barangay share of the national taxes released monthly through the City Treasurer.",
    amount: 7_150_000,
    fiscalYear: 2026,
    dateReceived: "2026-01-15",
    referenceNumber: "DBM-NTA-2026-031403021",
  },
  {
    id: "fs-2026-local",
    name: "Local Collections FY 2026",
    type: "Local Collections",
    description: "Clearance and certification fees, business clearances, facility rentals and community tax share.",
    amount: 850_000,
    fiscalYear: 2026,
    dateReceived: "2026-01-05",
    referenceNumber: "BRC-2026",
  },
  {
    id: "fs-2026-city",
    name: "Baliwag City Assistance – Drainage",
    type: "Municipal / City Assistance",
    description: "Financial assistance from the City Government of Baliwag for the drainage improvement project (MOA per Res. No. 2026-002).",
    amount: 800_000,
    fiscalYear: 2026,
    dateReceived: "2026-03-18",
    referenceNumber: "CGB-FA-2026-0147",
  },
  {
    id: "fs-2026-prov",
    name: "Bulacan Provincial DRRM Assistance",
    type: "Provincial Assistance",
    description: "Provincial Government of Bulacan assistance for rescue equipment.",
    amount: 150_000,
    fiscalYear: 2026,
    dateReceived: "2026-04-08",
    referenceNumber: "PGB-PDRRMO-2026-088",
  },
  {
    id: "fs-2026-grant",
    name: "Bulacan Green Communities Grant",
    type: "Grants",
    description: "Environmental grant for materials recovery facility operations.",
    amount: 100_000,
    fiscalYear: 2026,
    dateReceived: "2026-05-20",
    referenceNumber: "BENRO-GCG-2026-12",
  },
  {
    id: "fs-2026-don",
    name: "Rotary Club of Baliwag Donation",
    type: "Donations",
    description: "Donation for livelihood skills training of solo parents and out-of-school youth.",
    amount: 50_000,
    fiscalYear: 2026,
    dateReceived: "2026-06-02",
    referenceNumber: "RCB-DON-2026-004",
  },
  {
    id: "fs-2025-nta",
    name: "National Tax Allotment FY 2025",
    type: "National Tax Allotment",
    description: "Barangay share of the national taxes.",
    amount: 6_780_000,
    fiscalYear: 2025,
    dateReceived: "2025-01-16",
    referenceNumber: "DBM-NTA-2025-031403021",
  },
  {
    id: "fs-2025-local",
    name: "Local Collections FY 2025",
    type: "Local Collections",
    description: "Barangay fees and charges.",
    amount: 820_000,
    fiscalYear: 2025,
    dateReceived: "2025-01-06",
    referenceNumber: "BRC-2025",
  },
  {
    id: "fs-2027-nta",
    name: "National Tax Allotment FY 2027 (Projected)",
    type: "National Tax Allotment",
    description: "Projected allotment based on the DBM indicative ceiling.",
    amount: 8_900_000,
    fiscalYear: 2027,
    dateReceived: "2027-01-15",
    referenceNumber: "DBM-NTA-2027-IND",
  },
]

/* ----------------------------------- PPAs ---------------------------------- */

interface ObligationSpec {
  amount: number
  month: number
  day: number
  payee: string
  description: string
  releases: [amount: number, month: number, day: number][]
  pending?: [amount: number, month: number, day: number, status: DisbursementStatus]
}

interface PPASpec {
  code: string
  name: string
  type: PPAType
  category: BudgetCategory
  budget: number
  fund: string
  committee: string
  official: string
  status: PPAStatus
  physical: number
  start: [number, number]
  end: [number, number]
  description: string
  /** Generated obligations: percent of budget obligated and percent of that disbursed. */
  obligPct?: number
  disbPct?: number
  payees?: string[]
  /** Hand-authored obligations (overrides generation). */
  obligations?: ObligationSpec[]
}

const PPAS_2026: PPASpec[] = [
  // General Administration
  {
    code: "GA-2026-01",
    name: "Honoraria of Barangay Officials",
    type: "Program",
    category: "General Administration",
    budget: 1_200_000,
    fund: "fs-2026-nta",
    committee: "com-finance",
    official: "off-001",
    status: "Ongoing",
    physical: 75,
    start: [1, 1],
    end: [12, 31],
    description: "Monthly honoraria of the Punong Barangay, Kagawads, Secretary and Treasurer.",
    obligPct: 75,
    disbPct: 100,
    payees: ["Barangay Officials (Honoraria)"],
  },
  {
    code: "GA-2026-02",
    name: "Office Supplies, Utilities and Communication",
    type: "Activity",
    category: "General Administration",
    budget: 382_500,
    fund: "fs-2026-nta",
    committee: "com-finance",
    official: "off-011",
    status: "Ongoing",
    physical: 72,
    start: [1, 1],
    end: [12, 31],
    description: "Electricity, water, internet and office supplies of the barangay hall.",
    obligPct: 70,
    disbPct: 90,
    payees: ["Meralco – Baliwag Branch", "Baliwag Water District", "PLDT Inc.", "Baliwag Office Supplies Center"],
  },
  {
    code: "GA-2026-03",
    name: "Records Digitization (BaryoSuite)",
    type: "Activity",
    category: "General Administration",
    budget: 280_000,
    fund: "fs-2026-nta",
    committee: "com-finance",
    official: "off-010",
    status: "Ongoing",
    physical: 60,
    start: [2, 1],
    end: [11, 30],
    description: "Digitization of resident, household and blotter records; staff training.",
    obligPct: 60,
    disbPct: 70,
    payees: ["Baliwag Computer Center", "Hazel V. Enriquez (Encoding Services)"],
  },
  // Peace and Order
  {
    code: "PO-2026-01",
    name: "Barangay Tanod Operations and Honoraria",
    type: "Program",
    category: "Peace and Order",
    budget: 420_000,
    fund: "fs-2026-nta",
    committee: "com-peace",
    official: "off-003",
    status: "Ongoing",
    physical: 75,
    start: [1, 1],
    end: [12, 31],
    description: "Honoraria, uniforms and patrol supplies of barangay tanods.",
    obligPct: 72,
    disbPct: 100,
    payees: ["Barangay Tanod Members (Honoraria)", "Baliwag Uniform Center"],
  },
  {
    code: "PO-2026-02",
    name: "CCTV Expansion Phase 2",
    type: "Activity",
    category: "Peace and Order",
    budget: 200_000,
    fund: "fs-2026-nta",
    committee: "com-peace",
    official: "off-003",
    status: "Ongoing",
    physical: 80,
    start: [3, 1],
    end: [10, 31],
    description: "Installation of 8 additional CCTV cameras at major intersections.",
    obligPct: 90,
    disbPct: 80,
    payees: ["SecureVision CCTV Trading"],
  },
  // Health
  {
    code: "HE-2026-01",
    name: "Barangay Health Station Medicines and Supplies",
    type: "Program",
    category: "Health",
    budget: 300_000,
    fund: "fs-2026-nta",
    committee: "com-health",
    official: "off-002",
    status: "Ongoing",
    physical: 82,
    start: [1, 1],
    end: [12, 31],
    description: "Maintenance medicines for hypertension and diabetes, first-aid and BHS supplies.",
    obligPct: 95,
    disbPct: 90,
    payees: ["Mercury Drug – Baliwag", "Rose Pharmacy – Baliwag"],
  },
  {
    code: "HE-2026-02",
    name: "Nutrition and Supplemental Feeding Program",
    type: "Program",
    category: "Health",
    budget: 160_000,
    fund: "fs-2026-nta",
    committee: "com-health",
    official: "off-002",
    status: "Ongoing",
    physical: 70,
    start: [2, 1],
    end: [11, 30],
    description: "120-day feeding for underweight children identified in Operation Timbang.",
    obligPct: 80,
    disbPct: 85,
    payees: ["San Roque Farmers' Cooperative"],
  },
  {
    code: "HE-2026-03",
    name: "Dengue Prevention and Misting",
    type: "Activity",
    category: "Health",
    budget: 80_000,
    fund: "fs-2026-nta",
    committee: "com-health",
    official: "off-002",
    status: "Completed",
    physical: 100,
    start: [6, 1],
    end: [8, 31],
    description: "Misting operations and larvicide distribution per purok during the rainy season.",
    obligPct: 100,
    disbPct: 100,
    payees: ["PestAway Services Bulacan"],
  },
  // Social Services
  {
    code: "SS-2026-01",
    name: "Senior Citizens and PWD Assistance",
    type: "Program",
    category: "Social Services",
    budget: 250_000,
    fund: "fs-2026-nta",
    committee: "com-women",
    official: "off-006",
    status: "Ongoing",
    physical: 60,
    start: [1, 1],
    end: [12, 31],
    description: "Birthday cash gifts, medical assistance and assistive devices.",
    obligPct: 60,
    disbPct: 90,
    payees: ["Senior Citizens Association of San Roque", "Individual Beneficiaries (Medical Assistance)"],
  },
  {
    code: "SS-2026-02",
    name: "Educational Assistance for Indigent Students",
    type: "Program",
    category: "Social Services",
    budget: 230_000,
    fund: "fs-2026-nta",
    committee: "com-edu",
    official: "off-004",
    status: "Completed",
    physical: 100,
    start: [6, 1],
    end: [8, 31],
    description: "₱2,000 school-opening assistance for 115 indigent students.",
    obligPct: 100,
    disbPct: 95,
    payees: ["Individual Beneficiaries (Educational Assistance)"],
  },
  // Infrastructure — matches the spec example: ₱2M allocation, ₱1.35M obligated, ₱1.12M disbursed
  {
    code: "IN-2026-01",
    name: "Drainage Improvement",
    type: "Project",
    category: "Infrastructure",
    budget: 800_000,
    fund: "fs-2026-city",
    committee: "com-infra",
    official: "off-005",
    status: "Ongoing",
    physical: 68,
    start: [4, 1],
    end: [11, 30],
    description: "Construction of 420 linear meters of reinforced concrete drainage along Riverside Rd. and Bonifacio St. to reduce flooding in Purok 3.",
    obligations: [
      {
        amount: 450_000,
        month: 4,
        day: 14,
        payee: "JRB Construction & Supply",
        description: "Drainage Phase 1 – materials and labor (Riverside Rd.)",
        releases: [
          [300_000, 4, 30],
          [150_000, 6, 12],
        ],
      },
      {
        amount: 220_000,
        month: 7,
        day: 6,
        payee: "JRB Construction & Supply",
        description: "Drainage Phase 2 – Bonifacio St. extension",
        releases: [[70_000, 8, 5]],
        pending: [80_000, 9, 22, "For Approval"],
      },
    ],
  },
  {
    code: "IN-2026-02",
    name: "Streetlight Installation",
    type: "Project",
    category: "Infrastructure",
    budget: 450_000,
    fund: "fs-2026-nta",
    committee: "com-infra",
    official: "off-005",
    status: "Ongoing",
    physical: 85,
    start: [5, 1],
    end: [10, 15],
    description: "Supply and installation of 40 solar-powered LED streetlights in Puroks 5, 6 and 7.",
    obligations: [
      {
        amount: 380_000,
        month: 5,
        day: 20,
        payee: "SolarLight Philippines Inc.",
        description: "Supply and installation of 40 solar LED streetlights",
        releases: [[360_000, 6, 26]],
      },
    ],
  },
  {
    code: "IN-2026-03",
    name: "Barangay Hall Repair",
    type: "Project",
    category: "Infrastructure",
    budget: 400_000,
    fund: "fs-2026-nta",
    committee: "com-infra",
    official: "off-005",
    status: "Delayed",
    physical: 55,
    start: [6, 1],
    end: [9, 15],
    description: "Roof replacement, repainting and restroom renovation of the barangay hall.",
    obligations: [
      {
        amount: 300_000,
        month: 6,
        day: 10,
        payee: "M.D. Cruz Builders",
        description: "Roof replacement and repainting works",
        releases: [[240_000, 7, 15]],
        pending: [60_000, 9, 24, "For Review"],
      },
    ],
  },
  {
    code: "IN-2026-04",
    name: "Road Maintenance – Kawayan St.",
    type: "Project",
    category: "Infrastructure",
    budget: 350_000,
    fund: "fs-2026-nta",
    committee: "com-infra",
    official: "off-005",
    status: "Approved",
    physical: 0,
    start: [10, 1],
    end: [12, 15],
    description: "Asphalt overlay and pothole repair of 300 meters along Kawayan St.",
    obligations: [],
  },
  // DRRM
  {
    code: "DR-2026-01",
    name: "BDRRM Preparedness – Rescue Equipment",
    type: "Activity",
    category: "DRRM",
    budget: 211_250,
    fund: "fs-2026-prov",
    committee: "com-drrm",
    official: "off-007",
    status: "Ongoing",
    physical: 80,
    start: [3, 1],
    end: [10, 31],
    description: "Life vests, rescue boat accessories, radios and flashlights (70% preparedness fund).",
    obligPct: 92,
    disbPct: 80,
    payees: ["Rescue Gear PH Trading"],
  },
  {
    code: "DR-2026-02",
    name: "Quick Response Fund",
    type: "Program",
    category: "DRRM",
    budget: 126_750,
    fund: "fs-2026-nta",
    committee: "com-drrm",
    official: "off-001",
    status: "Ongoing",
    physical: 40,
    start: [1, 1],
    end: [12, 31],
    description: "30% QRF for relief and response during declared calamities.",
    obligPct: 40,
    disbPct: 100,
    payees: ["Puregold Baliwag (Relief Goods)"],
  },
  {
    code: "DR-2026-03",
    name: "DRRM Trainings and Drills",
    type: "Activity",
    category: "DRRM",
    budget: 84_500,
    fund: "fs-2026-nta",
    committee: "com-drrm",
    official: "off-007",
    status: "Completed",
    physical: 100,
    start: [2, 1],
    end: [6, 30],
    description: "Earthquake and flood drills; first-aid and water search-and-rescue training.",
    obligPct: 95,
    disbPct: 100,
    payees: ["Philippine Red Cross – Bulacan Chapter"],
  },
  // Environment
  {
    code: "EN-2026-01",
    name: "Solid Waste Management and MRF Operations",
    type: "Program",
    category: "Environmental Programs",
    budget: 200_000,
    fund: "fs-2026-grant",
    committee: "com-env",
    official: "off-007",
    status: "Ongoing",
    physical: 70,
    start: [1, 1],
    end: [12, 31],
    description: "Materials recovery facility operations and eco-aide allowances.",
    obligPct: 65,
    disbPct: 90,
    payees: ["Green Bulacan Waste Solutions", "Eco-Aides (Allowances)"],
  },
  {
    code: "EN-2026-02",
    name: "Tree Planting and Clean-up Drives",
    type: "Activity",
    category: "Environmental Programs",
    budget: 80_000,
    fund: "fs-2026-nta",
    committee: "com-env",
    official: "off-007",
    status: "Ongoing",
    physical: 55,
    start: [3, 1],
    end: [11, 30],
    description: "Monthly Linis San Roque clean-up drives and riverbank tree planting.",
    obligPct: 50,
    disbPct: 100,
    payees: ["Baliwag Plant Nursery"],
  },
  // Youth Development (SK Fund)
  {
    code: "YD-2026-01",
    name: "SK Sports League 2026",
    type: "Activity",
    category: "Youth Development",
    budget: 250_000,
    fund: "fs-2026-nta",
    committee: "com-youth",
    official: "off-009",
    status: "Ongoing",
    physical: 60,
    start: [7, 1],
    end: [11, 30],
    description: "Inter-purok basketball and volleyball league for youth aged 15–30.",
    obligPct: 70,
    disbPct: 80,
    payees: ["SK San Roque (League Expenses)", "Baliwag Sports Supply"],
  },
  {
    code: "YD-2026-02",
    name: "Covered Court Improvement",
    type: "Project",
    category: "Youth Development",
    budget: 450_000,
    fund: "fs-2026-nta",
    committee: "com-youth",
    official: "off-009",
    status: "Ongoing",
    physical: 15,
    start: [8, 1],
    end: [12, 20],
    description: "Resurfacing, new ring system and LED floodlights for the barangay covered court.",
    obligations: [
      {
        amount: 180_000,
        month: 8,
        day: 18,
        payee: "Court Masters Sports Flooring",
        description: "Court resurfacing – 30% mobilization",
        releases: [[135_000, 9, 2]],
      },
    ],
  },
  {
    code: "YD-2026-03",
    name: "Youth Leadership and Skills Training",
    type: "Activity",
    category: "Youth Development",
    budget: 145_000,
    fund: "fs-2026-nta",
    committee: "com-youth",
    official: "off-009",
    status: "Planned",
    physical: 0,
    start: [10, 15],
    end: [12, 15],
    description: "Leadership camp and digital skills workshop for SK members and youth volunteers.",
    obligPct: 0,
  },
  // Community Programs
  {
    code: "CP-2026-01",
    name: "Barangay Fiesta and Cultural Activities",
    type: "Activity",
    category: "Community Programs",
    budget: 220_000,
    fund: "fs-2026-local",
    committee: "com-edu",
    official: "off-004",
    status: "Completed",
    physical: 100,
    start: [7, 15],
    end: [8, 20],
    description: "Feast of San Roque (August 16) cultural night, parade and sportsfest.",
    obligPct: 98,
    disbPct: 100,
    payees: ["Fiesta Committee – Barangay San Roque", "Baliwag Lights and Sounds"],
  },
  {
    code: "CP-2026-02",
    name: "Barangay Assembly and Community Consultations",
    type: "Activity",
    category: "Community Programs",
    budget: 60_000,
    fund: "fs-2026-local",
    committee: "com-finance",
    official: "off-010",
    status: "Ongoing",
    physical: 50,
    start: [3, 1],
    end: [10, 31],
    description: "Semestral barangay assemblies and purok consultations.",
    obligPct: 50,
    disbPct: 100,
    payees: ["Aling Nena's Catering"],
  },
  {
    code: "CP-2026-03",
    name: "Livelihood Skills Training",
    type: "Program",
    category: "Community Programs",
    budget: 240_000,
    fund: "fs-2026-don",
    committee: "com-women",
    official: "off-006",
    status: "Ongoing",
    physical: 45,
    start: [5, 1],
    end: [11, 30],
    description: "Food processing and dressmaking training for solo parents and out-of-school youth.",
    obligPct: 45,
    disbPct: 70,
    payees: ["TESDA-accredited Trainer: Ma. Luisa Reyes", "Baliwag Fabric Center"],
  },
  // Other Services
  {
    code: "OS-2026-01",
    name: "Contingency Fund",
    type: "Program",
    category: "Other Services",
    budget: 250_000,
    fund: "fs-2026-nta",
    committee: "com-finance",
    official: "off-001",
    status: "Ongoing",
    physical: 20,
    start: [1, 1],
    end: [12, 31],
    description: "Unforeseen expenses authorized by the Sangguniang Barangay.",
    obligPct: 20,
    disbPct: 100,
    payees: ["Various Suppliers (Contingency)"],
  },
]

const PPAS_2025: PPASpec[] = [
  ["General Administration", "Administrative Services 2025", "Program", 1_778_500],
  ["Peace and Order", "Peace and Order Program 2025", "Program", 592_000],
  ["Health", "Barangay Health Station Renovation", "Project", 515_500],
  ["Social Services", "Social Welfare Services 2025", "Program", 458_500],
  ["Infrastructure", "Road Concreting – Luna St.", "Project", 1_910_000],
  ["DRRM", "BDRRM Fund 2025", "Program", 403_500],
  ["Environmental Programs", "Environmental Management 2025", "Program", 267_500],
  ["Youth Development", "SK Programs 2025", "Program", 807_000],
  ["Community Programs", "Community Development 2025", "Program", 496_500],
  ["Other Services", "Contingency Fund 2025", "Program", 239_000],
].map(([category, name, type, budget], i) => ({
  code: `${String(category).slice(0, 2).toUpperCase()}-2025-01`,
  name: String(name),
  type: type as PPAType,
  category: category as BudgetCategory,
  budget: Number(budget),
  fund: "fs-2025-nta",
  committee: ["com-finance", "com-peace", "com-health", "com-women", "com-infra", "com-drrm", "com-env", "com-youth", "com-edu", "com-finance"][i],
  official: ["off-001", "off-003", "off-002", "off-006", "off-005", "off-007", "off-007", "off-009", "off-004", "off-001"][i],
  status: "Completed" as PPAStatus,
  physical: 100,
  start: [1, 1] as [number, number],
  end: [12, 31] as [number, number],
  description: `FY 2025 ${String(category).toLowerCase()} expenditures.`,
  obligPct: 96,
  disbPct: 100,
  payees: ["Various Suppliers"],
}))

const PPAS_2027: PPASpec[] = [
  {
    code: "IN-2027-01",
    name: "Drainage Improvement Phase 2",
    type: "Project",
    category: "Infrastructure",
    budget: 1_200_000,
    fund: "fs-2027-nta",
    committee: "com-infra",
    official: "off-005",
    status: "Planned",
    physical: 0,
    start: [2, 1],
    end: [8, 31],
    description: "Extension of the drainage system to Mabini and Del Pilar Streets.",
  },
  {
    code: "HE-2027-01",
    name: "Health Station Equipment Upgrade",
    type: "Activity",
    category: "Health",
    budget: 250_000,
    fund: "fs-2027-nta",
    committee: "com-health",
    official: "off-002",
    status: "Planned",
    physical: 0,
    start: [3, 1],
    end: [6, 30],
    description: "Examination table, BP apparatus and vaccine refrigerator.",
  },
  {
    code: "DR-2027-01",
    name: "Evacuation Center Improvement",
    type: "Project",
    category: "DRRM",
    budget: 300_000,
    fund: "fs-2027-nta",
    committee: "com-drrm",
    official: "off-007",
    status: "Planned",
    physical: 0,
    start: [1, 15],
    end: [5, 31],
    description: "Restrooms and water supply upgrade of the San Roque Elementary School evacuation area.",
  },
]

/* ---------------------------------- Build ---------------------------------- */

const roundTo = (n: number, step: number) => Math.round(n / step) * step

function generateObligations(spec: PPASpec, fy: number): ObligationSpec[] {
  if (spec.obligations) return spec.obligations
  const pct = spec.obligPct ?? 0
  if (pct <= 0) return []
  const total = roundTo((spec.budget * pct) / 100, 500)
  const lastMonth = fy === 2026 ? Math.min(spec.end[0], 9) : spec.end[0]
  const count = spec.type === "Program" ? 3 : total > 150_000 ? 2 : 1
  const parts: number[] = []
  let remaining = total
  for (let i = 0; i < count; i++) {
    const part = i === count - 1 ? remaining : roundTo(total / count, 500)
    parts.push(part)
    remaining -= part
  }
  let disbRemaining = roundTo((total * (spec.disbPct ?? 100)) / 100, 500)
  return parts.map((amount, i) => {
    const month = Math.max(spec.start[0], Math.min(lastMonth, spec.start[0] + Math.round(((lastMonth - spec.start[0]) * (i + 0.5)) / count)))
    const released = Math.min(amount, disbRemaining)
    disbRemaining -= released
    const releaseMonth = Math.min(fy === 2026 ? 9 : 12, month + 1)
    return {
      amount,
      month,
      day: rng.int(3, 24),
      payee: spec.payees?.[i % spec.payees.length] ?? "Various Suppliers",
      description: `${spec.name}${count > 1 ? ` – ${["1st", "2nd", "3rd"][i]} tranche` : ""}`,
      releases: released > 0 ? [[released, releaseMonth, rng.int(2, 26)]] : [],
      pending:
        released < amount && fy === 2026 && i === count - 1 && rng.chance(0.6)
          ? [amount - released, 9, rng.int(15, 26), rng.pick(["For Review", "For Approval"] as const)]
          : undefined,
    }
  })
}

const SAMPLE_DOCS = (label: string, date: string): Attachment[] => [
  { id: `att-${label}-1`, name: `${label}-purchase-request.pdf`, size: 182_400, type: "application/pdf", uploadedAt: ts(date, 10) },
  { id: `att-${label}-2`, name: `${label}-quotation.pdf`, size: 244_100, type: "application/pdf", uploadedAt: ts(date, 10, 5) },
]

function build() {
  const ppas: PPA[] = []
  const obligations: Obligation[] = []
  const disbursements: Disbursement[] = []
  const expenses: Expense[] = []
  const seq = { obr: 0, dv: 0, exp: 0, chk: 12_340 }

  const addPPAs = (specs: PPASpec[], budgetId: string, fy: number) => {
    specs.forEach((spec, idx) => {
      const ppaId = `ppa-${fy}-${pad(idx + 1, 2)}`
      ppas.push({
        id: ppaId,
        code: spec.code,
        name: spec.name,
        type: spec.type,
        description: spec.description,
        budgetId,
        category: spec.category,
        approvedBudget: spec.budget,
        fundSourceId: spec.fund,
        committeeId: spec.committee,
        responsibleOfficialId: spec.official,
        startDate: ymd(fy, spec.start[0], spec.start[1]),
        targetCompletion: ymd(fy, spec.end[0], spec.end[1]),
        status: spec.status,
        physicalProgress: spec.physical,
      })

      generateObligations(spec, fy).forEach((o) => {
        seq.obr++
        const date = ymd(fy, o.month, o.day)
        const oblId = `obl-${fy}-${pad(seq.obr, 3)}`
        const totalReleased = o.releases.reduce((s, r) => s + r[0], 0)
        const status: ObligationStatus = totalReleased >= o.amount ? "Fully Disbursed" : totalReleased > 0 ? "Partially Disbursed" : "Approved"
        const history: StatusChange<ObligationStatus>[] = [
          { status: "Draft", at: ts(date, 9, 10), byUserId: TREASURER },
          { status: "For Review", at: ts(date, 11, 30), byUserId: TREASURER, note: "Budget availability certified by the Treasurer." },
          { status: "Approved", at: ts(addDays(date, 1), 15, 0), byUserId: PB },
        ]
        obligations.push({
          id: oblId,
          obligationNumber: `OBR-${fy}-${pad(seq.obr, 4)}`,
          date,
          payee: o.payee,
          description: o.description,
          ppaId,
          fundSourceId: spec.fund,
          amount: o.amount,
          attachments: SAMPLE_DOCS(`obr-${fy}-${seq.obr}`, date),
          requestedById: spec.official,
          status,
          history,
          createdAt: ts(date, 9, 10),
        })

        const addDisbursement = (amount: number, month: number, day: number, dStatus: DisbursementStatus) => {
          seq.dv++
          const dDate = ymd(fy, month, day)
          const flow: DisbursementStatus[] = ["Draft", "For Review", "For Approval", "Approved", "Released"]
          const reached = flow.slice(0, flow.indexOf(dStatus) + 1)
          const dHistory: StatusChange<DisbursementStatus>[] = reached.map((st, i) => ({
            status: st,
            at: ts(addDays(dDate, Math.floor(i / 2)), 9 + i * 2, 15),
            byUserId: st === "Approved" ? PB : TREASURER,
            note: st === "For Approval" ? "Supporting documents complete." : st === "Released" ? "Check released to payee." : undefined,
          }))
          const released = dStatus === "Released"
          const dvId = `dv-${fy}-${pad(seq.dv, 3)}`
          const method =
            o.payee.includes("Honoraria") || o.payee.includes("Beneficiaries")
              ? "Cash"
              : amount >= 20_000
                ? "Check"
                : rng.pick(["Check", "Bank Transfer"] as const)
          const reference = released
            ? method === "Check"
              ? `LBP Check No. ${pad(seq.chk++, 7)}`
              : method === "Bank Transfer"
                ? `LBP-ADA-${fy}${pad(seq.dv, 5)}`
                : `Payroll ${pad(seq.dv, 4)}`
            : undefined
          disbursements.push({
            id: dvId,
            disbursementNumber: `DSB-${fy}-${pad(seq.dv, 4)}`,
            voucherNumber: `DV-${fy}-${pad(month, 2)}-${pad(seq.dv, 3)}`,
            date: dDate,
            payee: o.payee,
            obligationId: oblId,
            fundSourceId: spec.fund,
            amount,
            paymentMethod: method,
            referenceNumber: reference,
            // A pending voucher with missing documents drives the "incomplete documents" alert.
            attachments: dStatus === "For Review" ? [] : SAMPLE_DOCS(`dv-${fy}-${seq.dv}`, dDate),
            remarks: o.description,
            status: dStatus,
            history: dHistory,
            createdAt: ts(dDate, 9, 15),
          })
          if (released) {
            seq.exp++
            expenses.push({
              id: `exp-${fy}-${pad(seq.exp, 3)}`,
              expenseNumber: `EXP-${fy}-${pad(seq.exp, 4)}`,
              date: dHistory[dHistory.length - 1].at.slice(0, 10),
              category: spec.category,
              ppaId,
              payee: o.payee,
              description: o.description,
              amount,
              fundSourceId: spec.fund,
              reference: reference ?? "",
              // Official receipts / liquidation; a few cash payouts are still unliquidated.
              attachments:
                method === "Cash" && fy === 2026 && rng.chance(0.25)
                  ? []
                  : [
                      {
                        id: `att-exp-${fy}-${seq.exp}`,
                        name: `official-receipt-${seq.exp}.pdf`,
                        size: 96_000,
                        type: "application/pdf",
                        uploadedAt: ts(dDate, 16),
                      },
                    ],
              disbursementId: dvId,
            })
          }
        }
        o.releases.forEach(([amount, m, d]) => addDisbursement(amount, m, d, "Released"))
        if (o.pending) addDisbursement(o.pending[0], o.pending[1], o.pending[2], o.pending[3])
      })
    })
  }

  addPPAs(PPAS_2025, "bud-2025", 2025)
  addPPAs(PPAS_2026, "bud-2026", 2026)
  addPPAs(PPAS_2027, "bud-2027", 2027)

  // Obligations still in the approval pipeline (not yet committed against the budget).
  const pipeline: [ppaCode: string, amount: number, date: string, payee: string, description: string, status: ObligationStatus][] = [
    ["IN-2026-04", 180_000, "2026-09-21", "Baliwag Asphalt & Paving Co.", "Road Maintenance – asphalt overlay (Kawayan St.)", "For Review"],
    ["GA-2026-02", 18_500, "2026-09-25", "Baliwag Office Supplies Center", "Office supplies for Q4", "Draft"],
    ["SS-2026-01", 40_000, "2026-09-23", "Senior Citizens Association of San Roque", "Elderly Filipino Week celebration (October)", "For Review"],
    ["EN-2026-02", 25_000, "2026-08-11", "Baliwag Plant Nursery", "Mahogany seedlings – cancelled, donated by BENRO instead", "Cancelled"],
  ]
  pipeline.forEach(([code, amount, date, payee, description, status]) => {
    const ppa = ppas.find((p) => p.code === code)!
    seq.obr++
    const flow: ObligationStatus[] =
      status === "Cancelled" ? ["Draft", "Cancelled"] : (["Draft", "For Review"].slice(0, status === "Draft" ? 1 : 2) as ObligationStatus[])
    obligations.push({
      id: `obl-2026-${pad(seq.obr, 3)}`,
      obligationNumber: `OBR-2026-${pad(seq.obr, 4)}`,
      date,
      payee,
      description,
      ppaId: ppa.id,
      fundSourceId: ppa.fundSourceId,
      amount,
      attachments: status === "Draft" ? [] : SAMPLE_DOCS(`obr-2026-${seq.obr}`, date),
      requestedById: ppa.responsibleOfficialId,
      status,
      history: flow.map((st, i) => ({
        status: st,
        at: ts(addDays(date, i), 10 + i, 0),
        byUserId: TREASURER,
        note: st === "Cancelled" ? "Seedlings donated by BENRO; purchase no longer needed." : undefined,
      })),
      createdAt: ts(date, 10),
    })
  })

  const byDateDesc = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date)
  return { ppas, obligations: obligations.sort(byDateDesc), disbursements: disbursements.sort(byDateDesc), expenses: expenses.sort(byDateDesc) }
}

export const finance = build()
