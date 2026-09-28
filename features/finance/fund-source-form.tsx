"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { FundSource, FundSourceType } from "@/types"
import { DateField, FormRoot, FormSection, MoneyField, SelectField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useFiscalYear } from "@/hooks/use-finance"
import { FUND_SOURCE_TYPES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { fundSourceActions } from "@/lib/store/finance-actions"
import { isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z.object({
  name: requiredText("Name", 120),
  type: selectRequired("Source type"),
  description: optionalText(400),
  amount: z.number({ error: "Enter the amount" }).positive("Must be greater than zero"),
  fiscalYear: z.string().regex(/^20\d{2}$/, "Invalid fiscal year"),
  dateReceived: isoDate("Date received"),
  referenceNumber: requiredText("Reference number", 60),
})

export function FundSourceFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<FundSource>) {
  const { fiscalYear } = useFiscalYear()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: record?.name ?? "",
      type: record?.type ?? "",
      description: record?.description ?? "",
      amount: record?.amount ?? 0,
      fiscalYear: String(record?.fiscalYear ?? fiscalYear),
      dateReceived: record?.dateReceived ?? "",
      referenceNumber: record?.referenceNumber ?? "",
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = { ...v, type: v.type as FundSourceType, fiscalYear: Number(v.fiscalYear) }
    if (record) {
      fundSourceActions.update(record.id, payload)
      onSaved?.({ ...record, ...payload })
    } else onSaved?.(fundSourceActions.create(payload))
    toast.success(record ? "Fund source updated" : "Fund source recorded", { description: v.name })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit fund source" : "Record fund source"}
      formId="fund-source-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="fund-source-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="name" label="Fund source" required className="sm:col-span-2" placeholder="e.g. National Tax Allotment FY 2027" />
          <SelectField name="type" label="Type" required options={toOptions(FUND_SOURCE_TYPES)} />
          <MoneyField name="amount" label="Amount" required />
          <TextField name="fiscalYear" label="Fiscal year" required type="number" />
          <DateField name="dateReceived" label="Date received" required />
          <TextField name="referenceNumber" label="Reference number" required className="sm:col-span-2" placeholder="e.g. DBM-NTA-2027-031403021" />
          <TextareaField name="description" label="Description" className="sm:col-span-2" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
