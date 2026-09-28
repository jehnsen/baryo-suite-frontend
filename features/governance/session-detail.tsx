"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, CheckCircle2, Gavel, NotebookPen, Pencil, Play, Plus, ScrollText, Stamp, Users } from "lucide-react"
import { toast } from "sonner"
import type { AttendanceStatus, BarangaySession } from "@/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ContentTabs } from "@/components/shared/content-tabs"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { useCurrentUser, useLookups, useMinutes, useOfficials, useOrdinances, useResolutions, useSessions } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ATTENDANCE_STATUSES } from "@/lib/constants"
import { formatDate, formatTime, fullName, officialName } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { barangaySessionActions, minutesActions } from "@/lib/store/governance-actions"
import { MotionDialog } from "./motion-dialog"

const VOTING = ["Punong Barangay", "Kagawad", "SK Chairperson"]

export function SessionDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const session = useSessions().find((s) => s.id === id)
  return (
    <LoadState load={load}>
      {session ? <SessionDetailContent s={session} /> : <RecordNotFound entity="Session" backHref="/governance/sessions" backLabel="Back to sessions" />}
    </LoadState>
  )
}

function SessionDetailContent({ s }: { s: BarangaySession }) {
  const router = useRouter()
  const { officials } = useLookups()
  const allOfficials = useOfficials()
  const minutes = useMinutes().find((m) => m.sessionId === s.id)
  const ordinances = useOrdinances().filter((o) => o.sessionId === s.id)
  const resolutions = useResolutions().filter((r) => r.sessionId === s.id)
  const { can } = useCurrentUser()
  const canEdit = can("governance")
  const [motionOpen, setMotionOpen] = useState(false)
  const [confirm, setConfirm] = useState<"start" | "complete" | "cancel" | null>(null)

  const voting = s.attendance.filter((a) => VOTING.includes(officials.get(a.officialId)?.position ?? ""))
  const present = voting.filter((a) => a.status === "Present" || a.status === "Late").length
  const quorum = voting.length ? present > voting.length / 2 : false

  const startSession = async () => {
    await simulateLatency(350)
    const roster = s.attendance.length
      ? s.attendance
      : allOfficials
          .filter((o) => o.status !== "Inactive" && (VOTING.includes(o.position) || o.position === "Barangay Secretary" || o.position === "Barangay Treasurer"))
          .sort((a, b) => a.rank - b.rank)
          .map((o) => ({ officialId: o.id, status: (o.status === "On Leave" ? "Excused" : "Present") as AttendanceStatus }))
    barangaySessionActions.update(s.id, { attendance: roster })
    barangaySessionActions.setStatus(s.id, "Ongoing")
    toast.success("Session started", { description: "Attendance roster opened — mark absences as needed." })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Sessions", href: "/governance/sessions" }, { label: s.sessionNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {s.title} <StatusBadge status={s.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{s.sessionNumber}</span> · {s.type} session · {formatDate(s.date, "EEEE, MMMM d, yyyy")} · {formatTime(s.time)} ·{" "}
            {s.venue}
          </>
        }
        actions={
          canEdit && (
            <>
              {s.status === "Scheduled" && (
                <>
                  <Button variant="outline" onClick={() => setConfirm("cancel")}>
                    <Ban /> Cancel
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/governance/sessions/${s.id}/edit`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                  <Button onClick={() => setConfirm("start")}>
                    <Play /> Start session
                  </Button>
                </>
              )}
              {s.status === "Ongoing" && (
                <>
                  <Button variant="outline" onClick={() => setMotionOpen(true)}>
                    <Gavel /> Record motion
                  </Button>
                  <Button onClick={() => setConfirm("complete")}>
                    <CheckCircle2 /> Adjourn session
                  </Button>
                </>
              )}
              {s.status === "Completed" &&
                (minutes ? (
                  <Button asChild>
                    <Link href={`/governance/minutes/${minutes.id}`}>
                      <NotebookPen /> View minutes
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const m = minutesActions.createForSession(s.id)
                      toast.success("Minutes drafted from the agenda")
                      router.push(`/governance/minutes/${m.id}/edit`)
                    }}
                  >
                    <NotebookPen /> Draft minutes
                  </Button>
                ))}
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContentTabs
            tabs={[
              {
                value: "agenda",
                label: "Agenda",
                count: s.agenda.length,
                content: (
                  <SectionCard contentClassName="px-0">
                    <ol className="divide-y">
                      {s.agenda.map((a) => {
                        const motions = s.motions.filter((m) => m.agendaItemId === a.id)
                        return (
                          <li key={a.id} className="flex gap-3 px-4 py-3">
                            <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">{a.order}.</span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-medium">{a.title}</p>
                              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <TagBadge className="h-4 px-1 text-[10px]">{a.type}</TagBadge>
                                {a.presenterId && <>Presented by {officialName(officials.get(a.presenterId), true)}</>}
                              </p>
                              {motions.map((m) => (
                                <p key={m.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <StatusBadge status={m.result} className="h-4 text-[10px]" /> {m.text}
                                </p>
                              ))}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </SectionCard>
                ),
              },
              {
                value: "attendance",
                label: "Attendance",
                count: s.attendance.length || undefined,
                content:
                  s.attendance.length === 0 ? (
                    <SectionCard>
                      <EmptyState compact icon={Users} title="Attendance is taken when the session starts" />
                    </SectionCard>
                  ) : (
                    <SectionCard
                      title={`${present} of ${voting.length} voting members present`}
                      description={quorum ? "Quorum present (majority of all members)." : "No quorum."}
                      actions={<StatusBadge status={quorum ? "Quorum" : "No quorum"} tone={quorum ? "success" : "danger"} />}
                      contentClassName="px-0"
                    >
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-4 text-xs">Official</TableHead>
                            <TableHead className="text-xs">Position</TableHead>
                            <TableHead className="pr-4 text-xs">Attendance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.attendance.map((a) => {
                            const o = officials.get(a.officialId)
                            return (
                              <TableRow key={a.officialId}>
                                <TableCell className="pl-4">
                                  <span className="flex items-center gap-2">
                                    <PersonAvatar name={fullName(o)} size="xs" /> {officialName(o, true)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{o?.position}</TableCell>
                                <TableCell className="pr-4">
                                  {canEdit && s.status !== "Cancelled" ? (
                                    <Select
                                      value={a.status}
                                      onValueChange={(v) =>
                                        barangaySessionActions.update(s.id, {
                                          attendance: s.attendance.map((x) => (x.officialId === a.officialId ? { ...x, status: v as AttendanceStatus } : x)),
                                        })
                                      }
                                    >
                                      <SelectTrigger size="sm" className="w-32" aria-label={`Attendance of ${fullName(o)}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ATTENDANCE_STATUSES.map((st) => (
                                          <SelectItem key={st} value={st}>
                                            {st}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <StatusBadge status={a.status} />
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </SectionCard>
                  ),
              },
              {
                value: "motions",
                label: "Motions & decisions",
                count: s.motions.length || undefined,
                content: (
                  <div className="space-y-4">
                    <SectionCard
                      title="Motions"
                      actions={
                        canEdit &&
                        (s.status === "Ongoing" || s.status === "Completed") && (
                          <Button size="sm" variant="outline" onClick={() => setMotionOpen(true)}>
                            <Plus /> Record motion
                          </Button>
                        )
                      }
                    >
                      {s.motions.length === 0 ? (
                        <EmptyState compact icon={Gavel} title="No motions recorded" />
                      ) : (
                        <ul className="divide-y">
                          {s.motions.map((m) => (
                            <li key={m.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                              <p className="text-sm">{m.text}</p>
                              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <StatusBadge status={m.result} />
                                Moved by {officialName(officials.get(m.movedById), true)}
                                {m.secondedById && <> · seconded by {officialName(officials.get(m.secondedById), true)}</>}
                                {m.votesFor !== undefined && (
                                  <>
                                    {" "}
                                    · {m.votesFor} for, {m.votesAgainst ?? 0} against{m.abstentions ? `, ${m.abstentions} abstained` : ""}
                                  </>
                                )}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </SectionCard>
                    <SectionCard title="Decisions">
                      {s.decisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No decisions recorded.</p>
                      ) : (
                        <ul className="list-disc space-y-1 pl-5 text-sm">
                          {s.decisions.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </SectionCard>
                  </div>
                ),
              },
              {
                value: "legislation",
                label: "Legislation",
                count: ordinances.length + resolutions.length || undefined,
                content: (
                  <SectionCard>
                    {ordinances.length + resolutions.length === 0 ? (
                      <EmptyState compact icon={ScrollText} title="No ordinances or resolutions linked" />
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
                                <span className="block text-sm font-medium">{l.title}</span>
                              </span>
                              <StatusBadge status={l.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                ),
              },
            ]}
          />
        </div>
        <div className="space-y-4">
          <SectionCard title="Details">
            <DetailList
              columns={1}
              items={[
                { label: "Presiding officer", value: officialName(officials.get(s.presidingOfficerId), true) },
                { label: "Type", value: s.type },
                { label: "Venue", value: s.venue },
              ]}
            />
          </SectionCard>
          <SectionCard title="Minutes">
            {minutes ? (
              <Link href={`/governance/minutes/${minutes.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                <NotebookPen className="size-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{minutes.actionItems.length} action items</span>
                <StatusBadge status={minutes.status} />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                {s.status === "Completed" ? "Minutes not yet drafted." : "Minutes are drafted after the session."}
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      <MotionDialog session={s} open={motionOpen} onOpenChange={setMotionOpen} />
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "start" ? "Start session?" : confirm === "complete" ? "Adjourn session?" : "Cancel session?"}
        description={
          confirm === "start"
            ? "Opens the attendance roll call and motion recording."
            : confirm === "complete"
              ? "Marks the session completed. Draft the minutes next."
              : "Members will be notified that the session is cancelled."
        }
        confirmLabel={confirm === "start" ? "Start" : confirm === "complete" ? "Adjourn" : "Cancel session"}
        destructive={confirm === "cancel"}
        onConfirm={async () => {
          if (confirm === "start") return startSession()
          await simulateLatency(350)
          barangaySessionActions.setStatus(s.id, confirm === "complete" ? "Completed" : "Cancelled")
          toast.success(confirm === "complete" ? "Session adjourned" : "Session cancelled")
        }}
      />
    </div>
  )
}
