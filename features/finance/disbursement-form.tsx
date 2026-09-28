"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Disbursement, DisbursementMethod } from "@/types"
import {
  DateField,
  FileField,
  FormRoot,
  FormSection,
  MoneyField,
  ObligationSelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDrawer } from "@/components/shared/form-drawer"
import { Money } from "@/components/shared/money"
import { useObligations } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { DISBURSEMENT_METHODS, toOptions } from "@/lib/constants"
import { formatPeso, toISODate } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { disbursementActions } from "@/lib/store/finance-actions"
import { isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

/** Disbursement voucher. Amount cannot exceed the obligation's undisbursed balance (net of pending vouchers). */
export function DisbursementFormDrawer({ open, onOpenChange, record, defaults, onSaved }: EntityFormProps<Disbursement, { obligationId?: string }>) {
  const router = useRouter()
  const obligations = useObligations()
  const ledger = useLedger()
  const balance = (obligationId: string) => {
    const o = obligations.find((x) => x.id === obligationId)
    return o ? o.amount - ledger.disbursedForObligation(o.id) : 0
  }

  const schema = z
    .object({
      obligationId: selectRequired("Obligation"),
      date: isoDate("Date"),
      payee: requiredText("Payee", 120),
      amount: z.number({ error: "Enter the amount" }).positive("Must be greater than zero"),
      paymentMethod: selectRequired("Payment method"),
      remarks: optionalText(300),
      attachments: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
      saveAs: z.enum(["draft", "submit"]),
    })
    .refine((v) => v.amount <= balance(v.obligationId), { path: ["amount"], message: "Exceeds the undisbursed balance of the obligation" })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      obligationId: record?.obligationId ?? defaults?.obligationId ?? "",
      date: record?.date ?? toISODate(new Date()),
      payee: record?.payee ?? "",
      amount: record?.amount ?? 0,
      paymentMethod: record?.paymentMethod ?? "Check",
      remarks: record?.remarks ?? "",
      attachments: [],
      saveAs: "submit" as "draft" | "submit",
    },
  })
  const obligationId = useWatch({ control: form.control, name: "obligationId" })

  useEffect(() => {
    const o = obligations.find((x) => x.id === obligationId)
    if (!o || record) return
    form.setValue("payee", o.payee)
    form.setValue("remarks", o.description)
    if (!form.getValues("amount")) form.setValue("amount", o.amount - ledger.disbursedForObligation(o.id))
  }, [obligationId, obligations, ledger, form, record])

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const attachments = v.attachments.map((f) => ({ ...f, uploadedAt: new Date().toISOString() }))
    if (record) {
      disbursementActions.update(record.id, {
        date: v.date,
        payee: v.payee,
        amount: v.amount,
        paymentMethod: v.paymentMethod as DisbursementMethod,
        remarks: v.remarks,
        attachments: [...record.attachments, ...attachments],
      })
      toast.success("Disbursement updated", { description: record.disbursementNumber })
    } else {
      const d = disbursementActions.create({
        obligationId: v.obligationId,
        date: v.date,
        payee: v.payee,
        amount: v.amount,
        paymentMethod: v.paymentMethod as DisbursementMethod,
        remarks: v.remarks,
        attachments,
        submit: v.saveAs === "submit",
      })
      toast.success("Disbursement voucher prepared", {
        description: `${d.voucherNumber} · ${formatPeso(d.amount)}`,
        action: { label: "Open", onClick: () => router.push(`/finance/disbursements/${d.id}`) },
      })
      onSaved?.(d)
    }
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.voucherNumber}` : "New disbursement voucher"}
      description="Pays an approved obligation. An expense is recorded when released."
      formId="disbursement-form"
      submitLabel={record ? "Save changes" : "Prepare voucher"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="disbursement-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          <ObligationSelectField name="obligationId" required disabled={Boolean(record)} />
          {obligationId && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              Undisbursed balance: <Money value={balance(obligationId)} className="font-semibold" />
            </div>
          )}
        </FormSection>
        <FormSection title="Voucher">
          <DateField name="date" label="Date" required />
          <MoneyField name="amount" label="Amount" required />
          <TextField name="payee" label="Payee" required className="sm:col-span-2" />
          <SelectField name="paymentMethod" label="Payment method" required options={toOptions(DISBURSEMENT_METHODS)} />
          <TextareaField name="remarks" label="Particulars / remarks" className="sm:col-span-2" rows={2} />
        </FormSection>
        <FormSection title="Supporting documents" columns={1}>
          <FileField name="attachments" label="Attachments" description="Invoice, delivery receipt, inspection and acceptance report, payroll…" />
          {!record && (
            <SelectField
              name="saveAs"
              label="Save as"
              required
              options={[
                { label: "Submit for review", value: "submit" },
                { label: "Draft", value: "draft" },
              ]}
            />
          )}
        </FormSection>
      </FormRoot>
    </FormDrawer>
  )
}
