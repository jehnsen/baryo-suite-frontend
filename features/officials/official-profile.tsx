"use client"

import Link from "next/link"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { Mail, Pencil, Phone } from "lucide-react"
import type { BarangayOfficial } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useBlotters, useCertificates, useCurrentUser, useIncidents, useOfficials, useUsers } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, fullName, officialName } from "@/lib/format"

export function OfficialProfile({ id }: { id: string }) {
  const load = usePageLoad()
  const official = useOfficials().find((o) => o.id === id)
  return (
    <LoadState load={load}>
      {official ? <OfficialProfileContent o={official} /> : <RecordNotFound entity="Official" backHref="/officials" backLabel="Back to officials" />}
    </LoadState>
  )
}

function OfficialProfileContent({ o }: { o: BarangayOfficial }) {
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const account = useUsers().find((u) => u.officialId === o.id)
  const blotters = useBlotters().filter((b) => b.assignedOfficerId === o.id)
  const incidents = useIncidents().filter((i) => i.assignedOfficerId === o.id)
  const certificates = useCertificates().filter((c) => c.issuedById === o.id)
  const now = new Date()
  const total = differenceInCalendarDays(parseISO(o.termEnd), parseISO(o.termStart))
  const elapsed = Math.min(total, Math.max(0, differenceInCalendarDays(now, parseISO(o.termStart))))
  const daysLeft = Math.max(0, differenceInCalendarDays(parseISO(o.termEnd), now))
  const assigned = [
    ...blotters.map((b) => ({ id: b.id, href: `/blotter/${b.id}`, number: b.blotterNumber, title: b.incidentType, status: b.status })),
    ...incidents.map((i) => ({ id: i.id, href: `/incidents?open=${i.id}`, number: i.incidentNumber, title: i.type, status: i.status })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Officials", href: "/officials" }, { label: fullName(o) }]} title="Official profile" />
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <PersonAvatar name={fullName(o)} src={o.photoUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{officialName(o, true)}</h2>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {o.position}
              {o.committee ? ` · ${o.committee}` : ""}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <a href={`tel:${o.contactNumber.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-3.5" /> {o.contactNumber}
              </a>
              {o.email && (
                <a href={`mailto:${o.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="size-3.5" /> {o.email}
                </a>
              )}
            </div>
          </div>
          {can("admin") && (
            <Button variant="outline" onClick={() => open({ type: "official", record: o })}>
              <Pencil /> Edit
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Blotter cases handled" value={blotters.length} />
        <StatCard label="Incidents handled" value={incidents.length} />
        <StatCard label="Certificates prepared" value={certificates.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Term of office">
          <div className="space-y-3">
            <Progress value={(elapsed / Math.max(1, total)) * 100} aria-label="Term progress" />
            <DetailList
              columns={2}
              items={[
                { label: "Term start", value: formatDate(o.termStart, "MMMM d, yyyy") },
                { label: "Term end", value: formatDate(o.termEnd, "MMMM d, yyyy") },
                { label: "Remaining", value: `${daysLeft} days` },
              ]}
            />
          </div>
        </SectionCard>
        <SectionCard title="System account">
          {account ? (
            <DetailList
              columns={1}
              items={[
                { label: "Email", value: account.email },
                { label: "Role", value: account.role },
                { label: "Status", value: <StatusBadge status={account.status} /> },
                { label: "Last login", value: formatDate(account.lastLogin, "MMM d, yyyy · h:mm a") },
              ]}
            />
          ) : (
            <EmptyState compact title="No user account" description="This official does not sign in to BaryoSuite." />
          )}
        </SectionCard>
        <SectionCard title="Assigned cases">
          {assigned.length === 0 ? (
            <EmptyState compact title="No assigned cases" />
          ) : (
            <ul className="divide-y">
              {assigned.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted/60">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{a.number}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
