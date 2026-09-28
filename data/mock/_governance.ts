import type {
  ActionItem,
  AgendaItem,
  AttendanceStatus,
  BarangayAssembly,
  BarangaySession,
  Committee,
  MeetingMinutes,
  Motion,
  Ordinance,
  OrdinanceStatus,
  Resolution,
  ResolutionStatus,
  StatusChange,
} from "@/types"
import { MOCK_TODAY, createRng, pad } from "./_seed"

/**
 * Governance dataset:
 *   Committee/Official → Session → Agenda/Motion → Ordinance/Resolution → Minutes
 * Legislation stores its sessionId; sessions do not duplicate the reverse link.
 */

const rng = createRng(7_1991)
const ts = (iso: string, hour: number, minute = 0) => `${iso}T${pad(hour, 2)}:${pad(minute, 2)}:00+08:00`
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`

const PB = "off-001"
const SECRETARY = "off-010"
const TREASURER = "off-011"
const KAGAWADS = ["off-002", "off-003", "off-004", "off-005", "off-006", "off-007", "off-008"]
const SANGGUNIAN = [PB, ...KAGAWADS, "off-009"]

/* -------------------------------- Committees ------------------------------- */

export const committees: Committee[] = [
  {
    id: "com-finance",
    name: "Committee on Finance, Budget and Appropriations",
    chairpersonId: "off-008",
    viceChairId: "off-004",
    memberIds: ["off-002", "off-005"],
    responsibilities: ["Review the annual and supplemental budgets", "Monitor budget utilization and financial reports", "Recommend revenue measures and fees"],
    status: "Active",
  },
  {
    id: "com-peace",
    name: "Committee on Peace and Order and Public Safety",
    chairpersonId: "off-003",
    viceChairId: "off-007",
    memberIds: ["off-005", "off-012"],
    responsibilities: ["Oversee tanod operations and patrols", "Recommend peace and order ordinances", "Coordinate with Baliwag MPS"],
    status: "Active",
  },
  {
    id: "com-health",
    name: "Committee on Health and Sanitation",
    chairpersonId: "off-002",
    viceChairId: "off-006",
    memberIds: ["off-004"],
    responsibilities: ["Supervise the Barangay Health Station", "Nutrition and immunization programs", "Sanitation and dengue prevention"],
    status: "Active",
  },
  {
    id: "com-infra",
    name: "Committee on Infrastructure and Public Works",
    chairpersonId: "off-005",
    viceChairId: "off-008",
    memberIds: ["off-003"],
    responsibilities: ["Plan and monitor barangay infrastructure projects", "Inspect project implementation", "Road and drainage maintenance"],
    status: "Active",
  },
  {
    id: "com-env",
    name: "Committee on Environmental Protection",
    chairpersonId: "off-007",
    viceChairId: "off-002",
    memberIds: ["off-009"],
    responsibilities: ["Solid waste management and MRF operations", "Tree planting and clean-up drives", "Enforce anti-littering ordinance"],
    status: "Active",
  },
  {
    id: "com-edu",
    name: "Committee on Education and Culture",
    chairpersonId: "off-004",
    viceChairId: "off-009",
    memberIds: ["off-006"],
    responsibilities: ["Educational assistance programs", "Cultural and fiesta activities", "Coordinate with San Roque Elementary School"],
    status: "Active",
  },
  {
    id: "com-women",
    name: "Committee on Women, Children and Family",
    chairpersonId: "off-006",
    viceChairId: "off-002",
    memberIds: ["off-004"],
    responsibilities: ["VAWC desk oversight", "Programs for solo parents, seniors and PWDs", "Livelihood programs"],
    status: "Active",
  },
  {
    id: "com-youth",
    name: "Committee on Youth and Sports Development",
    chairpersonId: "off-009",
    viceChairId: "off-004",
    memberIds: ["off-007"],
    responsibilities: ["SK programs and sports development", "Covered court management", "Youth leadership activities"],
    status: "Active",
  },
  {
    id: "com-drrm",
    name: "Committee on Disaster Preparedness (BDRRMC)",
    chairpersonId: "off-007",
    viceChairId: "off-003",
    memberIds: ["off-005", "off-001"],
    responsibilities: ["Prepare and implement the BDRRM Plan", "Manage the BDRRM Fund and Quick Response Fund", "Evacuation and early warning"],
    status: "Active",
  },
]

const chairOf = (committeeId: string) => committees.find((c) => c.id === committeeId)!.chairpersonId

/* ------------------------------ Session calendar --------------------------- */

function nthMonday(year: number, month: number, n: number) {
  const d = new Date(year, month - 1, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  d.setDate(d.getDate() + (n - 1) * 7)
  return iso(d)
}

const REGULAR_DATES = Array.from({ length: 10 }, (_, i) => i + 1).flatMap((m) => [nthMonday(2026, m, 1), nthMonday(2026, m, 3)])
const SPECIAL = { date: "2026-03-20", title: "Special Session on the Drainage Counterpart Fund" }
const EMERGENCY = { date: "2026-07-24", title: "Emergency Session on Typhoon Response" }
const CANCELLED_DATE = REGULAR_DATES[13] // 3rd Monday of July — typhoon

/* --------------------------------- Legislation ----------------------------- */

type SessionRef = number | "special" | "emergency" | null

interface LegislationSpec<S extends string> {
  number: string
  title: string
  description: string
  sponsor: string
  committee: string
  session: SessionRef
  status: S
  introduced?: string
  effective?: string
}

const ORDINANCES: LegislationSpec<OrdinanceStatus>[] = [
  {
    number: "2025-006",
    title: "Appropriation Ordinance for the FY 2026 Annual Barangay Budget",
    description: "An ordinance appropriating ₱8,450,000.00 for the operation of Barangay San Roque for fiscal year 2026.",
    sponsor: "off-008",
    committee: "com-finance",
    session: null,
    status: "Effective",
    introduced: "2025-10-20",
    effective: "2026-01-01",
  },
  {
    number: "2018-003",
    title: "Ordinance Regulating Videoke Hours",
    description: "Former ordinance limiting videoke use to 11:00 PM. Repealed by Ordinance No. 2026-001.",
    sponsor: "off-003",
    committee: "com-peace",
    session: 2,
    status: "Repealed",
    introduced: "2018-05-07",
  },
  {
    number: "2026-001",
    title: "An Ordinance Regulating the Use of Videoke, Karaoke and Sound Amplifiers After 10:00 PM",
    description: "Prohibits the use of sound amplifiers from 10:00 PM to 6:00 AM within residential areas and prescribes penalties for violations.",
    sponsor: "off-003",
    committee: "com-peace",
    session: 2,
    status: "Effective",
    introduced: REGULAR_DATES[1],
    effective: "2026-03-01",
  },
  {
    number: "2026-002",
    title: "Anti-Littering and Proper Waste Segregation Ordinance of Barangay San Roque",
    description: "Requires segregation at source, schedules collection per purok and imposes fines for littering and open burning.",
    sponsor: "off-007",
    committee: "com-env",
    session: 4,
    status: "Effective",
    introduced: REGULAR_DATES[2],
    effective: "2026-04-01",
  },
  {
    number: "2026-003",
    title: "Ordinance Amending the Barangay Revenue Code: Schedule of Fees for Clearances and Certifications",
    description: "Updates the fees for barangay clearances, certifications and business clearances.",
    sponsor: "off-008",
    committee: "com-finance",
    session: 5,
    status: "Effective",
    introduced: REGULAR_DATES[3],
    effective: "2026-04-15",
  },
  {
    number: "2026-004",
    title: "Supplemental Budget No. 1 for FY 2026 (Drainage Counterpart Fund)",
    description: "Realigns ₱150,000.00 from the Contingency Fund as the barangay counterpart for the drainage improvement project.",
    sponsor: "off-008",
    committee: "com-finance",
    session: "special",
    status: "Effective",
    introduced: "2026-03-16",
    effective: "2026-03-20",
  },
  {
    number: "2026-005",
    title: "Responsible Pet Ownership and Stray Animal Control Ordinance",
    description: "Requires registration and anti-rabies vaccination of dogs and cats; regulates stray animals.",
    sponsor: "off-002",
    committee: "com-health",
    session: 16,
    status: "Approved",
    introduced: REGULAR_DATES[14],
    effective: "2026-10-15",
  },
  {
    number: "2026-006",
    title: "Ordinance Declaring Kawayan St. a No-Parking Zone During School Hours",
    description: "Prohibits parking along Kawayan St. from 6:30–8:00 AM and 4:00–5:30 PM on school days.",
    sponsor: "off-003",
    committee: "com-peace",
    session: 17,
    status: "Under Review",
    introduced: REGULAR_DATES[17],
  },
  {
    number: "2026-007",
    title: "Appropriation Ordinance for the FY 2027 Annual Barangay Budget",
    description: "An ordinance appropriating ₱10,000,000.00 for fiscal year 2027. Under committee deliberation.",
    sponsor: "off-008",
    committee: "com-finance",
    session: null,
    status: "Draft",
    introduced: "2026-09-22",
  },
  {
    number: "2024-002",
    title: "Ordinance Establishing the Barangay Road Clearing Task Force",
    description: "Created the road clearing task force per DILG MC 2019-121.",
    sponsor: "off-005",
    committee: "com-infra",
    session: null,
    status: "Archived",
    introduced: "2024-02-05",
  },
]

const RESOLUTIONS: LegislationSpec<ResolutionStatus>[] = [
  {
    number: "2026-001",
    title: "Adopting the FY 2026 Annual Investment Program of Barangay San Roque",
    description: "Adopts the AIP as the basis of the FY 2026 budget.",
    sponsor: "off-008",
    committee: "com-finance",
    session: 0,
    status: "Approved",
  },
  {
    number: "2026-002",
    title: "Authorizing the Punong Barangay to Sign a MOA with the City Government of Baliwag for the Drainage Improvement Project",
    description: "Authorizes the MOA for ₱800,000.00 city assistance.",
    sponsor: "off-005",
    committee: "com-infra",
    session: 3,
    status: "Approved",
  },
  {
    number: "2026-003",
    title: "Requesting Financial Assistance from the Provincial Government of Bulacan for Rescue Equipment",
    description: "Requests ₱150,000.00 from the PDRRMO.",
    sponsor: "off-007",
    committee: "com-drrm",
    session: 3,
    status: "Approved",
  },
  {
    number: "2026-004",
    title: "Designating the Barangay Health Station as a Vaccination Site",
    description: "Designates the BHS for the city immunization program.",
    sponsor: "off-002",
    committee: "com-health",
    session: 4,
    status: "Approved",
  },
  {
    number: "2026-005",
    title: "Endorsing the Drainage Improvement Project to the City Engineering Office",
    description: "Requests technical assistance for the program of works.",
    sponsor: "off-005",
    committee: "com-infra",
    session: "special",
    status: "Approved",
  },
  {
    number: "2026-006",
    title: "Commending Chief Tanod Danilo P. Estrella for Exemplary Service",
    description: "Recognizes the recovery of a missing senior citizen.",
    sponsor: "off-003",
    committee: "com-peace",
    session: 7,
    status: "Approved",
  },
  {
    number: "2026-007",
    title: "Adopting the Barangay DRRM Plan 2026–2028",
    description: "Adopts the three-year BDRRM Plan.",
    sponsor: "off-007",
    committee: "com-drrm",
    session: 8,
    status: "Approved",
  },
  {
    number: "2026-008",
    title: "Authorizing the Procurement of Solar-Powered Streetlights",
    description: "Authorizes procurement of 40 solar LED streetlights.",
    sponsor: "off-005",
    committee: "com-infra",
    session: 9,
    status: "Approved",
  },
  {
    number: "2026-009",
    title: "Declaring Barangay San Roque Under a State of Calamity",
    description: "Declared due to flooding brought by the typhoon, enabling use of the Quick Response Fund.",
    sponsor: "off-007",
    committee: "com-drrm",
    session: "emergency",
    status: "Approved",
  },
  {
    number: "2026-010",
    title: "Authorizing the Release of the Quick Response Fund for Relief Operations",
    description: "Authorizes relief goods for affected families in Purok 3.",
    sponsor: "off-001",
    committee: "com-drrm",
    session: "emergency",
    status: "Approved",
  },
  {
    number: "2026-011",
    title: "Requesting the City Engineering Office to Assess Kawayan St.",
    description: "Requests a road condition assessment before the asphalt overlay.",
    sponsor: "off-005",
    committee: "com-infra",
    session: 14,
    status: "Approved",
  },
  {
    number: "2026-012",
    title: "Approving the Amended SK Annual Barangay Youth Investment Program",
    description: "Approves the SK ABYIP amendments including the covered court improvement.",
    sponsor: "off-009",
    committee: "com-youth",
    session: 15,
    status: "Approved",
  },
  {
    number: "2026-013",
    title: "Proposing the Weekend Closure of Riverside Rd. for a Night Market",
    description: "Proposal rejected due to flooding risk and traffic concerns.",
    sponsor: "off-004",
    committee: "com-edu",
    session: 16,
    status: "Rejected",
  },
  {
    number: "2026-014",
    title: "Endorsing the Baliwag Water District Service Extension to Purok 7",
    description: "Pending committee report from the Committee on Infrastructure.",
    sponsor: "off-005",
    committee: "com-infra",
    session: 17,
    status: "Proposed",
  },
  {
    number: "2026-015",
    title: "Adopting the FY 2027 Annual Investment Program",
    description: "Draft AIP for FY 2027 including Drainage Improvement Phase 2.",
    sponsor: "off-008",
    committee: "com-finance",
    session: null,
    status: "Draft",
  },
  {
    number: "2025-021",
    title: "Supporting the Brigada Eskwela 2025 of San Roque Elementary School",
    description: "Support for the school maintenance week.",
    sponsor: "off-004",
    committee: "com-edu",
    session: null,
    status: "Archived",
  },
]

/* ---------------------------------- Build ---------------------------------- */

function build() {
  const regularIds = REGULAR_DATES.map((_, i) => `ses-rs-${pad(i + 1, 2)}`)
  const sessionIdFor = (ref: SessionRef) => (ref === null ? undefined : ref === "special" ? "ses-ss-01" : ref === "emergency" ? "ses-es-01" : regularIds[ref])
  const sessionDateFor = (ref: SessionRef) =>
    ref === null ? undefined : ref === "special" ? SPECIAL.date : ref === "emergency" ? EMERGENCY.date : REGULAR_DATES[ref]

  const ordinances: Ordinance[] = ORDINANCES.map((o, i) => {
    const approved = sessionDateFor(o.session) ?? (o.status === "Effective" || o.status === "Archived" ? o.introduced : undefined)
    const history: StatusChange<OrdinanceStatus>[] = [{ status: "Draft", at: ts(o.introduced ?? "2026-09-22", 9), byUserId: "usr-003" }]
    if (o.status !== "Draft")
      history.push({
        status: "Under Review",
        at: ts(o.introduced ?? approved!, 15),
        byUserId: "usr-003",
        note: `Referred to the ${committees.find((c) => c.id === o.committee)?.name}.`,
      })
    if (["Approved", "Effective", "Repealed", "Archived"].includes(o.status) && approved)
      history.push({
        status: "Approved",
        at: ts(o.number === "2025-006" ? "2025-12-15" : approved, 16),
        byUserId: "usr-003",
        note: "Approved on third reading.",
      })
    if (["Effective", "Repealed"].includes(o.status) && o.effective)
      history.push({ status: "Effective", at: ts(o.effective, 8), byUserId: "usr-003", note: "Posted in three conspicuous places and published." })
    if (o.status === "Repealed")
      history.push({ status: "Repealed", at: ts(REGULAR_DATES[2], 16), byUserId: "usr-003", note: "Repealed by Ordinance No. 2026-001." })
    if (o.status === "Archived") history.push({ status: "Archived", at: ts("2026-01-10", 9), byUserId: "usr-003" })
    return {
      id: `ord-${o.number}`,
      ordinanceNumber: `Ordinance No. ${o.number}`,
      title: o.title,
      description: o.description,
      sponsorId: o.sponsor,
      committeeId: o.committee,
      sessionId: sessionIdFor(o.session),
      dateIntroduced: o.introduced ?? "2026-01-05",
      dateApproved: ["Approved", "Effective", "Repealed", "Archived"].includes(o.status) ? (o.number === "2025-006" ? "2025-12-15" : approved) : undefined,
      effectiveDate: o.effective,
      status: o.status,
      attachments:
        o.status === "Draft"
          ? []
          : [
              {
                id: `att-ord-${i}`,
                name: `ordinance-${o.number}.pdf`,
                size: 356_200 + i * 1_000,
                type: "application/pdf",
                uploadedAt: ts(approved ?? o.introduced ?? "2026-01-05", 17),
              },
            ],
      history,
    }
  })

  const resolutions: Resolution[] = RESOLUTIONS.map((r, i) => {
    const date = sessionDateFor(r.session)
    const history: StatusChange<ResolutionStatus>[] = [{ status: "Draft", at: ts(date ?? "2026-09-22", 9), byUserId: "usr-003" }]
    if (r.status !== "Draft" && r.status !== "Archived") history.push({ status: "Proposed", at: ts(date!, 14), byUserId: "usr-003" })
    if (r.status === "Approved" || r.status === "Rejected")
      history.push({ status: r.status, at: ts(date!, 16), byUserId: "usr-003", note: r.status === "Rejected" ? "Motion lost, 3–5." : "Unanimously approved." })
    if (r.status === "Archived") history.push({ status: "Archived", at: ts("2026-01-10", 9), byUserId: "usr-003" })
    return {
      id: `res-${r.number}`,
      resolutionNumber: `Resolution No. ${r.number}`,
      title: r.title,
      description: r.description,
      sponsorId: r.sponsor,
      committeeId: r.committee,
      sessionId: sessionIdFor(r.session),
      dateApproved: r.status === "Approved" ? date : undefined,
      status: r.status,
      attachments:
        r.status === "Approved"
          ? [{ id: `att-res-${i}`, name: `resolution-${r.number}.pdf`, size: 210_400 + i * 900, type: "application/pdf", uploadedAt: ts(date!, 17) }]
          : [],
      history,
    }
  })

  const attendanceFor = (date: string): { officialId: string; status: AttendanceStatus }[] =>
    [...SANGGUNIAN, SECRETARY, TREASURER].map((id) => {
      // Kagawad Soriano is on leave from July.
      if (id === "off-006" && date >= "2026-07-01") return { officialId: id, status: "Excused" }
      const status = rng.weighted([
        ["Present", 20],
        ["Late", 2],
        ["Excused", 1],
        ["Absent", 1],
      ] as const)
      return { officialId: id, status: id === PB ? "Present" : status }
    })

  const sessions: BarangaySession[] = []
  const minutes: MeetingMinutes[] = []

  const legislationFor = (sessionId: string) => ({
    ords: ordinances.filter((o) => o.sessionId === sessionId),
    ress: resolutions.filter((r) => r.sessionId === sessionId),
  })

  const makeSession = (
    id: string,
    number: string,
    title: string,
    type: BarangaySession["type"],
    date: string,
    monthlyReport: boolean,
    committeeIdx: number,
  ) => {
    const upcoming = date > MOCK_TODAY
    const cancelled = date === CANCELLED_DATE && type === "Regular"
    const { ords, ress } = legislationFor(id)
    const agenda: AgendaItem[] = []
    const push = (item: Omit<AgendaItem, "id" | "order">) => agenda.push({ ...item, id: `${id}-ag-${agenda.length + 1}`, order: agenda.length + 1 })
    push({ title: "Call to order, invocation and roll call", type: "Preliminaries", presenterId: PB })
    if (type === "Regular") push({ title: "Reading and approval of the minutes of the previous session", type: "Preliminaries", presenterId: SECRETARY })
    if (monthlyReport) push({ title: "Treasurer's monthly report of collections and disbursements", type: "Budget", presenterId: TREASURER })
    if (type === "Regular") {
      const c = committees[committeeIdx % committees.length]
      push({ title: `Committee report: ${c.name.replace("Committee on ", "")}`, type: "Report", presenterId: c.chairpersonId })
    }
    if (type === "Emergency") push({ title: "Situation report on flooding in Purok 3 and evacuation status", type: "Report", presenterId: "off-007" })
    if (id === "ses-rs-19") push({ title: "First reading: FY 2027 Annual Barangay Budget", type: "Budget", presenterId: "off-008" })
    ords.forEach((o) => push({ title: `${o.ordinanceNumber}: ${o.title}`, type: "Legislation", presenterId: o.sponsorId }))
    ress.forEach((r) => push({ title: `${r.resolutionNumber}: ${r.title}`, type: "Legislation", presenterId: r.sponsorId }))
    push({ title: "Other matters", type: "Other Matters" })

    const attendance = upcoming || cancelled ? [] : attendanceFor(date)
    const present = attendance.filter((a) => (a.status === "Present" || a.status === "Late") && SANGGUNIAN.includes(a.officialId)).length
    const mover = () => rng.pick(KAGAWADS.filter((k) => attendance.find((a) => a.officialId === k && (a.status === "Present" || a.status === "Late"))))
    const motions: Motion[] = []
    const decisions: string[] = []
    if (!upcoming && !cancelled) {
      if (type === "Regular") {
        const m = mover()
        motions.push({
          id: `${id}-mo-1`,
          agendaItemId: agenda[1].id,
          text: "To approve the minutes of the previous session as presented.",
          movedById: m,
          secondedById: mover(),
          result: "Carried",
          votesFor: present - 1,
          votesAgainst: 0,
          abstentions: 0,
        })
      }
      agenda
        .filter((a) => a.type === "Legislation")
        .forEach((a, i) => {
          const ord = ords.find((o) => a.title.startsWith(o.ordinanceNumber))
          const res = ress.find((r) => a.title.startsWith(r.resolutionNumber))
          const lost = res?.status === "Rejected"
          const deferred = ord?.status === "Under Review" || res?.status === "Proposed"
          const label = ord ? ord.ordinanceNumber : res!.resolutionNumber
          motions.push({
            id: `${id}-mo-${i + 2}`,
            agendaItemId: a.id,
            text: deferred
              ? `To refer ${label} to the committee for further study.`
              : `To approve ${label} ${ord && ord.status !== "Repealed" ? "on third and final reading" : ""}`.trim() + ".",
            movedById: a.presenterId ?? mover(),
            secondedById: mover(),
            result: lost ? "Lost" : deferred ? "Deferred" : "Carried",
            votesFor: lost ? 3 : deferred ? undefined : present - 1,
            votesAgainst: lost ? 5 : deferred ? undefined : 0,
            abstentions: lost ? 0 : undefined,
          })
          decisions.push(lost ? `${label} was not approved.` : deferred ? `${label} referred to committee.` : `${label} approved.`)
        })
      if (monthlyReport) decisions.push("Treasurer's report noted and accepted.")
      if (type === "Emergency") decisions.push("State of calamity declared; relief operations authorized for Purok 3.")
    }

    sessions.push({
      id,
      sessionNumber: number,
      title,
      type,
      date,
      time: type === "Emergency" ? "09:00" : "14:00",
      venue: type === "Emergency" ? "Barangay Operations Center" : "Barangay Session Hall",
      presidingOfficerId: PB,
      agenda,
      attendance,
      motions,
      decisions,
      status: cancelled ? "Cancelled" : upcoming ? "Scheduled" : "Completed",
      createdAt: ts(date, 8),
    })
  }

  REGULAR_DATES.forEach((date, i) => {
    const n = i + 1
    const ordinal = n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
    makeSession(regularIds[i], `RS-2026-${pad(n, 2)}`, `${ordinal} Regular Session`, "Regular", date, i % 2 === 0, i)
  })
  makeSession("ses-ss-01", "SS-2026-01", SPECIAL.title, "Special", SPECIAL.date, false, 0)
  makeSession("ses-es-01", "ES-2026-01", EMERGENCY.title, "Emergency", EMERGENCY.date, false, 0)
  sessions.sort((a, b) => b.date.localeCompare(a.date))

  // Structured minutes for every completed session; the latest awaits approval.
  const completed = sessions.filter((s) => s.status === "Completed").sort((a, b) => a.date.localeCompare(b.date))
  completed.forEach((s, idx) => {
    const next = completed[idx + 1]
    const actionItems: ActionItem[] = []
    s.agenda.forEach((a) => {
      if (a.type === "Legislation" && a.title.includes("Ordinance") && s.motions.find((m) => m.agendaItemId === a.id)?.result === "Carried") {
        actionItems.push({
          id: `${s.id}-ai-${actionItems.length + 1}`,
          task: `Post and publish ${a.title.split(":")[0]}; furnish copy to the City Council`,
          responsibleId: SECRETARY,
          dueDate: s.date.slice(0, 8) + "28",
          status: next ? "Done" : "Open",
        })
      }
      if (a.type === "Report" && a.presenterId && rng.chance(0.5)) {
        actionItems.push({
          id: `${s.id}-ai-${actionItems.length + 1}`,
          task: `Submit written ${a.title.replace("Committee report: ", "").toLowerCase()} update with photos`,
          responsibleId: a.presenterId,
          dueDate: next?.date ?? "2026-10-05",
          status: next ? (rng.chance(0.8) ? "Done" : "In Progress") : "Open",
        })
      }
    })
    if (s.type === "Emergency") {
      actionItems.push({
        id: `${s.id}-ai-x1`,
        task: "Distribute relief packs to 86 families in Purok 3",
        responsibleId: "off-007",
        dueDate: "2026-07-25",
        status: "Done",
      })
      actionItems.push({
        id: `${s.id}-ai-x2`,
        task: "Submit damage assessment report to the City DRRMO",
        responsibleId: "off-005",
        dueDate: "2026-07-31",
        status: "Done",
      })
    }
    minutes.push({
      id: `min-${s.id.slice(4)}`,
      sessionId: s.id,
      callToOrder: s.type === "Emergency" ? "09:10" : `14:${pad(rng.int(0, 15), 2)}`,
      adjournment: s.type === "Emergency" ? "11:05" : `${rng.int(15, 16)}:${pad(rng.int(5, 55), 2)}`,
      discussions: s.agenda.map((a) => ({
        agendaItemId: a.id,
        summary:
          a.type === "Preliminaries"
            ? a.title.startsWith("Call")
              ? "The Presiding Officer called the session to order. The Secretary certified the presence of a quorum."
              : "The minutes of the previous session were read and approved without corrections."
            : a.type === "Budget"
              ? "The Treasurer presented the collections, obligations and disbursements for the month and the status of fund balances. Members asked about pending disbursement vouchers for infrastructure projects."
              : a.type === "Report"
                ? `The chairperson reported on committee activities, accomplishments and upcoming activities. Members discussed coordination with the concerned purok leaders.`
                : a.type === "Legislation"
                  ? `The sponsor explained the measure. After deliberation, the body acted on ${a.title.split(":")[0]} as recorded in the motions.`
                  : "No other matters were raised.",
      })),
      actionItems,
      preparedById: SECRETARY,
      status: next ? "Approved" : "For Approval",
      approvedAt: next ? ts(next.date, 14, 20) : undefined,
      createdAt: ts(s.date, 18),
    })
  })

  return { sessions, minutes: minutes.reverse(), ordinances, resolutions }
}

const built = build()
export const sessions = built.sessions
export const minutes = built.minutes
export const ordinances = built.ordinances
export const resolutions = built.resolutions

/* -------------------------------- Assemblies ------------------------------- */

export const assemblies: BarangayAssembly[] = [
  {
    id: "asm-2026-2",
    title: "Second Semester Barangay Assembly 2026",
    date: "2026-10-11",
    time: "13:00",
    venue: "Barangay Covered Court",
    agenda: [
      "State of the Barangay Address",
      "Financial report for January–September 2026",
      "Presentation of the proposed FY 2027 budget and AIP",
      "Open forum",
    ],
    attendanceCount: 0,
    topics: [],
    decisions: [],
    attachments: [],
    status: "Scheduled",
  },
  {
    id: "asm-2026-1",
    title: "First Semester Barangay Assembly 2026",
    date: "2026-03-28",
    time: "13:00",
    venue: "Barangay Covered Court",
    agenda: [
      "State of the Barangay Address",
      "FY 2025 financial report",
      "Drainage Improvement Project briefing",
      "Anti-littering ordinance orientation",
      "Open forum",
    ],
    attendanceCount: 412,
    householdsRepresented: 58,
    topics: ["Flooding along Riverside Rd.", "Waste collection schedule per purok", "Streetlights in Puroks 5–7", "Stray dogs near the school"],
    decisions: [
      "Residents endorsed the Drainage Improvement Project.",
      "Waste collection moved to 6:00 AM on Tuesdays and Fridays.",
      "Committee on Health to draft a responsible pet ownership ordinance.",
    ],
    minutesSummary:
      "The Punong Barangay delivered the State of the Barangay Address and presented the FY 2025 financial report. The City Engineering Office briefed residents on the drainage project. The open forum raised flooding, waste collection and stray animals.",
    attachments: [
      { id: "att-asm-1", name: "sobA-2026-1st-semester.pdf", size: 1_842_000, type: "application/pdf", uploadedAt: ts("2026-03-30", 9) },
      { id: "att-asm-2", name: "attendance-sheets.pdf", size: 922_300, type: "application/pdf", uploadedAt: ts("2026-03-30", 9, 5) },
      { id: "att-asm-3", name: "assembly-photos.jpg", size: 2_411_000, type: "image/jpeg", uploadedAt: ts("2026-03-30", 9, 10) },
    ],
    status: "Completed",
  },
  {
    id: "asm-2025-2",
    title: "Second Semester Barangay Assembly 2025",
    date: "2025-10-11",
    time: "13:00",
    venue: "Barangay Covered Court",
    agenda: ["State of the Barangay Address", "Proposed FY 2026 budget", "Open forum"],
    attendanceCount: 386,
    householdsRepresented: 55,
    topics: ["FY 2026 priority projects", "CCTV coverage", "Senior citizen assistance"],
    decisions: ["Residents endorsed the FY 2026 AIP priorities: drainage, streetlights and CCTV."],
    minutesSummary: "The proposed FY 2026 budget and priority projects were presented and endorsed by the assembly.",
    attachments: [{ id: "att-asm-4", name: "sobA-2025-2nd-semester.pdf", size: 1_620_000, type: "application/pdf", uploadedAt: ts("2025-10-13", 9) }],
    status: "Completed",
  },
  {
    id: "asm-2025-1",
    title: "First Semester Barangay Assembly 2025",
    date: "2025-03-29",
    time: "13:00",
    venue: "Barangay Covered Court",
    agenda: ["State of the Barangay Address", "FY 2024 financial report", "Open forum"],
    attendanceCount: 351,
    householdsRepresented: 51,
    topics: ["Road concreting of Luna St.", "Health station renovation"],
    decisions: ["Road concreting of Luna St. prioritized for FY 2025."],
    minutesSummary: "The FY 2024 accomplishments and financial report were presented.",
    attachments: [],
    status: "Completed",
  },
]

export { chairOf }
