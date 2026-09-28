"use client"

import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Incident, IncidentSeverity, IncidentType } from "@/types"
import { DateField, FormRoot, FormSection, MarkdownField, OfficialSelectField, SelectField, TextField, TextareaField } from "@/components/forms"
import { SectionCard } from "@/components/shared/section-card"
import { useSettings } from "@/hooks/use-data"
import { INCIDENT_SEVERITIES, toOptions } from "@/lib/constants"
import { toISODate } from "@/lib/format"
import { incidentActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

export const incidentSchema = z.object({
  date: isoDate("Date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the time"),
  location: requiredText("Location", 160),
  purok: z.string(),
  type: selectRequired("Incident type"),
  severity: selectRequired("Severity"),
  description: requiredText("Description", 3000).min(20, "Describe the incident (at least 20 characters)"),
  personsInvolved: optionalText(600),
  reportedBy: requiredText("Reported by", 100),
  assignedOfficerId: z.string(),
})

export type IncidentFormValues = z.input<typeof incidentSchema>

export function incidentFormDefaults(record?: Incident): IncidentFormValues {
  return {
    date: record?.date ?? toISODate(new Date()),
    time: record?.time ?? "",
    location: record?.location ?? "",
    purok: record?.purok ?? "",
    type: record?.type ?? "",
    severity: record?.severity ?? "Low",
    description: record?.description ?? "",
    personsInvolved: record?.personsInvolved.join("\n") ?? "",
    reportedBy: record?.reportedBy ?? "",
    assignedOfficerId: record?.assignedOfficerId ?? "",
  }
}

/** Builds the mutation payload from validated form output. Shared by the create and edit pages. */
export function toIncidentPayload(v: z.output<typeof incidentSchema>) {
  return {
    date: v.date,
    time: v.time,
    location: v.location,
    purok: emptyToUndefined(v.purok),
    type: v.type as IncidentType,
    severity: v.severity as IncidentSeverity,
    description: v.description,
    personsInvolved: v.personsInvolved
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    reportedBy: v.reportedBy,
    assignedOfficerId: emptyToUndefined(v.assignedOfficerId),
  }
}

export function useIncidentForm(record?: Incident) {
  return useForm({ resolver: zodResolver(incidentSchema), mode: "onTouched", defaultValues: incidentFormDefaults(record) })
}

/**
 * Presentational field layout, shared by the create and edit pages. Callers own the
 * surrounding page chrome (header, actions, submit) and the RHF instance/handleSubmit.
 */
export function IncidentFormFields({
  form,
  formId,
  onSubmit,
}: {
  form: UseFormReturn<IncidentFormValues>
  formId: string
  onSubmit: (v: z.output<typeof incidentSchema>) => void
}) {
  const settings = useSettings()

  return (
    <FormRoot id={formId} form={form} onSubmit={onSubmit}>
      <SectionCard>
        <FormSection title="Incident details">
          <SelectField name="type" label="Incident type" required options={toOptions(settings.incidentTypes)} />
          <SelectField name="severity" label="Severity" required options={toOptions(INCIDENT_SEVERITIES)} />
          <DateField name="date" label="Date" required disableFuture />
          <TextField name="time" label="Time" type="time" required />
          <TextField name="location" label="Location" required placeholder="e.g. Corner Rizal St. & Burgos St." className="sm:col-span-2" />
          <SelectField name="purok" label="Purok" options={settings.puroks.map((p) => ({ label: p.name, value: p.name }))} />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Description" description="Supports Markdown — headings, lists, bold text and links." columns={1}>
          <MarkdownField name="description" label="Description" required rows={8} placeholder="What happened? Include relevant details such as sequence of events, damages, or injuries." />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="People">
          <TextareaField name="personsInvolved" label="Persons involved" className="sm:col-span-2" rows={2} description="One per line." />
          <TextField name="reportedBy" label="Reported by" required />
          <OfficialSelectField name="assignedOfficerId" label="Assigned officer" />
        </FormSection>
      </SectionCard>
    </FormRoot>
  )
}

/** Form instance + submit handler for the create-incident page. */
export function useIncidentCreateForm(onSaved: (record: Incident) => void) {
  const form = useIncidentForm()

  const onSubmit = async (v: z.output<typeof incidentSchema>) => {
    await simulateLatency()
    const created = incidentActions.create(toIncidentPayload(v))
    toast.success("Incident recorded", { description: `${created.incidentNumber} · ${created.type}` })
    onSaved(created)
  }

  return { form, onSubmit }
}

/** Form instance + submit handler for the edit-incident page. */
export function useIncidentEditForm(record: Incident, onSaved: (record: Incident) => void) {
  const form = useIncidentForm(record)

  const onSubmit = async (v: z.output<typeof incidentSchema>) => {
    await simulateLatency()
    const payload = toIncidentPayload(v)
    incidentActions.update(record.id, payload)
    toast.success("Incident updated", { description: record.incidentNumber })
    onSaved({ ...record, ...payload })
  }

  return { form, onSubmit }
}
