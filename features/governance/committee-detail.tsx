"use client"

import Link from "next/link"
import { Pencil, ScrollText, Stamp } from "lucide-react"
import type { Committee } from "@/types"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCommittees, useCurrentUser, useLookups, useOrdinances, usePPAs, useResolutions } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { fullName, officialName } from "@/lib/format"
import { PPATable } from "@/features/finance/ppa-table"

export function CommitteeDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const committee = useCommittees().find((c) => c.id === id)
  return (
    <LoadState load={load}>
      {committee ? <Content c={committee} /> : <RecordNotFound entity="Committee" backHref="/governance/committees" backLabel="Back to committees" />}
    </LoadState>
  )
}

function Content({ c }: { c: Committee }) {
  const { officials } = useLookups()
  const ppas = usePPAs().filter((p) => p.committeeId === c.id && p.budgetId === "bud-2026")
  const ordinances = useOrdinances().filter((o) => o.committeeId === c.id)
  const resolutions = useResolutions().filter((r) => r.committeeId === c.id)
  const { open } = useEntityDialogs()
  const { can, canAccess } = useCurrentUser()
  const members = [
    { id: c.chairpersonId, role: "Chairperson" },
    ...(c.viceChairId ? [{ id: c.viceChairId, role: "Vice Chair" }] : []),
    ...c.memberIds.map((id) => ({ id, role: "Member" })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Committees", href: "/governance/committees" }, { label: c.name.replace("Committee on ", "") }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.name} <StatusBadge status={c.status} />
          </span>
        }
        actions={
          can("governance") && (
            <Button variant="outline" onClick={() => open({ type: "committee", record: c })}>
              <Pencil /> Edit
            </Button>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Members">
          <ul className="space-y-3">
            {members.map((m) => {
              const o = officials.get(m.id)
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <PersonAvatar name={fullName(o)} size="md" />
                  <span className="min-w-0 flex-1">
                    <Link href={`/officials/${m.id}`} className="block truncate text-sm font-medium hover:underline">
                      {officialName(o, true)}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{o?.position}</span>
                  </span>
                  <TagBadge>{m.role}</TagBadge>
                </li>
              )
            })}
          </ul>
        </SectionCard>
        <SectionCard title="Responsibilities" className="lg:col-span-2">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {c.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
      {(canAccess("allocations") || canAccess("projects")) && (
        <SectionCard
          title={`Programs, projects and activities (${ppas.length})`}
          description="FY 2026 PPAs under this committee's oversight"
          contentClassName="pt-0"
        >
          <PPATable ppas={ppas} hideCategory pageSize={5} />
        </SectionCard>
      )}
      <SectionCard title={`Legislation (${ordinances.length + resolutions.length})`}>
        {ordinances.length + resolutions.length === 0 ? (
          <EmptyState compact title="No legislation referred to this committee" />
        ) : (
          <ul className="divide-y">
            {[
              ...ordinances.map((o) => ({
                id: o.id,
                href: `/governance/ordinances/${o.id}`,
                number: o.ordinanceNumber,
                title: o.title,
                status: o.status,
                icon: ScrollText,
              })),
              ...resolutions.map((r) => ({
                id: r.id,
                href: `/governance/resolutions/${r.id}`,
                number: r.resolutionNumber,
                title: r.title,
                status: r.status,
                icon: Stamp,
              })),
            ].map((l) => (
              <li key={l.id}>
                <Link href={l.href} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60">
                  <l.icon className="mt-0.5 size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs">{l.number}</span>
                    <span className="block text-sm">{l.title}</span>
                  </span>
                  <StatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
