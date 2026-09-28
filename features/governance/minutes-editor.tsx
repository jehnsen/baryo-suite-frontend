"use client"

import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ActionItemStatus, MeetingMinutes } from "@/types"
import { Button } from "@/components/ui/button"
import { DateField, FormRoot, OfficialSelectField, SelectField, TextField, TextareaField } from "@/components/forms"
import { EmptyState } from "@/components/shared/empty-state"
import { FormActionBar } from "@/components/shared/form-action-bar"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useCurrentUser, useLookups, useMinutes } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { simulateLatency } from "@/lib/store/actions"
import { newId } from "@/lib/store/helpers"
import { minutesActions } from "@/lib/store/governance-actions"
import { isoDate, requiredText, selectRequired } from "@/lib/validation"

const time = z.string().regex(/^(\d{2}:\d{2})?$/, "Enter a time")
const schema = z.object({
  callToOrder: time,
  adjournment: time,
  discussions: z.array(z.object({ agendaItemId: z.string(), summary: z.string().max(3000) })),
  actionItems: z.array(
    z.object({
      id: z.string(),
      task: requiredText("Task", 300),
      responsibleId: selectRequired("Responsible person"),
      dueDate: isoDate("Due date"),
      status: z.enum(["Open", "In Progress", "Done"]),
    }),
  ),
})

export function MinutesEditor({ id }: { id: string }) {
  const load = usePageLoad()
  const minutes = useMinutes().find((m) => m.id === id)
  const { can, role } = useCurrentUser()
  if (!can("governance")) return <EmptyState icon={Lock} title={`Editing minutes is not available for ${role}`} className="py-24" />
  return (
    <LoadState load={load}>
      {minutes ? <Editor m={minutes} /> : <RecordNotFound entity="Minutes" backHref="/governance/minutes" backLabel="Back to minutes" />}
    </LoadState>
  )
}

function Editor({ m }: { m: MeetingMinutes }) {
  const router = useRouter()
  const { sessions } = useLookups()
  const s = sessions.get(m.sessionId)
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      callToOrder: m.callToOrder,
      adjournment: m.adjournment,
      discussions: (s?.agenda ?? []).map((a) => ({ agendaItemId: a.id, summary: m.discussions.find((d) => d.agendaItemId === a.id)?.summary ?? "" })),
      actionItems: m.actionItems.map((a) => ({ ...a })),
    },
  })
  const items = useFieldArray({ control: form.control, name: "actionItems" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    minutesActions.update(m.id, {
      callToOrder: v.callToOrder,
      adjournment: v.adjournment,
      discussions: v.discussions,
      actionItems: v.actionItems.map((a) => ({ ...a, status: a.status as ActionItemStatus })),
    })
    toast.success("Minutes saved")
    router.push(`/governance/minutes/${m.id}`)
  }

  if (!s) return <RecordNotFound entity="Session" backHref="/governance/minutes" backLabel="Back to minutes" />
  const formId = "minutes-form"
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <PageHeader
        title={`Minutes · ${s.title}`}
        description={`${s.sessionNumber} · attendance, agenda and motions come from the session record.`}
        breadcrumbs={[{ label: "Minutes", href: "/governance/minutes" }, { label: s.sessionNumber, href: `/governance/minutes/${m.id}` }, { label: "Edit" }]}
      />
      <FormRoot id={formId} form={form} onSubmit={onSubmit}>
        <SectionCard title="Times">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="callToOrder" label="Called to order" type="time" />
            <TextField name="adjournment" label="Adjourned" type="time" />
          </div>
        </SectionCard>
        <SectionCard title="Discussions" description="One section per agenda item.">
          <div className="space-y-4">
            {s.agenda.map((a, i) => (
              <TextareaField key={a.id} name={`discussions.${i}.summary`} label={`${a.order}. ${a.title}`} rows={3} placeholder="Summary of the discussion" />
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Action items"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => items.append({ id: newId("ai"), task: "", responsibleId: "", dueDate: "", status: "Open" })}
            >
              <Plus /> Add action item
            </Button>
          }
        >
          {items.fields.length === 0 && <p className="text-sm text-muted-foreground">No action items.</p>}
          <ul className="space-y-3">
            {items.fields.map((field, i) => (
              <li key={field.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField name={`actionItems.${i}.task`} label="Task" required className="sm:col-span-3" />
                  <OfficialSelectField name={`actionItems.${i}.responsibleId`} label="Responsible" required />
                  <DateField name={`actionItems.${i}.dueDate`} label="Due date" required />
                  <SelectField
                    name={`actionItems.${i}.status`}
                    label="Status"
                    required
                    options={["Open", "In Progress", "Done"].map((x) => ({ label: x, value: x }))}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon-sm" className="sm:mt-6" onClick={() => items.remove(i)} aria-label="Remove action item">
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </FormRoot>
      <FormActionBar
        formId={formId}
        submitLabel="Save minutes"
        isSubmitting={form.formState.isSubmitting}
        onCancel={() => router.push(`/governance/minutes/${m.id}`)}
      />
    </div>
  )
}
