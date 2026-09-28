"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Ordinance, Resolution } from "@/types"
import {
  CommitteeSelectField,
  DateField,
  FormRoot,
  FormSection,
  OfficialSelectField,
  SessionSelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useOrdinances, useResolutions } from "@/hooks/use-data"
import { toISODate } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { ordinanceActions, resolutionActions } from "@/lib/store/governance-actions"
import { emptyToUndefined, isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

type Kind = "ordinance" | "resolution"

const nextNumber = (numbers: string[], label: string) => {
  const year = new Date().getFullYear()
  const max = numbers.reduce((m, n) => {
    const match = n.match(new RegExp(`${label} No\\. ${year}-(\\d+)`))
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return `${label} No. ${year}-${String(max + 1).padStart(3, "0")}`
}

/** One form for ordinances and resolutions (same fields; ordinances also track introduction date). */
export function LegislationFormDialog({ kind, open, onOpenChange, record, onSaved }: EntityFormProps<Ordinance | Resolution> & { kind: Kind }) {
  const router = useRouter()
  const ordinances = useOrdinances()
  const resolutions = useResolutions()
  const label = kind === "ordinance" ? "Ordinance" : "Resolution"
  const numbers = kind === "ordinance" ? ordinances.map((o) => o.ordinanceNumber) : resolutions.map((r) => r.resolutionNumber)
  const current = record ? ("ordinanceNumber" in record ? record.ordinanceNumber : record.resolutionNumber) : undefined

  const schema = z.object({
    number: requiredText(`${label} number`, 40).refine((v) => v === current || !numbers.includes(v), `This ${label.toLowerCase()} number already exists`),
    title: requiredText("Title", 240),
    description: optionalText(1200),
    sponsorId: selectRequired("Author / sponsor"),
    committeeId: z.string(),
    sessionId: z.string(),
    dateIntroduced: isoDate("Date introduced"),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      number: current ?? nextNumber(numbers, label),
      title: record?.title ?? "",
      description: record?.description ?? "",
      sponsorId: record?.sponsorId ?? "",
      committeeId: record?.committeeId ?? "",
      sessionId: record?.sessionId ?? "",
      dateIntroduced: (record && "dateIntroduced" in record ? record.dateIntroduced : undefined) ?? toISODate(new Date()),
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const base = {
      title: v.title,
      description: v.description,
      sponsorId: v.sponsorId,
      committeeId: emptyToUndefined(v.committeeId),
      sessionId: emptyToUndefined(v.sessionId),
    }
    let id = record?.id
    if (kind === "ordinance") {
      if (record) ordinanceActions.update(record.id, { ...base, ordinanceNumber: v.number, dateIntroduced: v.dateIntroduced })
      else id = ordinanceActions.create({ ...base, ordinanceNumber: v.number, dateIntroduced: v.dateIntroduced }).id
    } else {
      if (record) resolutionActions.update(record.id, { ...base, resolutionNumber: v.number })
      else id = resolutionActions.create({ ...base, resolutionNumber: v.number }).id
    }
    toast.success(record ? `${label} updated` : `${label} drafted`, {
      description: v.number,
      action: record ? undefined : { label: "Open", onClick: () => router.push(`/governance/${kind}s/${id}`) },
    })
    onOpenChange(false)
    onSaved?.(record ?? ({ id } as Ordinance))
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? `Edit ${current}` : `Draft ${label.toLowerCase()}`}
      formId="legislation-form"
      submitLabel={record ? "Save changes" : `Save draft`}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="legislation-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="number" label={`${label} number`} required />
          {kind === "ordinance" ? <DateField name="dateIntroduced" label="Date introduced" required /> : <div />}
          <TextareaField
            name="title"
            label="Title"
            required
            className="sm:col-span-2"
            rows={2}
            placeholder={kind === "ordinance" ? "An Ordinance …" : "Resolution …"}
          />
          <TextareaField name="description" label="Description / summary" className="sm:col-span-2" rows={4} />
          <OfficialSelectField name="sponsorId" label="Author / sponsor" required />
          <CommitteeSelectField name="committeeId" label="Committee" />
          <SessionSelectField
            name="sessionId"
            label="Related session"
            className="sm:col-span-2"
            description="The session where the measure is calendared or acted upon."
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
