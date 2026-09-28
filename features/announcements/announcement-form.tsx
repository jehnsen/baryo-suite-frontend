"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Announcement, AnnouncementAudience, AnnouncementCategory } from "@/types"
import { DateField, FormRoot, FormSection, MultiSelectField, SelectField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useSettings } from "@/hooks/use-data"
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_CATEGORIES, toOptions } from "@/lib/constants"
import { toISODate } from "@/lib/format"
import { announcementActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, isoDate, optionalIsoDate, requiredText, selectRequired } from "@/lib/validation"

const schema = z
  .object({
    title: requiredText("Title", 140),
    description: requiredText("Description", 3000),
    category: selectRequired("Category"),
    audience: selectRequired("Audience"),
    puroks: z.array(z.string()),
    publishDate: isoDate("Publish date"),
    expirationDate: optionalIsoDate,
    status: z.enum(["Draft", "Published"]),
  })
  .refine((v) => v.audience !== "Selected Purok" || v.puroks.length > 0, { path: ["puroks"], message: "Select at least one purok" })
  .refine((v) => !v.expirationDate || v.expirationDate >= v.publishDate, { path: ["expirationDate"], message: "Expiration must be after the publish date" })

export function AnnouncementFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<Announcement>) {
  const settings = useSettings()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      title: record?.title ?? "",
      description: record?.description ?? "",
      category: record?.category ?? "",
      audience: record?.audience ?? "All Residents",
      puroks: record?.puroks ?? [],
      publishDate: record?.publishDate ?? toISODate(new Date()),
      expirationDate: record?.expirationDate ?? "",
      status: (record?.status === "Published" ? "Published" : "Draft") as "Draft" | "Published",
    },
  })
  const audience = useWatch({ control: form.control, name: "audience" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      title: v.title,
      description: v.description,
      category: v.category as AnnouncementCategory,
      audience: v.audience as AnnouncementAudience,
      puroks: v.audience === "Selected Purok" ? v.puroks : undefined,
      publishDate: v.publishDate,
      expirationDate: emptyToUndefined(v.expirationDate),
      status: v.status,
    }
    if (record) {
      announcementActions.update(record.id, payload)
      toast.success("Announcement updated")
      onSaved?.({ ...record, ...payload })
    } else {
      const created = announcementActions.create(payload)
      toast.success(v.status === "Published" ? "Announcement published" : "Draft saved", { description: created.title })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? "Edit announcement" : "New announcement"}
      description="Post advisories and notices for residents."
      formId="announcement-form"
      submitLabel={record ? "Save changes" : "Save announcement"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="announcement-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="title" label="Title" required className="sm:col-span-2" />
          <TextareaField name="description" label="Description" required className="sm:col-span-2" rows={5} />
          <SelectField name="category" label="Category" required options={toOptions(ANNOUNCEMENT_CATEGORIES)} />
          <SelectField name="audience" label="Audience" required options={toOptions(ANNOUNCEMENT_AUDIENCES)} />
          {audience === "Selected Purok" && (
            <MultiSelectField
              name="puroks"
              label="Puroks"
              required
              className="sm:col-span-2"
              options={settings.puroks.map((p) => ({ label: p.name, value: p.name }))}
            />
          )}
          <DateField name="publishDate" label="Publish date" required />
          <DateField name="expirationDate" label="Expiration date" />
          <SelectField
            name="status"
            label="Status"
            required
            options={[
              { label: "Draft", value: "Draft" },
              { label: "Published", value: "Published" },
            ]}
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
