import type { BlotterCase, BlotterStatus, CaseParty, Hearing, StatusChange } from "@/types"
import { BLOTTER_FLOW } from "@/lib/constants"
import { population } from "./_population"
import { daysAgo, pad, timestampDaysAgo } from "./_seed"

const active = population.residents.filter((r) => r.status === "Active" && Number(r.birthDate.slice(0, 4)) <= 2006)

function party(index: number): CaseParty {
  const r = active[index % active.length]
  return {
    residentId: r.id,
    name: `${r.firstName} ${r.middleName ? r.middleName[0] + ". " : ""}${r.lastName}`,
    address: `${r.address.houseNumber} ${r.address.street}, ${r.address.purok}`,
    contactNumber: r.contactNumber,
  }
}

function history(status: BlotterStatus, startDaysAgo: number, reportedTime: string, userId = "usr-003"): StatusChange<BlotterStatus>[] {
  const path: BlotterStatus[] =
    status === "Referred" ? ["Reported", "Under Investigation", "For Mediation", "Referred"] : BLOTTER_FLOW.slice(0, BLOTTER_FLOW.indexOf(status) + 1)
  const step = Math.max(1, Math.floor(startDaysAgo / (path.length + 1)))
  return path.map((s, i) => ({
    status: s,
    // Entry is recorded ~30 min after the incident; later steps happen on following days.
    at:
      i === 0
        ? timestampDaysAgo(
            startDaysAgo,
            Number(reportedTime.slice(0, 2)) + (Number(reportedTime.slice(3)) >= 30 ? 1 : 0),
            (Number(reportedTime.slice(3)) + 30) % 60,
          )
        : timestampDaysAgo(Math.max(0, startDaysAgo - i * step), 9 + i, 15),
    byUserId: userId,
    note:
      s === "Settled"
        ? "Both parties signed the Kasunduang Pag-aayos before the Lupon."
        : s === "Referred"
          ? "Mediation failed; Certificate to File Action issued and case referred to Baliwag MPS."
          : s === "For Mediation"
            ? "Summons issued to respondent for mediation before the Punong Barangay."
            : undefined,
  }))
}

function hearing(id: string, days: number, time: string, status: Hearing["status"], type: Hearing["type"] = "Mediation", notes?: string): Hearing {
  return { id, date: daysAgo(days), time, venue: "Barangay Session Hall", type, status, notes }
}

interface Seed {
  days: number
  time: string
  location: string
  c: number
  r: number
  w?: number[]
  type: BlotterCase["incidentType"]
  narrative: string
  officer: string
  status: BlotterStatus
  hearings?: Hearing[]
  attachments?: BlotterCase["attachments"]
  notes?: string[]
  respondentOverride?: CaseParty
}

const seeds: Seed[] = [
  {
    days: 2,
    time: "21:40",
    location: "Sampaguita St., Purok 5",
    c: 3,
    r: 40,
    w: [41],
    type: "Noise Complaint",
    narrative:
      "Complainant reported that the respondent's household has been holding videoke sessions past 10:00 PM for three consecutive nights, in violation of the barangay curfew on loud music. Complainant states that her children cannot sleep and that previous verbal requests were ignored.",
    officer: "off-013",
    status: "Reported",
  },
  {
    days: 4,
    time: "18:15",
    location: "Near San Roque Chapel, Rizal St.",
    c: 12,
    r: 55,
    w: [13, 56],
    type: "Physical Injury",
    narrative:
      "Complainant alleges that the respondent punched him on the face during a heated argument over a basketball game at the covered court. Complainant sustained a minor cut on the lower lip. Medico-legal certificate from Baliwag District Hospital attached.",
    officer: "off-012",
    status: "Under Investigation",
    attachments: [
      { id: "att-1", name: "medico-legal-certificate.pdf", size: 284_311, type: "application/pdf", uploadedAt: timestampDaysAgo(3, 10, 12) },
      { id: "att-2", name: "photo-injury.jpg", size: 1_204_551, type: "image/jpeg", uploadedAt: timestampDaysAgo(3, 10, 14) },
    ],
    notes: ["Respondent's mother called to say respondent is willing to settle."],
  },
  {
    days: 9,
    time: "10:00",
    location: "Del Pilar St., Purok 2",
    c: 20,
    r: 71,
    type: "Unpaid Debt",
    narrative:
      "Complainant claims that the respondent borrowed ₱15,000.00 in March 2026 with a promise to pay in full by June 2026. Despite repeated demands, the respondent has only paid ₱3,000.00. Complainant presents a handwritten acknowledgment receipt signed by the respondent.",
    officer: "off-001",
    status: "For Mediation",
    hearings: [
      hearing("hr-1", 3, "14:00", "Rescheduled", "Mediation", "Respondent requested reset due to work schedule."),
      hearing("hr-2", -3, "14:00", "Scheduled"),
    ],
    attachments: [{ id: "att-3", name: "acknowledgment-receipt.jpg", size: 845_120, type: "image/jpeg", uploadedAt: timestampDaysAgo(9, 10, 30) }],
  },
  {
    days: 14,
    time: "07:30",
    location: "Kawayan St., Purok 7",
    c: 31,
    r: 88,
    w: [32],
    type: "Property Dispute",
    narrative:
      "Complainant alleges that the respondent constructed a concrete fence that encroaches approximately 40 centimeters into complainant's titled lot. Complainant requests that the construction be halted pending verification of the lot boundary by the Municipal Assessor.",
    officer: "off-005",
    status: "For Mediation",
    hearings: [
      hearing("hr-3", 6, "09:00", "Completed", "Mediation", "Parties agreed to request relocation survey from Municipal Assessor."),
      hearing("hr-4", -5, "09:00", "Scheduled", "Conciliation"),
    ],
  },
  {
    days: 21,
    time: "22:10",
    location: "Bonifacio St., Purok 3",
    c: 44,
    r: 102,
    type: "Threat",
    narrative:
      "Complainant reported that the respondent, while intoxicated, shouted threats to harm him in front of his house after a disagreement over a parking space. Two neighbors witnessed the incident. Tanods responded and pacified the respondent.",
    officer: "off-003",
    status: "Settled",
    hearings: [
      hearing("hr-5", 12, "15:00", "Completed", "Mediation", "Respondent apologized. Kasunduan signed; respondent to refrain from drinking in public."),
    ],
  },
  {
    days: 26,
    time: "16:45",
    location: "Luna St., Purok 4",
    c: 50,
    r: 118,
    type: "Damage to Property",
    narrative:
      "Complainant alleges that respondent's delivery truck hit and damaged complainant's gate while backing up. Estimated repair cost is ₱8,500.00 based on quotation from a local welding shop.",
    officer: "off-012",
    status: "Settled",
    hearings: [hearing("hr-6", 18, "10:00", "Completed", "Mediation", "Respondent agreed to pay ₱8,500 in two installments.")],
  },
  {
    days: 33,
    time: "20:00",
    location: "Gumamela St., Purok 6",
    c: 61,
    r: 130,
    w: [62, 63],
    type: "Domestic Dispute",
    narrative:
      "Complainant, the sister-in-law of the respondent, reported a recurring dispute regarding the use of the shared kitchen and electric bill in their family compound. Complainant requests barangay intervention to set clear house rules.",
    officer: "off-006",
    status: "Closed",
    hearings: [hearing("hr-7", 25, "13:30", "Completed", "Mediation", "Separate sub-meter to be installed; parties agreed.")],
  },
  {
    days: 40,
    time: "23:20",
    location: "DRT Highway, Purok 6",
    c: 72,
    r: 141,
    type: "Physical Injury",
    narrative:
      "Complainant alleges that the respondent hit him with a bottle during a drinking session, causing a laceration on the forehead requiring four stitches. Complainant insists on filing a criminal case.",
    officer: "off-003",
    status: "Referred",
    hearings: [
      hearing("hr-8", 32, "14:00", "Completed", "Mediation", "No settlement reached."),
      hearing("hr-9", 25, "14:00", "No Show", "Conciliation", "Respondent did not appear despite summons."),
    ],
  },
  {
    days: 48,
    time: "08:10",
    location: "Camia St., Purok 5",
    c: 80,
    r: 152,
    type: "Trespassing",
    narrative:
      "Complainant reports that the respondent repeatedly enters his backyard without permission to harvest fruits from a mango tree whose branches extend over the boundary.",
    officer: "off-007",
    status: "Closed",
  },
  {
    days: 55,
    time: "19:30",
    location: "Mabini St., Purok 2",
    c: 93,
    r: 160,
    type: "Verbal Altercation",
    narrative:
      "Complainant alleges that the respondent uttered defamatory words against her in the presence of other vendors at the talipapa, accusing her of stealing customers.",
    officer: "off-004",
    status: "Settled",
    hearings: [hearing("hr-10", 47, "10:00", "Completed", "Mediation", "Mutual apology; both parties agreed to keep distance at the talipapa.")],
  },
  {
    days: 63,
    time: "17:00",
    location: "Burgos St., Purok 1",
    c: 101,
    r: 5,
    type: "Noise Complaint",
    narrative: "Complainant reports continuous loud noise from the respondent's welding shop beyond permitted hours (after 7:00 PM), including on Sundays.",
    officer: "off-012",
    status: "Closed",
  },
  {
    days: 70,
    time: "14:20",
    location: "Riverside Rd., Purok 3",
    c: 110,
    r: 14,
    w: [111],
    type: "Unpaid Debt",
    narrative:
      "Complainant claims respondent failed to pay ₱6,200.00 for groceries taken on credit (lista) from complainant's sari-sari store between January and April 2026.",
    officer: "off-001",
    status: "Settled",
    hearings: [hearing("hr-11", 60, "09:30", "Completed", "Mediation", "Payment plan: ₱1,000 every 15th and 30th.")],
  },
  {
    days: 1,
    time: "06:50",
    location: "Jacinto St., Purok 4",
    c: 120,
    r: 25,
    type: "Damage to Property",
    narrative:
      "Complainant reports that the respondent's dogs, left unleashed, destroyed his vegetable garden and killed two chickens. This is the third occurrence this month.",
    officer: "off-014",
    status: "Reported",
  },
  {
    days: 6,
    time: "12:30",
    location: "San Roque Rd., Purok 7",
    c: 131,
    r: 36,
    type: "Other",
    narrative:
      "Complainant alleges that the respondent sold her a second-hand motorcycle with falsified OR/CR documents. Complainant seeks refund of ₱28,000.00.",
    officer: "off-003",
    status: "Under Investigation",
    notes: ["Advised complainant to also coordinate with LTO Baliwag for document verification."],
  },
]

export const blotters: BlotterCase[] = seeds
  .map((s, i) => {
    const id = `blt-${pad(i + 1, 3)}`
    const seq = 180 - i * 3
    return {
      id,
      blotterNumber: `BLT-${daysAgo(s.days).slice(0, 4)}-${pad(seq, 4)}`,
      date: daysAgo(s.days),
      time: s.time,
      location: s.location,
      complainant: party(s.c),
      respondent: s.respondentOverride ?? party(s.r),
      witnesses: (s.w ?? []).map(party),
      incidentType: s.type,
      narrative: s.narrative,
      assignedOfficerId: s.officer,
      status: s.status,
      hearings: s.hearings ?? [],
      attachments: s.attachments ?? [],
      notes: (s.notes ?? []).map((body, n) => ({
        id: `${id}-n${n}`,
        authorId: "usr-003",
        body,
        createdAt: timestampDaysAgo(Math.max(0, s.days - 1), 11, 20 + n),
      })),
      history: history(s.status, s.days, s.time),
      createdAt: timestampDaysAgo(s.days, Number(s.time.slice(0, 2)), Number(s.time.slice(3))),
    }
  })
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
