"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Collection, CollectionType, PaymentMethod } from "@/types"
import {
  DateField,
  FormRoot,
  FormSection,
  MoneyField,
  ResidentSelectField,
  SelectField,
  SwitchField,
  TextField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useResidents } from "@/hooks/use-data"
import { COLLECTION_TYPES, PAYMENT_METHODS, toOptions } from "@/lib/constants"
import { formatPeso, fullName, toISODate } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { collectionActions } from "@/lib/store/finance-actions"
import { emptyToUndefined, isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z
  .object({
    orNumber: requiredText("O.R. number", 20),
    date: isoDate("Date"),
    isResident: z.boolean(),
    residentId: z.string(),
    payerName: optionalText(120),
    businessName: optionalText(120),
    type: selectRequired("Collection type"),
    description: requiredText("Description", 200),
    amount: z.number({ error: "Enter the amount" }).positive("Must be greater than zero"),
    paymentMethod: selectRequired("Payment method"),
  })
  .refine((v) => (v.isResident ? Boolean(v.residentId) : Boolean(v.payerName)), { path: ["payerName"], message: "Enter the payor's name" })

export function CollectionFormDialog({ open, onOpenChange, onSaved }: EntityFormProps<Collection>) {
  const residents = useResidents()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      orNumber: collectionActions.nextOrNumber(),
      date: toISODate(new Date()),
      isResident: true,
      residentId: "",
      payerName: "",
      businessName: "",
      type: "",
      description: "",
      amount: 0,
      paymentMethod: "Cash",
    },
  })
  const isResident = useWatch({ control: form.control, name: "isResident" })
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const resident = residents.find((r) => r.id === v.residentId)
    const c = collectionActions.create({
      orNumber: v.orNumber,
      date: v.date,
      payerName: v.isResident && resident ? fullName(resident) : v.payerName,
      residentId: v.isResident ? v.residentId : undefined,
      businessName: emptyToUndefined(v.businessName),
      type: v.type as CollectionType,
      description: v.description,
      amount: v.amount,
      paymentMethod: v.paymentMethod as PaymentMethod,
    })
    toast.success("Collection recorded", { description: `${c.orNumber} · ${formatPeso(c.amount)}` })
    onSaved?.(c)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record collection"
      description="Issue an official receipt for a barangay fee or charge."
      formId="collection-form"
      submitLabel="Record & issue O.R."
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="collection-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="orNumber" label="O.R. number" required />
          <DateField name="date" label="Date" required disableFuture />
          <SwitchField name="isResident" label="Payor is a registered resident" className="sm:col-span-2" />
          {isResident ? (
            <ResidentSelectField name="residentId" label="Payor" required className="sm:col-span-2" />
          ) : (
            <TextField name="payerName" label="Payor name" required className="sm:col-span-2" />
          )}
          <TextField name="businessName" label="Business name" className="sm:col-span-2" description="For business clearances and stall rentals." />
          <SelectField name="type" label="Collection type" required options={toOptions(COLLECTION_TYPES)} />
          <MoneyField name="amount" label="Amount" required />
          <TextField name="description" label="Description" required className="sm:col-span-2" placeholder="e.g. Covered court rental – 4 hours" />
          <SelectField
            name="paymentMethod"
            label="Payment method"
            required
            options={toOptions(PAYMENT_METHODS)}
            description={
              paymentMethod === "GCash" || paymentMethod === "Maya"
                ? "Placeholder only — enter the reference in the description. No online payment is processed."
                : undefined
            }
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
