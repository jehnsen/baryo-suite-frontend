"use client"

import { Pencil, Users } from "lucide-react"
import type { BarangayAssembly } from "@/types"
import { Button } from "@/components/ui/button"
import { AttachmentsPanel } from "@/components/shared/attachments-panel"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAssemblies, useCurrentUser, useHouseholds } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatTime } from "@/lib/format"
import { assemblyActions } from "@/lib/store/governance-actions"

export function AssemblyDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const assembly = useAssemblies().find((a) => a.id === id)
  return (
    <LoadState load={load}>
      {assembly ? <Content a={assembly} /> : <RecordNotFound entity="Assembly" backHref="/governance/assemblies" backLabel="Back to assemblies" />}
    </LoadState>
  )
}

function Content({ a }: { a: BarangayAssembly }) {
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const households = useHouseholds().filter((h) => h.status === "Active").length
  const completed = a.status === "Completed"

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Assemblies", href: "/governance/assemblies" }, { label: a.title }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {a.title} <StatusBadge status={a.status} />
          </span>
        }
        description={`${formatDate(a.date, "EEEE, MMMM d, yyyy")} · ${formatTime(a.time)} · ${a.venue}`}
        actions={
          can("governance") && (
            <Button variant={completed ? "outline" : "default"} onClick={() => open({ type: "assembly", record: a })}>
              <Pencil /> {completed ? "Edit" : "Record results"}
            </Button>
          )
        }
      />
      {completed && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Attendance" value={a.attendanceCount} icon={Users} />
          <StatCard
            label="Households represented"
            value={a.householdsRepresented ?? "—"}
            hint={a.householdsRepresented ? `${Math.round((a.householdsRepresented / households) * 100)}% of ${households} households` : undefined}
          />
          <StatCard label="Topics discussed" value={a.topics.length} />
          <StatCard label="Decisions" value={a.decisions.length} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Agenda">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {a.agenda.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard title="Topics discussed">
          {a.topics.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {a.topics.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Recorded after the assembly" />
          )}
        </SectionCard>
        <SectionCard title="Resolutions / decisions">
          {a.decisions.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {a.decisions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No decisions recorded" />
          )}
        </SectionCard>
        <SectionCard title="Minutes">
          {a.minutesSummary ? <p className="text-sm leading-relaxed">{a.minutesSummary}</p> : <EmptyState compact title="No minutes yet" />}
        </SectionCard>
      </div>
      <SectionCard title="Documentation">
        <AttachmentsPanel
          attachments={a.attachments}
          emptyLabel="No attendance sheets or photos attached"
          onAdd={can("governance") ? (files) => assemblyActions.addAttachments(a.id, files) : undefined}
        />
      </SectionCard>
    </div>
  )
}
