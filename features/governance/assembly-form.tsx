"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BarangayAssembly } from "@/types"
import { DateField, FormRoot, FormSection, SelectField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { ASSEMBLY_STATUSES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { assemblyActions } from "@/lib/store/governance-actions"
import { emptyToUndefined, isoDate, optionalText, requiredText } from "@/lib/validation"

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)

const schema = z
  .object({
    title: requiredText("Title", 140),
    date: isoDate("Date"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the time"),
    venue: requiredText("Venue", 120),
    agenda: requiredText("Agenda", 1500),
    status: z.enum(["Scheduled", "Completed", "Cancelled"]),
    attendanceCount: z.string().regex(/^\d*$/, "Enter a number"),
    householdsRepresented: z.string().regex(/^\d*$/, "Enter a number"),
    topics: optionalText(1500),
    decisions: optionalText(1500),
    minutesSummary: optionalText(3000),
  })
  .refine((v) => v.status !== "Completed" || Number(v.attendanceCount) > 0, { path: ["attendanceCount"], message: "Record the attendance count" })

export function AssemblyFormDialog({ open, onOpenChange, record }: EntityFormProps<BarangayAssembly>) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      title: record?.title ?? "",
      date: record?.date ?? "",
      time: record?.time ?? "13:00",
      venue: record?.venue ?? "Barangay Covered Court",
      agenda: record?.agenda.join("\n") ?? "State of the Barangay Address\nFinancial report\nOpen forum",
      status: (record?.status ?? "Scheduled") as BarangayAssembly["status"],
      attendanceCount: record?.attendanceCount ? String(record.attendanceCount) : "",
      householdsRepresented: record?.householdsRepresented ? String(record.householdsRepresented) : "",
      topics: record?.topics.join("\n") ?? "",
      decisions: record?.decisions.join("\n") ?? "",
      minutesSummary: record?.minutesSummary ?? "",
    },
  })
  const status = useWatch({ control: form.control, name: "status" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      title: v.title,
      date: v.date,
      time: v.time,
      venue: v.venue,
      agenda: lines(v.agenda),
      status: v.status,
      attendanceCount: Number(v.attendanceCount || 0),
      householdsRepresented: v.householdsRepresented ? Number(v.householdsRepresented) : undefined,
      topics: lines(v.topics),
      decisions: lines(v.decisions),
      minutesSummary: emptyToUndefined(v.minutesSummary),
    }
    if (record) assemblyActions.update(record.id, payload)
    else assemblyActions.create(payload)
    toast.success(record ? "Assembly updated" : "Assembly scheduled", { description: v.title })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? "Update assembly" : "Schedule barangay assembly"}
      formId="assembly-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="assembly-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="title" label="Assembly title" required className="sm:col-span-2" placeholder="Second Semester Barangay Assembly 2026" />
          <DateField name="date" label="Date" required />
          <TextField name="time" label="Time" type="time" required />
          <TextField name="venue" label="Venue" required />
          <SelectField name="status" label="Status" required options={toOptions(ASSEMBLY_STATUSES)} />
          <TextareaField name="agenda" label="Agenda" required className="sm:col-span-2" rows={4} description="One item per line." />
        </FormSection>
        {status === "Completed" && (
          <FormSection title="Results and documentation">
            <TextField name="attendanceCount" label="Attendance count" required type="number" />
            <TextField name="householdsRepresented" label="Households represented" type="number" />
            <TextareaField name="topics" label="Topics discussed" className="sm:col-span-2" rows={3} description="One per line." />
            <TextareaField name="decisions" label="Resolutions / decisions" className="sm:col-span-2" rows={3} description="One per line." />
            <TextareaField name="minutesSummary" label="Minutes summary" className="sm:col-span-2" rows={4} />
          </FormSection>
        )}
      </FormRoot>
    </FormDialog>
  )
}
