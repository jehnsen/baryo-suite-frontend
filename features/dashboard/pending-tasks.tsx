"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { BlotterCase, Certificate, Hearing, ServiceRequest } from "@/types"
import { StatusBadge } from "@/components/shared/status-badge"
import { useCurrentUser, useLookups } from "@/hooks/use-data"
import { formatDate, formatTime, fullName } from "@/lib/format"

interface Tasks {
  pendingCertificates: Certificate[]
  openRequests: ServiceRequest[]
  upcomingHearings: { hearing: Hearing; blotter: BlotterCase }[]
}

function TaskGroup({ title, count, href, children }: { title: string; count: number; href: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Link href={href} className="group flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
        <span>
          {title} <span className="ml-1 rounded-full bg-muted px-1.5 text-foreground tabular-nums">{count}</span>
        </span>
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
      {count === 0 ? <p className="text-sm text-muted-foreground">All caught up.</p> : <ul className="space-y-1">{children}</ul>}
    </div>
  )
}

function TaskRow({ href, title, meta, status }: { href: string; title: string; meta: string; status?: string }) {
  return (
    <li>
      <Link href={href} className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{meta}</span>
        </span>
        {status && <StatusBadge status={status} />}
      </Link>
    </li>
  )
}

export function PendingTasks({ tasks }: { tasks: Tasks }) {
  const { residents } = useLookups()
  const { canAccess } = useCurrentUser()
  return (
    <div className="space-y-4">
      {!canAccess("certificates") && !canAccess("requests") && !canAccess("blotter") && (
        <p className="text-sm text-muted-foreground">No tasks for your role.</p>
      )}
      {canAccess("certificates") && (
        <TaskGroup title="Certificates awaiting approval" count={tasks.pendingCertificates.length} href="/certificates">
          {tasks.pendingCertificates.slice(0, 3).map((c) => (
            <TaskRow key={c.id} href={`/certificates/${c.id}`} title={fullName(residents.get(c.residentId))} meta={`${c.certificateNumber} · ${c.type}`} />
          ))}
        </TaskGroup>
      )}
      {canAccess("requests") && (
        <TaskGroup title="Open service requests" count={tasks.openRequests.length} href="/requests">
          {tasks.openRequests.slice(0, 3).map((r) => (
            <TaskRow
              key={r.id}
              href={`/requests/${r.id}`}
              title={fullName(residents.get(r.residentId))}
              meta={`${r.requestNumber} · ${r.service}`}
              status={r.status}
            />
          ))}
        </TaskGroup>
      )}
      {canAccess("blotter") && (
        <TaskGroup title="Upcoming blotter hearings" count={tasks.upcomingHearings.length} href="/blotter">
          {tasks.upcomingHearings.slice(0, 3).map(({ hearing, blotter }) => (
            <TaskRow
              key={hearing.id}
              href={`/blotter/${blotter.id}`}
              title={`${blotter.blotterNumber} · ${hearing.type}`}
              meta={`${formatDate(hearing.date, "EEE, MMM d")} · ${formatTime(hearing.time)} · ${blotter.complainant.name.split(" ")[0]} vs. ${blotter.respondent.name.split(" ")[0]}`}
            />
          ))}
        </TaskGroup>
      )}
    </div>
  )
}
