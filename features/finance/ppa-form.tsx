"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BudgetCategory, PPA, PPAStatus, PPAType } from "@/types"
import {
  CommitteeSelectField,
  DateField,
  FormRoot,
  FormSection,
  FundSourceSelectField,
  MoneyField,
  OfficialSelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDrawer } from "@/components/shared/form-drawer"
import { Money } from "@/components/shared/money"
import { useAllocations, useBudgets, usePPAs } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { BUDGET_CATEGORIES, PPA_STATUSES, PPA_TYPES, toOptions } from "@/lib/constants"
import { allocationApproved, ppaApproved } from "@/lib/finance"
import { formatPeso } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { ppaActions } from "@/lib/store/finance-actions"
import { emptyToUndefined, isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

export function PPAFormDrawer({ open, onOpenChange, record, defaults, onSaved }: EntityFormProps<PPA, { budgetId?: string; category?: BudgetCategory }>) {
  const { budget: fyBudget } = useFiscalYear()
  const budgets = useBudgets()
  const allocations = useAllocations()
  const ppas = usePPAs()
  const ledger = useLedger()
  const budgetId = record?.budgetId ?? defaults?.budgetId ?? fyBudget?.id ?? ""
  const budget = budgets.find((b) => b.id === budgetId)
  const obligated = record ? ledger.forPPA(record).obligated : 0

  // Headroom inside the category allocation for this PPA.
  const headroom = (category: string) => {
    const alloc = allocations.find((a) => a.budgetId === budgetId && a.category === category)
    const others = ppas.filter((p) => p.budgetId === budgetId && p.category === category && p.id !== record?.id).reduce((s, p) => s + ppaApproved(p), 0)
    return alloc ? allocationApproved(alloc) - others : 0
  }

  const schema = z
    .object({
      code: requiredText("PPA code", 20),
      name: requiredText("Name", 140),
      type: selectRequired("Type"),
      description: optionalText(600),
      category: selectRequired("Budget category"),
      approvedBudget: z.number({ error: "Enter the budget" }).positive("Must be greater than zero"),
      revisedBudget: z.number().min(0).optional(),
      fundSourceId: selectRequired("Fund source"),
      committeeId: z.string(),
      responsibleOfficialId: selectRequired("Responsible official"),
      startDate: isoDate("Start date"),
      targetCompletion: isoDate("Target completion"),
      status: selectRequired("Status"),
      physicalProgress: z.number().min(0).max(100),
    })
    .refine((v) => v.targetCompletion >= v.startDate, { path: ["targetCompletion"], message: "Must be on or after the start date" })
    .refine((v) => (v.revisedBudget || v.approvedBudget) <= headroom(v.category), {
      path: ["approvedBudget"],
      message: "Exceeds the remaining category allocation",
    })
    .refine((v) => (v.revisedBudget || v.approvedBudget) >= obligated, {
      path: ["revisedBudget"],
      message: `Cannot go below ${formatPeso(obligated)} already obligated`,
    })

  const nextCode = `${(defaults?.category ?? "GA").slice(0, 2).toUpperCase()}-${budget?.fiscalYear ?? ""}-${String(ppas.filter((p) => p.budgetId === budgetId).length + 1).padStart(2, "0")}`
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      code: record?.code ?? nextCode,
      name: record?.name ?? "",
      type: record?.type ?? "",
      description: record?.description ?? "",
      category: record?.category ?? defaults?.category ?? "",
      approvedBudget: record?.approvedBudget ?? 0,
      revisedBudget: record?.revisedBudget,
      fundSourceId: record?.fundSourceId ?? "",
      committeeId: record?.committeeId ?? "",
      responsibleOfficialId: record?.responsibleOfficialId ?? "",
      startDate: record?.startDate ?? "",
      targetCompletion: record?.targetCompletion ?? "",
      status: record?.status ?? "Planned",
      physicalProgress: record?.physicalProgress ?? 0,
    },
  })
  const category = useWatch({ control: form.control, name: "category" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      ...v,
      budgetId,
      type: v.type as PPAType,
      category: v.category as BudgetCategory,
      status: v.status as PPAStatus,
      revisedBudget: v.revisedBudget || undefined,
      committeeId: emptyToUndefined(v.committeeId),
      description: v.description,
    }
    if (record) {
      ppaActions.update(record.id, payload)
      onSaved?.({ ...record, ...payload })
    } else onSaved?.(ppaActions.create(payload))
    toast.success(record ? "PPA updated" : "PPA added", { description: `${v.code} · ${v.name}` })
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.code}` : "Add program, project or activity"}
      description={budget?.title}
      formId="ppa-form"
      submitLabel={record ? "Save changes" : "Add PPA"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="ppa-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Identification">
          <TextField name="code" label="PPA code" required />
          <SelectField name="type" label="Type" required options={toOptions(PPA_TYPES)} />
          <TextField name="name" label="Name" required className="sm:col-span-2" />
          <TextareaField name="description" label="Description" className="sm:col-span-2" rows={3} />
        </FormSection>
        <FormSection title="Budget">
          <SelectField name="category" label="Budget category" required options={toOptions(BUDGET_CATEGORIES)} disabled={Boolean(record)} />
          <div className="flex flex-col justify-end text-sm">
            {category && (
              <p className="text-muted-foreground">
                Remaining in category: <Money value={headroom(category)} className="font-medium text-foreground" />
              </p>
            )}
          </div>
          <MoneyField name="approvedBudget" label="Approved budget" required disabled={Boolean(record)} />
          {record && <MoneyField name="revisedBudget" label="Revised budget" description="Leave empty if unchanged." />}
          <FundSourceSelectField name="fundSourceId" required fiscalYear={budget?.fiscalYear} className="sm:col-span-2" />
        </FormSection>
        <FormSection title="Responsibility & schedule">
          <CommitteeSelectField name="committeeId" label="Responsible committee" />
          <OfficialSelectField name="responsibleOfficialId" label="Responsible official" required />
          <DateField name="startDate" label="Start date" required />
          <DateField name="targetCompletion" label="Target completion" required />
          <SelectField name="status" label="Status" required options={toOptions(PPA_STATUSES)} />
        </FormSection>
      </FormRoot>
    </FormDrawer>
  )
}
