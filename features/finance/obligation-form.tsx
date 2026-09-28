"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Obligation } from "@/types"
import {
  DateField,
  FileField,
  FormRoot,
  FormSection,
  FundSourceSelectField,
  MoneyField,
  OfficialSelectField,
  PPASelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDrawer } from "@/components/shared/form-drawer"
import { Money } from "@/components/shared/money"
import { usePPAs } from "@/hooks/use-data"
import { useFiscalYear, useLedger } from "@/hooks/use-finance"
import { formatPeso, toISODate } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { obligationActions } from "@/lib/store/finance-actions"
import { isoDate, requiredText, selectRequired } from "@/lib/validation"

const fileSchema = z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() }))

/** Obligation Request (ObR) form. Amount is validated against the PPA's available balance. */
export function ObligationFormDrawer({ open, onOpenChange, record, defaults, onSaved }: EntityFormProps<Obligation, { ppaId?: string }>) {
  const router = useRouter()
  const { budget, fiscalYear } = useFiscalYear()
  const ppas = usePPAs()
  const ledger = useLedger()
  const available = (ppaId: string) => {
    const p = ppas.find((x) => x.id === ppaId)
    if (!p) return 0
    // Editing a committed obligation: its own amount is part of the obligated total.
    return (
      ledger.forPPA(p).available +
      (record && ["Approved", "Partially Disbursed", "Fully Disbursed"].includes(record.status) && record.ppaId === ppaId ? record.amount : 0)
    )
  }

  const schema = z
    .object({
      date: isoDate("Date"),
      payee: requiredText("Payee", 120),
      description: requiredText("Description", 300),
      ppaId: selectRequired("PPA"),
      fundSourceId: selectRequired("Fund source"),
      amount: z.number({ error: "Enter the amount" }).positive("Must be greater than zero"),
      requestedById: selectRequired("Requesting official"),
      attachments: fileSchema,
      saveAs: z.enum(["draft", "submit"]),
    })
    .refine((v) => v.amount <= available(v.ppaId), { path: ["amount"], message: "Exceeds the PPA's available balance" })
    .refine((v) => v.saveAs === "draft" || v.attachments.length > 0 || Boolean(record?.attachments.length), {
      path: ["attachments"],
      message: "Attach supporting documents before submitting for review",
    })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      date: record?.date ?? toISODate(new Date()),
      payee: record?.payee ?? "",
      description: record?.description ?? "",
      ppaId: record?.ppaId ?? defaults?.ppaId ?? "",
      fundSourceId: record?.fundSourceId ?? "",
      amount: record?.amount ?? 0,
      requestedById: record?.requestedById ?? "",
      attachments: [],
      saveAs: "submit" as "draft" | "submit",
    },
  })
  const ppaId = useWatch({ control: form.control, name: "ppaId" })

  // Default fund source and requester from the selected PPA.
  useEffect(() => {
    const p = ppas.find((x) => x.id === ppaId)
    if (!p || record) return
    form.setValue("fundSourceId", p.fundSourceId)
    if (!form.getValues("requestedById")) form.setValue("requestedById", p.responsibleOfficialId)
  }, [ppaId, ppas, form, record])

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const attachments = v.attachments.map((f) => ({ ...f, uploadedAt: new Date().toISOString() }))
    if (record) {
      obligationActions.update(record.id, {
        date: v.date,
        payee: v.payee,
        description: v.description,
        ppaId: v.ppaId,
        fundSourceId: v.fundSourceId,
        amount: v.amount,
        requestedById: v.requestedById,
        attachments: [...record.attachments, ...attachments],
      })
      toast.success("Obligation updated", { description: record.obligationNumber })
    } else {
      const o = obligationActions.create({
        date: v.date,
        payee: v.payee,
        description: v.description,
        ppaId: v.ppaId,
        fundSourceId: v.fundSourceId,
        amount: v.amount,
        requestedById: v.requestedById,
        attachments,
        submit: v.saveAs === "submit",
      })
      toast.success(v.saveAs === "submit" ? "Obligation submitted for review" : "Obligation saved as draft", {
        description: `${o.obligationNumber} · ${formatPeso(o.amount)}`,
        action: { label: "Open", onClick: () => router.push(`/finance/obligations/${o.id}`) },
      })
      onSaved?.(o)
    }
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.obligationNumber}` : "New obligation request"}
      description="Commits budget against a program, project or activity once approved."
      formId="obligation-form"
      submitLabel={record ? "Save changes" : "Save obligation"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="obligation-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Charge to">
          <PPASelectField name="ppaId" required budgetId={budget?.id} className="sm:col-span-2" />
          {ppaId && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2">
              Available balance: <Money value={available(ppaId)} className="font-semibold" />
            </div>
          )}
          <FundSourceSelectField name="fundSourceId" required fiscalYear={fiscalYear} />
          <OfficialSelectField name="requestedById" label="Requested by" required />
        </FormSection>
        <FormSection title="Obligation">
          <DateField name="date" label="Date" required />
          <MoneyField name="amount" label="Amount" required />
          <TextField name="payee" label="Payee / supplier" required className="sm:col-span-2" />
          <TextareaField name="description" label="Description / particulars" required className="sm:col-span-2" rows={3} />
        </FormSection>
        <FormSection title="Supporting documents" columns={1}>
          <FileField name="attachments" label="Attachments" description="Purchase request, quotations, program of works, payroll…" />
          {!record && (
            <SelectField
              name="saveAs"
              label="Save as"
              required
              options={[
                { label: "Submit for review (certify budget availability)", value: "submit" },
                { label: "Draft", value: "draft" },
              ]}
            />
          )}
        </FormSection>
      </FormRoot>
    </FormDrawer>
  )
}
