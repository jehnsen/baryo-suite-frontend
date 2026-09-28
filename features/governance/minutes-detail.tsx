"use client"

import Link from "next/link"
import { CheckCircle2, Pencil, Printer, Send } from "lucide-react"
import { toast } from "sonner"
import type { ActionItemStatus, MeetingMinutes } from "@/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useCurrentUser, useLookups, useMinutes, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { formatDate, formatDateTime, formatTime, officialName } from "@/lib/format"
import { minutesActions } from "@/lib/store/governance-actions"

const ACTION_STATUSES: ActionItemStatus[] = ["Open", "In Progress", "Done"]

export function MinutesDetail({ id }: { id: string }) {
  const load = usePageLoad()
  const minutes = useMinutes().find((m) => m.id === id)
  return (
    <LoadState load={load}>
      {minutes ? <MinutesDetailContent m={minutes} /> : <RecordNotFound entity="Minutes" backHref="/governance/minutes" backLabel="Back to minutes" />}
    </LoadState>
  )
}

function MinutesDetailContent({ m }: { m: MeetingMinutes }) {
  const { sessions, officials } = useLookups()
  const settings = useSettings()
  const { can } = useCurrentUser()
  const s = sessions.get(m.sessionId)
  if (!s) return <RecordNotFound entity="Session" backHref="/governance/minutes" backLabel="Back to minutes" />
  const name = (id?: string) => officialName(officials.get(id ?? ""), true)
  const attended = s.attendance.filter((a) => a.status === "Present" || a.status === "Late")
  const missed = s.attendance.filter((a) => a.status === "Absent" || a.status === "Excused")
  const canEdit = can("governance")

  return (
    <div className="space-y-6">
      <PageHeader
        className="no-print"
        breadcrumbs={[{ label: "Minutes", href: "/governance/minutes" }, { label: s.sessionNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Minutes · {s.title} <StatusBadge status={m.status} />
          </span>
        }
        description={`${formatDate(s.date, "EEEE, MMMM d, yyyy")} · ${s.venue}`}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            {canEdit && m.status !== "Approved" && (
              <Button variant="outline" asChild>
                <Link href={`/governance/minutes/${m.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            )}
            {canEdit && m.status === "Draft" && (
              <Button
                onClick={() => {
                  minutesActions.setStatus(m.id, "For Approval")
                  toast.success("Submitted for approval at the next session")
                }}
              >
                <Send /> Submit for approval
              </Button>
            )}
            {can("approve") && m.status === "For Approval" && (
              <Button
                onClick={() => {
                  minutesActions.setStatus(m.id, "Approved")
                  toast.success("Minutes approved")
                }}
              >
                <CheckCircle2 /> Approve minutes
              </Button>
            )}
          </>
        }
      />

      <p className="hidden text-center text-sm font-semibold print:block">
        Barangay {settings.barangayName}, {settings.municipality} · Sangguniang Barangay · Minutes of the {s.title}
      </p>

      <SectionCard title="Session">
        <DetailList
          columns={3}
          items={[
            {
              label: "Session",
              value: (
                <Link href={`/governance/sessions/${s.id}`} className="font-mono hover:underline">
                  {s.sessionNumber}
                </Link>
              ),
            },
            { label: "Presiding officer", value: name(s.presidingOfficerId) },
            { label: "Called to order", value: formatTime(m.callToOrder) },
            { label: "Adjourned", value: m.adjournment ? formatTime(m.adjournment) : undefined },
            { label: "Prepared by", value: name(m.preparedById) },
            { label: "Approved", value: m.approvedAt ? formatDateTime(m.approvedAt) : "Pending" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Attendance" description={`${attended.length} present · ${missed.length} absent or excused`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-1 text-sm">
            {attended.map((a) => (
              <li key={a.officialId}>
                {name(a.officialId)} <span className="text-muted-foreground">· {officials.get(a.officialId)?.position}</span>{" "}
                {a.status === "Late" && <StatusBadge status="Late" className="ml-1" />}
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-sm">
            {missed.map((a) => (
              <li key={a.officialId}>
                {name(a.officialId)} <StatusBadge status={a.status} className="ml-1" />
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="Proceedings">
        <ol className="space-y-4">
          {s.agenda.map((a) => {
            const summary = m.discussions.find((d) => d.agendaItemId === a.id)?.summary
            const motions = s.motions.filter((x) => x.agendaItemId === a.id)
            return (
              <li key={a.id} className="space-y-1">
                <p className="text-sm font-semibold">
                  {a.order}. {a.title}
                </p>
                <p className="text-sm text-muted-foreground">{summary || "No notes recorded."}</p>
                {motions.map((x) => (
                  <p key={x.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                    <StatusBadge status={x.result} /> {x.text}{" "}
                    <span className="text-xs text-muted-foreground">
                      Moved by {name(x.movedById)}
                      {x.secondedById ? `, seconded by ${name(x.secondedById)}` : ""}
                    </span>
                  </p>
                ))}
              </li>
            )
          })}
        </ol>
        {s.decisions.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-sm font-semibold">Decisions</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {s.decisions.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Action items" contentClassName="px-0">
        {m.actionItems.length === 0 ? (
          <EmptyState compact title="No action items" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs">Task</TableHead>
                <TableHead className="text-xs">Responsible</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                <TableHead className="pr-4 text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.actionItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-4 whitespace-normal">{item.task}</TableCell>
                  <TableCell className="whitespace-nowrap">{name(item.responsibleId)}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(item.dueDate)}</TableCell>
                  <TableCell className="pr-4">
                    {canEdit ? (
                      <Select
                        value={item.status}
                        onValueChange={(v) =>
                          minutesActions.update(m.id, {
                            actionItems: m.actionItems.map((x) => (x.id === item.id ? { ...x, status: v as ActionItemStatus } : x)),
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="no-print w-32" aria-label="Action item status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  )
}
