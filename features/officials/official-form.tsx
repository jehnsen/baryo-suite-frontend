"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BarangayOfficial, OfficialPosition, OfficialStatus } from "@/types"
import { DateField, FileField, FormRoot, FormSection, PhoneField, SelectField, TextField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { OFFICIAL_POSITIONS, OFFICIAL_STATUSES, toOptions } from "@/lib/constants"
import { fullName } from "@/lib/format"
import { officialActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, isoDate, optionalEmail, optionalText, requiredPhMobile, requiredText, selectRequired } from "@/lib/validation"

const schema = z
  .object({
    firstName: requiredText("First name", 60),
    middleName: optionalText(60),
    lastName: requiredText("Last name", 60),
    position: selectRequired("Position"),
    committee: optionalText(100),
    contactNumber: requiredPhMobile,
    email: optionalEmail,
    termStart: isoDate("Term start"),
    termEnd: isoDate("Term end"),
    status: selectRequired("Status"),
    photo: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
  })
  .refine((v) => v.termEnd > v.termStart, { path: ["termEnd"], message: "Term end must be after term start" })

export function OfficialFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<BarangayOfficial>) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      firstName: record?.firstName ?? "",
      middleName: record?.middleName ?? "",
      lastName: record?.lastName ?? "",
      position: record?.position ?? "",
      committee: record?.committee ?? "",
      contactNumber: record?.contactNumber ?? "",
      email: record?.email ?? "",
      termStart: record?.termStart ?? "2023-11-30",
      termEnd: record?.termEnd ?? "2026-11-30",
      status: record?.status ?? "Active",
      photo: [],
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      firstName: v.firstName,
      middleName: emptyToUndefined(v.middleName),
      lastName: v.lastName,
      position: v.position as OfficialPosition,
      committee: emptyToUndefined(v.committee),
      contactNumber: v.contactNumber,
      email: emptyToUndefined(v.email),
      termStart: v.termStart,
      termEnd: v.termEnd,
      status: v.status as OfficialStatus,
    }
    if (record) {
      officialActions.update(record.id, payload)
      toast.success("Official updated", { description: fullName(payload) })
      onSaved?.({ ...record, ...payload })
    } else {
      const created = officialActions.create(payload)
      toast.success("Official added", { description: `${fullName(created)} · ${created.position}` })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? "Edit official" : "Add official"}
      formId="official-form"
      submitLabel={record ? "Save changes" : "Add official"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="official-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Profile">
          <TextField name="firstName" label="First name" required />
          <TextField name="middleName" label="Middle name" />
          <TextField name="lastName" label="Last name" required />
          <SelectField name="position" label="Position" required options={toOptions(OFFICIAL_POSITIONS)} />
          <TextField name="committee" label="Committee / Assignment" className="sm:col-span-2" placeholder="e.g. Health and Sanitation" />
          <PhoneField name="contactNumber" required />
          <TextField name="email" label="Email" type="email" />
        </FormSection>
        <FormSection title="Term">
          <DateField name="termStart" label="Term start" required />
          <DateField name="termEnd" label="Term end" required />
          <SelectField name="status" label="Status" required options={toOptions(OFFICIAL_STATUSES)} />
        </FormSection>
        <FormSection columns={1}>
          <FileField name="photo" label="Photo" accept="image/*" multiple={false} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
