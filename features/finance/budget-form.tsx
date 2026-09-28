"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { AnnualBudget } from "@/types"
import { FormRoot, FormSection, MoneyField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useBudgets } from "@/hooks/use-data"
import { sessionActions, simulateLatency } from "@/lib/store/actions"
import { budgetActions } from "@/lib/store/finance-actions"
import { emptyToUndefined, optionalText, requiredText } from "@/lib/validation"

export function BudgetFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<AnnualBudget>) {
  const budgets = useBudgets()
  const schema = z
    .object({
      fiscalYear: z.string().regex(/^20\d{2}$/, "Enter a fiscal year, e.g. 2027"),
      title: requiredText("Budget title", 120),
      estimatedIncome: z.number({ error: "Enter estimated income" }).positive("Must be greater than zero"),
      approvedBudget: z.number({ error: "Enter the budget amount" }).positive("Must be greater than zero"),
      notes: optionalText(500),
    })
    .refine((v) => v.approvedBudget <= v.estimatedIncome, { path: ["approvedBudget"], message: "Budget cannot exceed estimated income" })
    .refine((v) => !budgets.some((b) => b.fiscalYear === Number(v.fiscalYear) && b.id !== record?.id), {
      path: ["fiscalYear"],
      message: "A budget already exists for this fiscal year",
    })

  const nextFy = Math.max(...budgets.map((b) => b.fiscalYear)) + 1
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      fiscalYear: String(record?.fiscalYear ?? nextFy),
      title: record?.title ?? `FY ${nextFy} Annual Barangay Budget`,
      estimatedIncome: record?.estimatedIncome ?? 0,
      approvedBudget: record?.approvedBudget ?? 0,
      notes: record?.notes ?? "",
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      fiscalYear: Number(v.fiscalYear),
      title: v.title,
      estimatedIncome: v.estimatedIncome,
      approvedBudget: v.approvedBudget,
      notes: emptyToUndefined(v.notes),
    }
    if (record) {
      budgetActions.update(record.id, payload)
      toast.success("Budget updated", { description: v.title })
      onSaved?.({ ...record, ...payload })
    } else {
      const b = budgetActions.create(payload)
      sessionActions.setFiscalYear(b.fiscalYear)
      toast.success("Budget created", { description: "Add allocations per category next." })
      onSaved?.(b)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit annual budget" : "New annual budget"}
      formId="budget-form"
      submitLabel={record ? "Save changes" : "Create budget"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="budget-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="fiscalYear" label="Fiscal year" required type="number" disabled={Boolean(record)} />
          <TextField name="title" label="Budget title" required />
          <MoneyField name="estimatedIncome" label="Estimated income" required description="NTA, local collections and other receipts." />
          <MoneyField name="approvedBudget" label="Proposed / approved budget" required />
          <TextareaField name="notes" label="Notes" className="sm:col-span-2" rows={3} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
