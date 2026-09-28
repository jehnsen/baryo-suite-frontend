import type { AuditLog } from "@/types"
import { announcements } from "./announcements"
import { blotters } from "./blotters"
import { certificates } from "./certificates"
import { incidents } from "./incidents"
import { residents } from "./residents"
import { serviceRequests } from "./serviceRequests"
import { users } from "./users"
import { assets } from "./assets"
import { budgets } from "./budgets"
import { collections } from "./collections"
import { disbursements } from "./disbursements"
import { inventoryItems, inventoryTransactions } from "./inventory"
import { obligations } from "./obligations"
import { ordinances } from "./ordinances"
import { projects } from "./projects"
import { resolutions } from "./resolutions"
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
        userId: rng.pick(["usr-003"]),
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
        userId: rng.pick(["usr-003"]),
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
          userId: "usr-003",
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
          userId: "usr-003",
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
      userId: "usr-003",
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
        userId: h.byUserId ?? "usr-003",
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
      userId: rng.pick(["usr-003"]),
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
      recordId: "usr-003",
      recordLabel: "secretary@brgysanroque.ph",
      details: "Role set to Secretary; access limited to secretary modules.",
      ipAddress: ip(),
    },
    {
      timestamp: timestampDaysAgo(20, 10, 44),
      userId: "usr-001",
      action: "Updated",
      module: "Users",
      recordId: "usr-004",
      recordLabel: "treasurer@brgysanroque.ph",
      details: "Role set to Treasurer; access limited to treasurer modules.",
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

  // ---- Phase 2: finance, governance and operations (recent activity only)
  const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
  const recent = (iso: string) => iso >= "2026-06-01"

  budgets.forEach((b) =>
    b.history
      .filter((h) => recent(h.at.slice(0, 10)) || h.status === "Approved")
      .forEach((h) =>
        logs.push({
          timestamp: h.at,
          userId: h.byUserId ?? "usr-004",
          action: h.status === "Approved" ? "Approved" : h.status === "Draft" ? "Created" : "Status Changed",
          module: "Budget",
          recordId: b.id,
          recordLabel: b.title,
          details: `Budget moved to ${h.status}.${h.note ? " " + h.note : ""}`,
          ipAddress: ip(),
        }),
      ),
  )
  obligations.forEach((o) =>
    o.history
      .filter((h) => recent(h.at.slice(0, 10)))
      .forEach((h) =>
        logs.push({
          timestamp: h.at,
          userId: h.byUserId ?? "usr-004",
          action: h.status === "Approved" ? "Approved" : h.status === "Draft" ? "Created" : h.status === "Cancelled" ? "Cancelled" : "Submitted",
          module: "Obligations",
          recordId: o.id,
          recordLabel: `${o.obligationNumber} – ${o.payee}`,
          details: `Obligation ${h.status.toLowerCase()} (${peso(o.amount)}).`,
          ipAddress: ip(),
        }),
      ),
  )
  disbursements.forEach((d) =>
    d.history
      .filter((h) => recent(h.at.slice(0, 10)) && ["Approved", "Released", "For Review"].includes(h.status))
      .forEach((h) =>
        logs.push({
          timestamp: h.at,
          userId: h.byUserId ?? "usr-004",
          action: h.status === "Released" ? "Released" : h.status === "Approved" ? "Approved" : "Submitted",
          module: "Disbursements",
          recordId: d.id,
          recordLabel: `${d.disbursementNumber} – ${d.payee}`,
          details: `Disbursement ${h.status.toLowerCase()} (${peso(d.amount)}).${h.status === "Released" && d.referenceNumber ? " " + d.referenceNumber + "." : ""}`,
          ipAddress: ip(),
        }),
      ),
  )
  collections
    .filter((c) => c.date >= "2026-09-01")
    .forEach((c) =>
      logs.push({
        timestamp: c.createdAt,
        userId: c.collectorId,
        action: "Recorded",
        module: "Collections",
        recordId: c.id,
        recordLabel: `${c.orNumber} – ${c.payerName}`,
        details: `${c.type}: ${peso(c.amount)} via ${c.paymentMethod}.`,
        ipAddress: ip(),
      }),
    )
  projects.forEach((p) =>
    p.history
      .filter((h) => recent(h.at.slice(0, 10)))
      .forEach((h) =>
        logs.push({
          timestamp: h.at,
          userId: h.byUserId ?? "usr-003",
          action: h.status === "Approved" ? "Approved" : "Status Changed",
          module: "Projects",
          recordId: p.id,
          recordLabel: `${p.code} – ${p.name}`,
          details: `Project moved to ${h.status}.${h.note ? " " + h.note : ""}`,
          ipAddress: ip(),
        }),
      ),
  )
  ;[
    ...ordinances.map((o) => ({ r: o, num: o.ordinanceNumber, mod: "Ordinances" as const })),
    ...resolutions.map((r) => ({ r, num: r.resolutionNumber, mod: "Resolutions" as const })),
  ].forEach(({ r, num, mod }) =>
    r.history
      .filter((h) => h.at >= "2026-01-01" && ["Approved", "Rejected", "Effective"].includes(h.status))
      .forEach((h) =>
        logs.push({
          timestamp: h.at,
          userId: h.byUserId ?? "usr-003",
          action: h.status === "Approved" ? "Approved" : h.status === "Rejected" ? "Rejected" : "Status Changed",
          module: mod,
          recordId: r.id,
          recordLabel: num,
          details: `${num} ${h.status.toLowerCase()}: ${r.title}.`,
          ipAddress: ip(),
        }),
      ),
  )
  assets
    .filter((a) => a.acquisitionDate >= "2026-01-01")
    .forEach((a) =>
      logs.push({
        timestamp: `${a.acquisitionDate}T11:00:00+08:00`,
        userId: "usr-004",
        action: "Assigned",
        module: "Assets",
        recordId: a.id,
        recordLabel: `${a.assetNumber} – ${a.name}`,
        details: `Registered and assigned to custodian at ${a.location}.`,
        ipAddress: ip(),
      }),
    )
  inventoryTransactions
    .filter((t) => t.date >= "2026-09-01" || t.date === "2026-07-24")
    .forEach((t) => {
      const item = inventoryItems.find((i) => i.id === t.itemId)
      logs.push({
        timestamp: `${t.date}T13:00:00+08:00`,
        userId: t.byUserId,
        action: t.type === "Stock Out" ? "Stock Out" : t.type === "Stock In" ? "Stock In" : "Adjusted",
        module: "Inventory",
        recordId: t.itemId,
        recordLabel: `${item?.code} – ${item?.name}`,
        details: `${t.type}: ${t.quantity} ${item?.unit}${t.issuedTo ? ` to ${t.issuedTo}` : ""}.`,
        ipAddress: ip(),
      })
    })

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((l, i) => ({ ...l, id: `log-${pad(logs.length - i, 5)}` }))
}

export const auditLogs: AuditLog[] = build()
