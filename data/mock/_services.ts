import type { Certificate, CertificateStatus, CertificateType, RequestStatus, ServiceRequest, ServiceType, StatusChange } from "@/types"
import { CERTIFICATE_PREFIX, CERTIFICATE_PURPOSES, REQUEST_FLOW, SERVICE_TO_CERTIFICATE } from "@/lib/constants"
import { population } from "./_population"
import { createRng, daysAgo, pad, timestampDaysAgo } from "./_seed"

/** Certificate fees in PHP, mirrored in settings master data. */
export const CERTIFICATE_FEES: Record<CertificateType, number> = {
  "Barangay Clearance": 100,
  "Certificate of Residency": 50,
  "Certificate of Indigency": 0,
  "Certificate of Good Moral Character": 50,
  "Business Clearance": 500,
  "First Time Job Seeker Certificate": 0,
}

const STAFF_USERS = ["usr-003"]
const ISSUING_OFFICIALS = ["off-010", "off-010", "off-010", "off-016"]

function build() {
  const rng = createRng(911)
  const adults = population.residents.filter((r) => r.status === "Active" && Number(r.birthDate.slice(0, 4)) <= 2008)
  const certificates: Certificate[] = []
  const requests: ServiceRequest[] = []
  const counters: Record<string, number> = {}

  const nextCertNumber = (type: CertificateType, date: string) => {
    const prefix = CERTIFICATE_PREFIX[type]
    counters[prefix] = (counters[prefix] ?? 0) + 1
    return `${prefix}-${date.slice(0, 4)}-${pad(counters[prefix] + 120, 4)}`
  }

  const typeWeights = [
    ["Barangay Clearance", 10],
    ["Certificate of Residency", 6],
    ["Certificate of Indigency", 6],
    ["Certificate of Good Moral Character", 2],
    ["Business Clearance", 2],
    ["First Time Job Seeker Certificate", 2],
  ] as const

  // ---- Walk-in certificates across the last ~9 months (volume rises over time)
  const CERT_COUNT = 150
  for (let i = 0; i < CERT_COUNT; i++) {
    // skew toward recent dates
    const age = Math.floor(Math.pow(rng.next(), 1.35) * 265)
    const date = daysAgo(age)
    const type = rng.weighted(typeWeights)
    const status: CertificateStatus =
      age > 5
        ? rng.weighted([
            ["Released", 20],
            ["Cancelled", 1],
          ] as const)
        : rng.weighted([
            ["Draft", 1],
            ["Pending", 3],
            ["Approved", 2],
            ["Released", 3],
          ] as const)
    const resident = rng.pick(adults)
    certificates.push({
      id: `crt-${pad(i + 1, 4)}`,
      certificateNumber: "",
      residentId: resident.id,
      type,
      purpose: rng.pick(CERTIFICATE_PURPOSES[type]),
      dateIssued: date,
      validUntil: type === "Barangay Clearance" || type === "Business Clearance" ? daysAgo(age - 180) : undefined,
      issuedById: rng.pick(ISSUING_OFFICIALS),
      status,
      orNumber: CERTIFICATE_FEES[type] > 0 && status === "Released" ? `OR-${pad(rng.int(10000, 99999), 7)}` : undefined,
      fee: CERTIFICATE_FEES[type],
      createdAt: timestampDaysAgo(age, rng.int(8, 16), rng.int(0, 59)),
    })
  }

  // ---- Service requests: mostly recent, at various points in the workflow
  const REQUEST_COUNT = 46
  const services: ServiceType[] = [
    "Barangay Clearance",
    "Barangay Clearance",
    "Residency Certificate",
    "Indigency Certificate",
    "Indigency Certificate",
    "Business Clearance",
    "Good Moral Certificate",
    "First Time Job Seeker Certificate",
    "Other Service",
  ]
  const otherServices = [
    ["Other Service", "Request for barangay tanod assistance – house moving"],
    ["Other Service", "Use of barangay covered court – birthday event"],
    ["Other Service", "Endorsement letter for water connection (Baliwag Water District)"],
    ["Other Service", "Certificate of no objection for tree cutting"],
  ] as const

  for (let i = 0; i < REQUEST_COUNT; i++) {
    const age = i < 16 ? rng.int(0, 6) : rng.int(3, 70)
    const service = rng.pick(services)
    const resident = rng.pick(adults)
    const certType = SERVICE_TO_CERTIFICATE[service]
    const purpose = certType ? rng.pick(CERTIFICATE_PURPOSES[certType]) : rng.pick(otherServices)[1]

    let status: RequestStatus
    if (age <= 1)
      status = rng.weighted([
        ["Submitted", 4],
        ["Under Review", 2],
      ] as const)
    else if (age <= 6)
      status = rng.weighted([
        ["Submitted", 1],
        ["Under Review", 3],
        ["Approved", 2],
        ["Ready for Release", 2],
        ["Rejected", 1],
      ] as const)
    else
      status = rng.weighted([
        ["Completed", 10],
        ["Rejected", 1],
      ] as const)

    const flow: RequestStatus[] = status === "Rejected" ? ["Submitted", "Under Review", "Rejected"] : REQUEST_FLOW.slice(0, REQUEST_FLOW.indexOf(status) + 1)
    const assignedToId = status === "Submitted" ? undefined : rng.pick(STAFF_USERS)
    const history: StatusChange<RequestStatus>[] = flow.map((s, idx) => ({
      status: s,
      at: timestampDaysAgo(Math.max(0, age - Math.floor(idx / 2)), 8 + idx * 2, idx * 12 + rng.int(0, 9)),
      byUserId: idx === 0 ? undefined : assignedToId,
      note:
        s === "Rejected"
          ? rng.pick(["Incomplete requirements – no valid ID presented.", "Resident has a pending blotter case; refer to Lupon first."])
          : s === "Ready for Release"
            ? "Document printed and signed. Waiting for claimant."
            : undefined,
    }))

    const id = `req-${pad(i + 1, 4)}`
    let certificateId: string | undefined
    if (certType && ["Approved", "Ready for Release", "Completed"].includes(status)) {
      certificateId = `crt-r${pad(i + 1, 3)}`
      const certStatus: CertificateStatus = status === "Completed" ? "Released" : status === "Ready for Release" ? "Approved" : "Pending"
      certificates.push({
        id: certificateId,
        certificateNumber: "",
        residentId: resident.id,
        type: certType,
        purpose,
        dateIssued: daysAgo(Math.max(0, age - 1)),
        validUntil: certType === "Barangay Clearance" || certType === "Business Clearance" ? daysAgo(age - 181) : undefined,
        issuedById: "off-010",
        status: certStatus,
        requestId: id,
        orNumber: CERTIFICATE_FEES[certType] > 0 && certStatus === "Released" ? `OR-${pad(rng.int(10000, 99999), 7)}` : undefined,
        fee: CERTIFICATE_FEES[certType],
        createdAt: timestampDaysAgo(Math.max(0, age - 1), 10, rng.int(0, 59)),
      })
    }

    requests.push({
      id,
      requestNumber: `REQ-${daysAgo(age).slice(0, 4)}-${pad(REQUEST_COUNT - i + 300, 4)}`,
      residentId: resident.id,
      service,
      purpose,
      channel: rng.weighted([
        ["Walk-in", 6],
        ["Online", 3],
        ["Phone", 1],
      ] as const),
      dateRequested: history[0].at,
      assignedToId,
      status,
      history,
      notes:
        rng.chance(0.4) && assignedToId
          ? [
              {
                id: `note-${id}-1`,
                authorId: assignedToId,
                body: rng.pick([
                  "Verified residency against household record. OK to proceed.",
                  "Claimant will pick up on Friday afternoon.",
                  "Requested cedula (CTC) copy; resident to submit tomorrow.",
                  "Checked blotter records – no derogatory record found.",
                ]),
                createdAt: history[Math.min(1, history.length - 1)].at,
              },
            ]
          : [],
      certificateId,
    })
  }

  // Anchor: Juan Dela Cruz requesting a clearance for employment — pending review.
  const juan = population.residents.find((r) => r.firstName === "Juan" && r.lastName === "Dela Cruz")!
  requests.unshift({
    id: "req-0000",
    requestNumber: "REQ-2026-0347",
    residentId: juan.id,
    service: "Barangay Clearance",
    purpose: "Local employment",
    details: "Needed for application as company driver at a logistics firm in Plaridel.",
    channel: "Walk-in",
    dateRequested: timestampDaysAgo(0, 7, 12),
    status: "Under Review",
    assignedToId: "usr-003",
    history: [
      { status: "Submitted", at: timestampDaysAgo(0, 7, 12) },
      { status: "Under Review", at: timestampDaysAgo(0, 7, 35), byUserId: "usr-003" },
    ],
    notes: [{ id: "note-req-0000-1", authorId: "usr-003", body: "Presented valid PhilSys ID and 2026 cedula.", createdAt: timestampDaysAgo(0, 7, 38) }],
  })

  // Assign certificate numbers in chronological order so numbering is realistic.
  certificates
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((c) => {
      c.certificateNumber = nextCertNumber(c.type, c.dateIssued)
    })

  certificates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  requests.sort((a, b) => b.dateRequested.localeCompare(a.dateRequested))
  return { certificates, requests }
}

export const services = build()
