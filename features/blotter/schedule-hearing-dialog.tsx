"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BlotterCase, Hearing } from "@/types"
import { DateField, FormRoot, FormSection, SelectField, TextField, TextareaField } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { formatDate, formatTime, toISODate } from "@/lib/format"
import { blotterActions, simulateLatency } from "@/lib/store/actions"
import { isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z.object({
  date: isoDate("Date").refine((d) => d >= toISODate(new Date()), "Hearing date must be today or later"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the time"),
  venue: requiredText("Venue", 120),
  type: selectRequired("Hearing type"),
  notes: optionalText(300),
})

export function ScheduleHearingDialog({ blotter, open, onOpenChange }: { blotter: BlotterCase; open: boolean; onOpenChange: (o: boolean) => void }) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { date: "", time: "14:00", venue: "Barangay Session Hall", type: "Mediation", notes: "" },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    blotterActions.scheduleHearing(blotter.id, { date: v.date, time: v.time, venue: v.venue, type: v.type as Hearing["type"], notes: v.notes || undefined })
    toast.success("Hearing scheduled", { description: `${formatDate(v.date, "EEE, MMM d")} at ${formatTime(v.time)} · summons to be served to both parties` })
    form.reset()
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule hearing"
      description={`${blotter.blotterNumber} · ${blotter.complainant.name} vs. ${blotter.respondent.name}`}
      formId="hearing-form"
      submitLabel="Schedule"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="hearing-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <DateField name="date" label="Date" required fromYear={new Date().getFullYear()} />
          <TextField name="time" label="Time" type="time" required />
          <SelectField
            name="type"
            label="Proceeding"
            required
            options={[
              { label: "Mediation (Punong Barangay)", value: "Mediation" },
              { label: "Conciliation (Pangkat)", value: "Conciliation" },
              { label: "Arbitration", value: "Arbitration" },
            ]}
          />
          <TextField name="venue" label="Venue" required />
          <TextareaField name="notes" label="Notes" className="sm:col-span-2" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
