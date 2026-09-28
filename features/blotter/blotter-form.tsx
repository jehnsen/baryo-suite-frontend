"use client"

import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BlotterCase, BlotterIncidentType, CaseParty, Resident } from "@/types"
import {
  DateField,
  FileField,
  FormRoot,
  FormSection,
  OfficialSelectField,
  PhoneField,
  ResidentSelectField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDrawer } from "@/components/shared/form-drawer"
import { useLookups } from "@/hooks/use-data"
import { BLOTTER_INCIDENT_TYPES, toOptions } from "@/lib/constants"
import { formatAddress, fullName, toISODate } from "@/lib/format"
import { blotterActions, incidentActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, isoDate, optionalText, phMobile, requiredText, selectRequired } from "@/lib/validation"

const partySchema = z
  .object({
    isResident: z.boolean(),
    residentId: z.string(),
    name: optionalText(100),
    address: optionalText(160),
    contactNumber: phMobile,
  })
  .superRefine((p, ctx) => {
    if (p.isResident && !p.residentId) ctx.addIssue({ code: "custom", path: ["residentId"], message: "Select a resident" })
    if (!p.isResident && !p.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" })
  })

const schema = z.object({
  date: isoDate("Date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the time"),
  location: requiredText("Location", 160),
  incidentType: selectRequired("Incident type"),
  complainant: partySchema,
  respondent: partySchema,
  witnesses: optionalText(500),
  narrative: requiredText("Narrative", 4000).min(30, "Narrative should describe what happened (at least 30 characters)"),
  assignedOfficerId: selectRequired("Assigned officer"),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
})

type PartyValues = z.input<typeof partySchema>

const partyDefaults = (p?: CaseParty): PartyValues => ({
  isResident: p ? Boolean(p.residentId) : true,
  residentId: p?.residentId ?? "",
  name: p?.residentId ? "" : (p?.name ?? ""),
  address: p?.residentId ? "" : (p?.address ?? ""),
  contactNumber: p?.residentId ? "" : (p?.contactNumber ?? ""),
})

function PartyFields({ prefix, label }: { prefix: "complainant" | "respondent"; label: string }) {
  const isResident = useWatch({ name: `${prefix}.isResident` }) as boolean
  return (
    <FormSection title={label}>
      <SwitchField
        name={`${prefix}.isResident`}
        label="Registered resident"
        description="Turn off for non-residents or unknown persons."
        className="sm:col-span-2"
      />
      {isResident ? (
        <ResidentSelectField name={`${prefix}.residentId`} label={`${label} (resident)`} required className="sm:col-span-2" />
      ) : (
        <>
          <TextField name={`${prefix}.name`} label="Full name" required />
          <PhoneField name={`${prefix}.contactNumber`} />
          <TextField name={`${prefix}.address`} label="Address" className="sm:col-span-2" />
        </>
      )}
    </FormSection>
  )
}

export interface BlotterDefaults {
  incidentId?: string
  date?: string
  time?: string
  location?: string
  narrative?: string
}

export function BlotterFormDrawer({ open, onOpenChange, record, defaults, onSaved }: EntityFormProps<BlotterCase, BlotterDefaults>) {
  const router = useRouter()
  const { residents } = useLookups()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      date: record?.date ?? defaults?.date ?? toISODate(new Date()),
      time: record?.time ?? defaults?.time ?? "",
      location: record?.location ?? defaults?.location ?? "",
      incidentType: record?.incidentType ?? "",
      complainant: partyDefaults(record?.complainant),
      respondent: partyDefaults(record?.respondent),
      witnesses: record?.witnesses.map((w) => w.name).join("\n") ?? "",
      narrative: record?.narrative ?? defaults?.narrative ?? "",
      assignedOfficerId: record?.assignedOfficerId ?? "",
      attachments: record?.attachments.map(({ id, name, size, type }) => ({ id, name, size, type })) ?? [],
    },
  })

  const toParty = (p: z.output<typeof partySchema>): CaseParty => {
    if (p.isResident) {
      const r = residents.get(p.residentId) as Resident
      return { residentId: r.id, name: fullName(r), address: formatAddress(r.address), contactNumber: r.contactNumber }
    }
    return { name: p.name, address: emptyToUndefined(p.address), contactNumber: emptyToUndefined(p.contactNumber) }
  }

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      date: v.date,
      time: v.time,
      location: v.location,
      incidentType: v.incidentType as BlotterIncidentType,
      complainant: toParty(v.complainant),
      respondent: toParty(v.respondent),
      witnesses: v.witnesses
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      narrative: v.narrative,
      assignedOfficerId: v.assignedOfficerId,
      attachments: v.attachments.map((a) => ({ ...a, uploadedAt: new Date().toISOString() })),
    }
    if (record) {
      blotterActions.update(record.id, payload)
      toast.success("Case updated", { description: record.blotterNumber })
      onSaved?.({ ...record, ...payload })
    } else {
      const created = blotterActions.create({ ...payload, incidentId: defaults?.incidentId })
      if (defaults?.incidentId) incidentActions.linkBlotter(defaults.incidentId, created.id)
      toast.success("Blotter entry recorded", {
        description: `${created.blotterNumber} · ${created.incidentType}`,
        action: { label: "Open case", onClick: () => router.push(`/blotter/${created.id}`) },
      })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.blotterNumber}` : "New blotter entry"}
      description="Record a complaint in the barangay blotter (Katarungang Pambarangay)."
      formId="blotter-form"
      submitLabel={record ? "Save changes" : "Record entry"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="blotter-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Incident">
          <DateField name="date" label="Date of incident" required disableFuture />
          <TextField name="time" label="Time" type="time" required />
          <TextField name="location" label="Location" required className="sm:col-span-2" placeholder="e.g. Sampaguita St., Purok 5" />
          <SelectField name="incidentType" label="Nature of complaint" required options={toOptions(BLOTTER_INCIDENT_TYPES)} />
          <OfficialSelectField name="assignedOfficerId" label="Assigned officer" required />
        </FormSection>
        <PartyFields prefix="complainant" label="Complainant" />
        <PartyFields prefix="respondent" label="Respondent" />
        <FormSection title="Statement" columns={1}>
          <TextareaField name="witnesses" label="Witnesses" rows={2} description="One name per line." />
          <TextareaField name="narrative" label="Narrative" required rows={6} placeholder="Describe what happened, in the complainant's words." />
          <FileField name="attachments" label="Attachments" description="Photos, medico-legal certificates, receipts (PDF, JPG, PNG)." />
        </FormSection>
      </FormRoot>
    </FormDrawer>
  )
}
