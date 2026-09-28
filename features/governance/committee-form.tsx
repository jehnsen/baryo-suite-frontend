"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Committee } from "@/types"
import {
  FormRoot,
  FormSection,
  OfficialMultiSelectField,
  OfficialSelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { simulateLatency } from "@/lib/store/actions"
import { committeeActions } from "@/lib/store/governance-actions"
import { emptyToUndefined, requiredText, selectRequired } from "@/lib/validation"

const schema = z
  .object({
    name: requiredText("Committee name", 120),
    chairpersonId: selectRequired("Chairperson"),
    viceChairId: z.string(),
    memberIds: z.array(z.string()),
    responsibilities: requiredText("Responsibilities", 1200),
    status: z.enum(["Active", "Inactive"]),
  })
  .refine((v) => v.viceChairId !== v.chairpersonId, { path: ["viceChairId"], message: "Vice chair must differ from the chairperson" })

/** Members are picked from the Officials module. */
export function CommitteeFormDialog({ open, onOpenChange, record }: EntityFormProps<Committee>) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: record?.name ?? "Committee on ",
      chairpersonId: record?.chairpersonId ?? "",
      viceChairId: record?.viceChairId ?? "",
      memberIds: record?.memberIds ?? [],
      responsibilities: record?.responsibilities.join("\n") ?? "",
      status: (record?.status ?? "Active") as "Active" | "Inactive",
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      name: v.name,
      chairpersonId: v.chairpersonId,
      viceChairId: emptyToUndefined(v.viceChairId),
      memberIds: v.memberIds.filter((m) => m !== v.chairpersonId && m !== v.viceChairId),
      responsibilities: v.responsibilities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      status: v.status,
    }
    if (record) committeeActions.update(record.id, payload)
    else committeeActions.create(payload)
    toast.success(record ? "Committee updated" : "Committee created", { description: v.name })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit committee" : "New committee"}
      formId="committee-form"
      submitLabel="Save committee"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="committee-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="name" label="Committee name" required className="sm:col-span-2" />
          <OfficialSelectField name="chairpersonId" label="Chairperson" required />
          <OfficialSelectField name="viceChairId" label="Vice chair" />
          <OfficialMultiSelectField name="memberIds" label="Members" className="sm:col-span-2" />
          <TextareaField name="responsibilities" label="Responsibilities" required className="sm:col-span-2" rows={4} description="One per line." />
          <SelectField
            name="status"
            label="Status"
            required
            options={[
              { label: "Active", value: "Active" },
              { label: "Inactive", value: "Inactive" },
            ]}
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
