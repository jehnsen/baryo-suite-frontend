"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarPlus, CheckCircle2, FileSearch, Handshake, Lock, MessageSquareWarning, Pencil, Scale, Send } from "lucide-react"
import { toast } from "sonner"
import type { BlotterCase, BlotterStatus, CaseParty } from "@/types"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { FileList } from "@/components/shared/file-upload"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { NotesPanel } from "@/components/shared/notes-panel"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { Timeline, type TimelineItem } from "@/components/shared/timeline"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useBlotters, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { BLOTTER_FLOW } from "@/lib/constants"
import { formatDate, formatDateTime, formatTime, officialName } from "@/lib/format"
import { toneFor } from "@/lib/status"
import { blotterActions, simulateLatency } from "@/lib/store/actions"
import { ScheduleHearingDialog } from "./schedule-hearing-dialog"

const STATUS_ICONS: Record<BlotterStatus, typeof Send> = {
  Reported: MessageSquareWarning,
  "Under Investigation": FileSearch,
  "For Mediation": Scale,
  Settled: Handshake,
  Referred: Send,
  Closed: Lock,
}

const TIMELINE_LABELS: Partial<Record<BlotterStatus, string>> = {
  "Under Investigation": "Investigation",
  "For Mediation": "Mediation",
  Settled: "Settlement",
}

interface Transition {
  to: BlotterStatus
  label: string
  description: string
  destructive?: boolean
}

function transitionsFor(status: BlotterStatus): Transition[] {
  switch (status) {
    case "Reported":
      return [{ to: "Under Investigation", label: "Start investigation", description: "Assigned officer will gather statements and evidence." }]
    case "Under Investigation":
      return [
        { to: "For Mediation", label: "Refer to mediation", description: "Summons will be issued for mediation before the Punong Barangay." },
        { to: "Closed", label: "Close case", description: "Close without mediation (e.g. complaint withdrawn)." },
      ]
    case "For Mediation":
      return [
        { to: "Settled", label: "Record settlement", description: "Parties signed an amicable settlement (Kasunduang Pag-aayos)." },
        {
          to: "Referred",
          label: "Refer to authorities",
          description: "Mediation failed; issue a Certificate to File Action and refer to PNP / court.",
          destructive: true,
        },
      ]
    case "Settled":
    case "Referred":
      return [{ to: "Closed", label: "Close case", description: "Archive the case as resolved at barangay level." }]
    default:
      return []
  }
}

export function BlotterDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const blotter = useBlotters().find((b) => b.id === id)
  return (
    <LoadState load={load}>
      {blotter ? <BlotterDetailContent b={blotter} /> : <RecordNotFound entity="Blotter case" backHref="/blotter" backLabel="Back to blotter" />}
    </LoadState>
  )
}

function PartyCard({ role, party }: { role: string; party: CaseParty }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <PersonAvatar name={party.name} size="md" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{role}</p>
        {party.residentId ? (
          <Link href={`/residents/${party.residentId}`} className="font-medium hover:underline">
            {party.name}
          </Link>
        ) : (
          <p className="font-medium">
            {party.name} <TagBadge className="ml-1">Non-resident</TagBadge>
          </p>
        )}
        {party.address && <p className="text-xs text-muted-foreground">{party.address}</p>}
        {party.contactNumber && <p className="text-xs text-muted-foreground tabular-nums">{party.contactNumber}</p>}
      </div>
    </div>
  )
}

function BlotterDetailContent({ b }: { b: BlotterCase }) {
  const { officials, users } = useLookups()
  const { can } = useCurrentUser()
  const { open } = useEntityDialogs()
  const [transition, setTransition] = useState<Transition | null>(null)
  const [note, setNote] = useState("")
  const [hearingOpen, setHearingOpen] = useState(false)
  const canWrite = can("write")
  const isOpen = !["Closed", "Settled", "Referred"].includes(b.status)
  const transitions = canWrite ? transitionsFor(b.status) : []
  const canSchedule = canWrite && ["Under Investigation", "For Mediation", "Reported"].includes(b.status)

  const reached = b.history.map((h) => h.status)
  const timeline: TimelineItem[] = [
    ...b.history.map((h, i) => ({
      id: `${h.status}-${i}`,
      title: TIMELINE_LABELS[h.status] ?? h.status,
      icon: STATUS_ICONS[h.status],
      tone: toneFor(h.status),
      timestamp: formatDateTime(h.at),
      description: (
        <>
          {h.byUserId && `by ${users.get(h.byUserId)?.name ?? "Staff"}`}
          {h.note && <span className="mt-0.5 block text-foreground/80">{h.note}</span>}
        </>
      ),
    })),
    ...(reached.includes("Referred")
      ? reached.includes("Closed")
        ? []
        : [{ id: "Closed", title: "Closed", icon: Lock, pending: true }]
      : BLOTTER_FLOW.filter((s) => !reached.includes(s)).map((s) => ({ id: s, title: TIMELINE_LABELS[s] ?? s, icon: STATUS_ICONS[s], pending: true }))),
  ]

  const hearings = [...b.hearings].sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Blotter", href: "/blotter" }, { label: b.blotterNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {b.incidentType} <StatusBadge status={b.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{b.blotterNumber}</span> · {b.complainant.name} vs. {b.respondent.name}
          </>
        }
        actions={
          <>
            {canWrite && isOpen && (
              <Button variant="outline" onClick={() => open({ type: "blotter", record: b })}>
                <Pencil /> Edit
              </Button>
            )}
            {canSchedule && (
              <Button variant="outline" onClick={() => setHearingOpen(true)}>
                <CalendarPlus /> Schedule hearing
              </Button>
            )}
            {transitions.length === 1 && (
              <Button onClick={() => setTransition(transitions[0])}>
                <CheckCircle2 /> {transitions[0].label}
              </Button>
            )}
            {transitions.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Update status</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((t) => (
                    <DropdownMenuItem key={t.to} variant={t.destructive ? "destructive" : "default"} onSelect={() => setTransition(t)}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Case details">
            <DetailList
              columns={3}
              items={[
                { label: "Case number", value: <span className="font-mono text-xs">{b.blotterNumber}</span> },
                { label: "Date", value: formatDate(b.date, "MMMM d, yyyy") },
                { label: "Time", value: formatTime(b.time) },
                { label: "Location", value: b.location },
                { label: "Incident type", value: b.incidentType },
                { label: "Assigned officer", value: officialName(officials.get(b.assignedOfficerId ?? "")) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Parties">
            <div className="grid gap-3 sm:grid-cols-2">
              <PartyCard role="Complainant" party={b.complainant} />
              <PartyCard role="Respondent" party={b.respondent} />
            </div>
            {b.witnesses.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground">Witnesses:</span>
                {b.witnesses.map((w) => (
                  <TagBadge key={w.name}>{w.name}</TagBadge>
                ))}
              </div>
            )}
          </SectionCard>

          <ContentTabs
            tabs={[
              {
                value: "narrative",
                label: "Narrative",
                content: (
                  <SectionCard>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{b.narrative}</p>
                  </SectionCard>
                ),
              },
              {
                value: "hearings",
                label: "Hearings",
                count: b.hearings.length,
                content: (
                  <SectionCard
                    actions={
                      canSchedule && (
                        <Button size="sm" variant="outline" onClick={() => setHearingOpen(true)}>
                          <CalendarPlus /> Schedule
                        </Button>
                      )
                    }
                    title="Hearing schedule"
                  >
                    {hearings.length === 0 ? (
                      <EmptyState
                        compact
                        icon={Scale}
                        title="No hearings scheduled"
                        description="Schedule a mediation hearing once the complaint is validated."
                      />
                    ) : (
                      <ul className="divide-y">
                        {hearings.map((h) => (
                          <li key={h.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start gap-3">
                              <div className="w-14 shrink-0 rounded-md border text-center">
                                <p className="rounded-t-md bg-muted py-0.5 text-[10px] font-medium uppercase">{formatDate(h.date, "MMM")}</p>
                                <p className="py-0.5 text-lg font-semibold tabular-nums">{formatDate(h.date, "d")}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {h.type} · {formatTime(h.time)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(h.date, "EEEE, MMMM d, yyyy")} · {h.venue}
                                </p>
                                {h.notes && <p className="mt-1 text-sm">{h.notes}</p>}
                              </div>
                            </div>
                            <StatusBadge status={h.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                ),
              },
              {
                value: "attachments",
                label: "Attachments",
                count: b.attachments.length,
                content: (
                  <SectionCard>
                    {b.attachments.length ? (
                      <FileList files={b.attachments} />
                    ) : (
                      <EmptyState compact title="No attachments" description="Add photos or documents by editing the case." />
                    )}
                  </SectionCard>
                ),
              },
              {
                value: "notes",
                label: "Notes",
                count: b.notes.length,
                content: (
                  <SectionCard>
                    <NotesPanel
                      notes={b.notes}
                      users={users}
                      onAdd={
                        canWrite
                          ? async (body) => {
                              await simulateLatency(300)
                              blotterActions.addNote(b.id, body)
                            }
                          : undefined
                      }
                    />
                  </SectionCard>
                ),
              },
            ]}
          />
        </div>

        <SectionCard title="Case timeline" className="h-fit">
          <Timeline items={timeline} />
        </SectionCard>
      </div>

      <ScheduleHearingDialog blotter={b} open={hearingOpen} onOpenChange={setHearingOpen} />
      <ConfirmDialog
        open={Boolean(transition)}
        onOpenChange={(o) => {
          if (!o) {
            setTransition(null)
            setNote("")
          }
        }}
        title={transition ? `${transition.label}?` : ""}
        description={transition?.description}
        confirmLabel={transition?.label}
        destructive={transition?.destructive}
        onConfirm={async () => {
          if (!transition) return
          await simulateLatency(450)
          blotterActions.setStatus(b.id, transition.to, note.trim() || undefined)
          toast.success(`Case ${transition.to === "Closed" ? "closed" : `marked as ${transition.to}`}`, { description: b.blotterNumber })
          setNote("")
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="transition-note">
            Remarks <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea id="transition-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Recorded in the case timeline" />
        </div>
      </ConfirmDialog>
    </div>
  )
}
