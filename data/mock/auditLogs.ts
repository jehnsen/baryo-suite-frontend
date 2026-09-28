import type { AuditLog } from "@/types"
import { announcements } from "./announcements"
import { blotters } from "./blotters"
import { certificates } from "./certificates"
import { incidents } from "./incidents"
import { residents } from "./residents"
import { serviceRequests } from "./serviceRequests"
import { users } from "./users"
import { createRng, pad, timestampDaysAgo } from "./_seed"

/**
 * Audit trail derived from the other mock datasets so every entry points at a
 * real record. Newest first.
 */
function build(): AuditLog[] {
  const rng = createRng(4242)
  const logs: Omit<AuditLog, "id">[] = []
  const ip = () => `192.168.1.${rng.int(10, 60)}`
  const residentName = (id: string) => {
    const r = residents.find((x) => x.id === id)
    return r ? `${r.firstName} ${r.lastName}` : "Unknown"
  }

  residents
    .filter((r) => r.createdAt >= "2026-06-01")
    .forEach((r) => {
      logs.push({
        timestamp: r.createdAt,
        userId: rng.pick(["usr-007", "usr-008", "usr-003"]),
        action: "Created",
        module: "Residents",
        recordId: r.id,
        recordLabel: `${r.firstName} ${r.lastName} (${r.residentNumber})`,
        details: `Registered new resident in ${r.address.purok}.`,
        ipAddress: ip(),
      })
    })
  residents
    .filter((r) => r.updatedAt >= "2026-08-15" && r.updatedAt !== r.createdAt)
    .slice(0, 30)
    .forEach((r) => {
      logs.push({
        timestamp: r.updatedAt,
        userId: rng.pick(["usr-007", "usr-008"]),
        action: "Updated",
        module: "Residents",
        recordId: r.id,
        recordLabel: `${r.firstName} ${r.lastName} (${r.residentNumber})`,
        details: rng.pick(["Updated contact number.", "Updated occupation.", "Updated classification (voter status).", "Corrected birthplace."]),
        ipAddress: ip(),
      })
    })

  certificates
    .filter((c) => c.createdAt >= "2026-08-01")
    .forEach((c) => {
      const label = `${c.certificateNumber} – ${residentName(c.residentId)}`
      if (c.status === "Released")
        logs.push({
          timestamp: c.createdAt,
          userId: "usr-003",
          action: "Issued",
          module: "Certificates",
          recordId: c.id,
          recordLabel: label,
          details: `${c.type} issued and released.${c.orNumber ? ` OR No. ${c.orNumber}.` : ""}`,
          ipAddress: ip(),
        })
      else if (c.status === "Approved")
        logs.push({
          timestamp: c.createdAt,
          userId: "usr-002",
          action: "Approved",
          module: "Certificates",
          recordId: c.id,
          recordLabel: label,
          details: `${c.type} approved for release.`,
          ipAddress: ip(),
        })
      else if (c.status === "Cancelled")
        logs.push({
          timestamp: c.createdAt,
          userId: "usr-003",
          action: "Cancelled",
          module: "Certificates",
          recordId: c.id,
          recordLabel: label,
          details: "Cancelled – erroneous entry.",
          ipAddress: ip(),
        })
      else
        logs.push({
          timestamp: c.createdAt,
          userId: "usr-007",
          action: "Created",
          module: "Certificates",
          recordId: c.id,
          recordLabel: label,
          details: `${c.type} drafted for ${c.purpose.toLowerCase()}.`,
          ipAddress: ip(),
        })
    })

  serviceRequests.forEach((r) => {
    r.history.slice(1).forEach((h) => {
      logs.push({
        timestamp: h.at,
        userId: h.byUserId ?? "usr-003",
        action: h.status === "Approved" ? "Approved" : h.status === "Rejected" ? "Rejected" : "Status Changed",
        module: "Service Requests",
        recordId: r.id,
        recordLabel: `${r.requestNumber} – ${r.service}`,
        details: `Status changed to ${h.status}.${h.note ? " " + h.note : ""}`,
        ipAddress: ip(),
      })
    })
  })

  blotters.forEach((b) => {
    logs.push({
      timestamp: b.createdAt,
      userId: "usr-007",
      action: "Created",
      module: "Blotter",
      recordId: b.id,
      recordLabel: `${b.blotterNumber} – ${b.incidentType}`,
      details: `Blotter entry recorded. Complainant: ${b.complainant.name}.`,
      ipAddress: ip(),
    })
    b.history.slice(1).forEach((h) => {
      logs.push({
        timestamp: h.at,
        userId: h.byUserId ?? "usr-006",
        action: h.status === "Closed" ? "Closed" : "Status Changed",
        module: "Blotter",
        recordId: b.id,
        recordLabel: `${b.blotterNumber} – ${b.incidentType}`,
        details: `Case status changed to ${h.status}.`,
        ipAddress: ip(),
      })
    })
  })

  incidents.forEach((i) => {
    logs.push({
      timestamp: i.createdAt,
      userId: rng.pick(["usr-006", "usr-010"]),
      action: "Created",
      module: "Incidents",
      recordId: i.id,
      recordLabel: `${i.incidentNumber} – ${i.type}`,
      details: `Incident reported at ${i.location}.`,
      ipAddress: ip(),
    })
  })

  announcements
    .filter((a) => a.status !== "Draft")
    .forEach((a) => {
      logs.push({
        timestamp: a.createdAt,
        userId: a.authorId,
        action: "Published",
        module: "Announcements",
        recordId: a.id,
        recordLabel: a.title,
        details: `Published to ${a.audience}.`,
        ipAddress: ip(),
      })
    })

  users
    .filter((u) => u.lastLogin)
    .forEach((u) => {
      logs.push({
        timestamp: u.lastLogin!,
        userId: u.id,
        action: "Logged In",
        module: "Auth",
        recordLabel: u.email,
        details: "Successful sign-in.",
        ipAddress: ip(),
      })
    })

  logs.push(
    {
      timestamp: timestampDaysAgo(8, 15, 2),
      userId: "usr-001",
      action: "Created",
      module: "Users",
      recordId: "usr-011",
      recordLabel: "sk.samonte@brgysanroque.ph",
      details: "Invited user with role Viewer.",
      ipAddress: ip(),
    },
    {
      timestamp: timestampDaysAgo(20, 10, 44),
      userId: "usr-001",
      action: "Updated",
      module: "Users",
      recordId: "usr-012",
      recordLabel: "tanod.carpio@brgysanroque.ph",
      details: "Status changed from Active to Suspended.",
      ipAddress: ip(),
    },
    {
      timestamp: timestampDaysAgo(12, 9, 30),
      userId: "usr-001",
      action: "Updated",
      module: "Settings",
      recordLabel: "Certificate Types",
      details: "Updated Business Clearance fee to ₱500.00.",
      ipAddress: ip(),
    },
  )

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((l, i) => ({ ...l, id: `log-${pad(logs.length - i, 5)}` }))
}

export const auditLogs: AuditLog[] = build()
