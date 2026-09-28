"use client"

import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AgendaItemType, BarangaySession, SessionType } from "@/types"
import { Button } from "@/components/ui/button"
import { DateField, FormRoot, FormSection, OfficialSelectField, SelectField, TextField } from "@/components/forms"
import { EmptyState } from "@/components/shared/empty-state"
import { FormActionBar } from "@/components/shared/form-action-bar"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useCurrentUser, useSessions, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { AGENDA_ITEM_TYPES, SESSION_TYPES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { newId } from "@/lib/store/helpers"
import { barangaySessionActions } from "@/lib/store/governance-actions"
import { isoDate, requiredText, selectRequired } from "@/lib/validation"

const schema = z.object({
  sessionNumber: requiredText("Session number", 20),
  title: requiredText("Title", 140),
  type: selectRequired("Session type"),
  date: isoDate("Date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the time"),
  venue: requiredText("Venue", 120),
  presidingOfficerId: selectRequired("Presiding officer"),
  agenda: z
    .array(z.object({ id: z.string(), title: requiredText("Agenda item", 240), type: selectRequired("Type"), presenterId: z.string() }))
    .min(1, "Add at least one agenda item"),
})

const DEFAULT_AGENDA = [
  { title: "Call to order, invocation and roll call", type: "Preliminaries" },
  { title: "Reading and approval of the minutes of the previous session", type: "Preliminaries" },
  { title: "Treasurer's report", type: "Budget" },
  { title: "Committee reports", type: "Report" },
  { title: "Other matters", type: "Other Matters" },
]

export function SessionFormPage({ id }: { id?: string }) {
  const load = usePageLoad(id ? 380 : 0)
  const session = useSessions().find((s) => s.id === id)
  const { can, role } = useCurrentUser()
  if (!can("governance")) return <EmptyState icon={Lock} title={`Scheduling sessions is not available for ${role}`} className="py-24" />
  if (!id) return <SessionForm />
  return (
    <LoadState load={load}>
      {session ? <SessionForm session={session} /> : <RecordNotFound entity="Session" backHref="/governance/sessions" backLabel="Back to sessions" />}
    </LoadState>
  )
}

function SessionForm({ session }: { session?: BarangaySession }) {
  const router = useRouter()
  const sessions = useSessions()
  const settings = useSettings()
  const regularCount = sessions.filter((s) => s.type === "Regular" && s.sessionNumber.startsWith(`RS-${new Date().getFullYear()}`)).length
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      sessionNumber: session?.sessionNumber ?? `RS-${new Date().getFullYear()}-${String(regularCount + 1).padStart(2, "0")}`,
      title: session?.title ?? `${regularCount + 1}th Regular Session`,
      type: session?.type ?? "Regular",
      date: session?.date ?? "",
      time: session?.time ?? "14:00",
      venue: session?.venue ?? "Barangay Session Hall",
      presidingOfficerId: session?.presidingOfficerId ?? settings.punongBarangayId,
      agenda:
        session?.agenda.map((a) => ({ id: a.id, title: a.title, type: a.type, presenterId: a.presenterId ?? "" })) ??
        DEFAULT_AGENDA.map((a) => ({ ...a, id: newId("ag"), presenterId: "" })),
    },
  })
  const agenda = useFieldArray({ control: form.control, name: "agenda" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      sessionNumber: v.sessionNumber,
      title: v.title,
      type: v.type as SessionType,
      date: v.date,
      time: v.time,
      venue: v.venue,
      presidingOfficerId: v.presidingOfficerId,
      agenda: v.agenda.map((a, i) => ({ id: a.id, order: i + 1, title: a.title, type: a.type as AgendaItemType, presenterId: a.presenterId || undefined })),
    }
    if (session) {
      barangaySessionActions.update(session.id, payload)
      toast.success("Session updated", { description: v.sessionNumber })
      router.push(`/governance/sessions/${session.id}`)
    } else {
      const created = barangaySessionActions.create({ ...payload, attendance: [] })
      toast.success("Session scheduled", { description: `${v.sessionNumber} · notices to be served to members` })
      router.push(`/governance/sessions/${created.id}`)
    }
  }

  const formId = "session-form"
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <PageHeader
        title={session ? `Edit ${session.sessionNumber}` : "Schedule session"}
        description="Regular sessions are held at least twice a month (Sec. 391, Local Government Code)."
        breadcrumbs={[{ label: "Sessions", href: "/governance/sessions" }, { label: session ? session.sessionNumber : "Schedule" }]}
      />
      <FormRoot id={formId} form={form} onSubmit={onSubmit}>
        <SectionCard title="Session details">
          <FormSection>
            <TextField name="sessionNumber" label="Session number" required />
            <SelectField name="type" label="Session type" required options={toOptions(SESSION_TYPES)} />
            <TextField name="title" label="Title" required className="sm:col-span-2" />
            <DateField name="date" label="Date" required />
            <TextField name="time" label="Time" type="time" required />
            <TextField name="venue" label="Venue" required />
            <OfficialSelectField name="presidingOfficerId" label="Presiding officer" required />
          </FormSection>
        </SectionCard>
        <SectionCard
          title="Order of business"
          description="Agenda items in the order they will be taken up."
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => agenda.append({ id: newId("ag"), title: "", type: "Legislation", presenterId: "" })}
            >
              <Plus /> Add item
            </Button>
          }
        >
          {form.formState.errors.agenda?.root && <p className="mb-2 text-sm text-destructive">{form.formState.errors.agenda.root.message}</p>}
          <ol className="space-y-3">
            {agenda.fields.map((field, i) => (
              <li key={field.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[2rem_1fr_10rem_auto] sm:items-start">
                <span className="pt-7 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}.</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField name={`agenda.${i}.title`} label="Agenda item" required className="sm:col-span-2" />
                  <OfficialSelectField name={`agenda.${i}.presenterId`} label="Presenter" className="sm:col-span-2" />
                </div>
                <SelectField name={`agenda.${i}.type`} label="Type" required options={toOptions(AGENDA_ITEM_TYPES)} />
                <div className="flex gap-1 pt-6">
                  <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => agenda.move(i, i - 1)} aria-label="Move up">
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === agenda.fields.length - 1}
                    onClick={() => agenda.move(i, i + 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => agenda.remove(i)} aria-label="Remove item">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </FormRoot>
      <FormActionBar
        formId={formId}
        submitLabel={session ? "Save changes" : "Schedule session"}
        isSubmitting={form.formState.isSubmitting}
        onCancel={() => router.push(session ? `/governance/sessions/${session.id}` : "/governance/sessions")}
      />
    </div>
  )
}
