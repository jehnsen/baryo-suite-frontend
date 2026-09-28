"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BudgetAllocation, BudgetCategory } from "@/types"
import { FormRoot, FormSection, MoneyField, SelectField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { Money } from "@/components/shared/money"
import { useAllocations, useBudgets } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { BUDGET_CATEGORIES, toOptions } from "@/lib/constants"
import { allocationApproved } from "@/lib/finance"
import { formatPeso } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { budgetActions } from "@/lib/store/finance-actions"
import { emptyToUndefined, optionalText, selectRequired } from "@/lib/validation"

/** Create or revise a category allocation of an annual budget. */
export function AllocationFormDialog({ open, onOpenChange, record, defaults }: EntityFormProps<BudgetAllocation, { budgetId: string }>) {
  const budgets = useBudgets()
  const allocations = useAllocations()
  const ledger = useLedger()
  const budgetId = record?.budgetId ?? defaults?.budgetId ?? ""
  const budget = budgets.find((b) => b.id === budgetId)
  const obligated = record ? ledger.forAllocation(record).obligated : 0
  const otherAllocations = allocations.filter((a) => a.budgetId === budgetId && a.id !== record?.id).reduce((s, a) => s + allocationApproved(a), 0)
  const ceiling = (budget?.approvedBudget ?? 0) - otherAllocations
  const used = new Set(allocations.filter((a) => a.budgetId === budgetId).map((a) => a.category))

  const schema = z
    .object({
      category: selectRequired("Category"),
      approvedAmount: z.number({ error: "Enter the allocation" }).min(0, "Cannot be negative"),
      revisedAmount: z.number().min(0, "Cannot be negative").optional(),
      remarks: optionalText(300),
    })
    .refine((v) => (v.revisedAmount ?? v.approvedAmount) <= ceiling, {
      path: ["approvedAmount"],
      message: `Exceeds the unappropriated balance (${formatPeso(ceiling)})`,
    })
    .refine((v) => (v.revisedAmount ?? v.approvedAmount) >= obligated, {
      path: [record?.revisedAmount !== undefined || record ? "revisedAmount" : "approvedAmount"],
      message: `Cannot go below the ${formatPeso(obligated)} already obligated`,
    })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      category: record?.category ?? "",
      approvedAmount: record?.approvedAmount ?? 0,
      revisedAmount: record?.revisedAmount,
      remarks: record?.remarks ?? "",
    },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    budgetActions.setAllocation(budgetId, v.category as BudgetCategory, {
      approvedAmount: v.approvedAmount,
      revisedAmount: v.revisedAmount || undefined,
      remarks: emptyToUndefined(v.remarks),
    })
    toast.success("Allocation saved", { description: `${v.category} · ${formatPeso(v.revisedAmount || v.approvedAmount)}` })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Revise ${record.category}` : "Add allocation"}
      description={budget?.title}
      formId="allocation-form"
      submitLabel="Save allocation"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="allocation-form" form={form} onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Available to appropriate</p>
            <Money value={ceiling} className="font-medium" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Already obligated</p>
            <Money value={obligated} className="font-medium" />
          </div>
        </div>
        <FormSection>
          <SelectField
            name="category"
            label="Budget category"
            required
            disabled={Boolean(record)}
            options={toOptions(BUDGET_CATEGORIES.filter((c) => c === record?.category || !used.has(c)))}
            className="sm:col-span-2"
          />
          <MoneyField name="approvedAmount" label="Approved allocation" required disabled={Boolean(record) && budget?.status !== "Draft"} />
          {record && <MoneyField name="revisedAmount" label="Revised allocation" description="Supplemental budget or realignment." />}
          <TextareaField name="remarks" label="Remarks" className="sm:col-span-2" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
