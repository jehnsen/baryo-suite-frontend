"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, parseISO } from "date-fns"
import { z } from "zod"
import { toast } from "sonner"
import type { Certificate, CertificateType } from "@/types"
import {
  DateField,
  FormRoot,
  FormSection,
  MoneyField,
  OfficialSelectField,
  ResidentSelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useSettings } from "@/hooks/use-data"
import { CERTIFICATE_PURPOSES, CERTIFICATE_TYPES, toOptions } from "@/lib/constants"
import { toISODate } from "@/lib/format"
import { certificateActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, isoDate, optionalIsoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z
  .object({
    residentId: selectRequired("Resident"),
    type: selectRequired("Certificate type"),
    purpose: requiredText("Purpose", 160),
    dateIssued: isoDate("Date"),
    validUntil: optionalIsoDate,
    remarks: optionalText(300),
    issuedById: selectRequired("Issuing officer"),
    fee: z.number({ error: "Enter the fee (0 if free)" }).min(0, "Fee cannot be negative"),
    status: z.enum(["Draft", "Pending"]),
  })
  .refine((v) => !v.validUntil || v.validUntil >= v.dateIssued, { path: ["validUntil"], message: "Validity must be on or after the issue date" })

export function CertificateFormDialog({
  open,
  onOpenChange,
  record,
  defaults,
  onSaved,
}: EntityFormProps<Certificate, { residentId?: string; type?: CertificateType }>) {
  const router = useRouter()
  const settings = useSettings()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      residentId: record?.residentId ?? defaults?.residentId ?? "",
      type: record?.type ?? defaults?.type ?? "",
      purpose: record?.purpose ?? "",
      dateIssued: record?.dateIssued ?? toISODate(new Date()),
      validUntil: record?.validUntil ?? "",
      remarks: record?.remarks ?? "",
      issuedById: record?.issuedById ?? settings.secretaryId,
      fee: record?.fee ?? 0,
      status: (record?.status === "Draft" ? "Draft" : "Pending") as "Draft" | "Pending",
    },
  })

  const type = useWatch({ control: form.control, name: "type" }) as CertificateType | ""
  const dateIssued = useWatch({ control: form.control, name: "dateIssued" })

  // Fee and validity come from settings master data whenever the type/date changes.
  useEffect(() => {
    if (!type || record) return
    const conf = settings.certificateTypes.find((c) => c.type === type)
    if (!conf) return
    form.setValue("fee", conf.fee)
    if (dateIssued) form.setValue("validUntil", toISODate(addDays(parseISO(dateIssued), conf.validityDays)))
  }, [type, dateIssued, settings.certificateTypes, form, record])

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      residentId: v.residentId,
      type: v.type as CertificateType,
      purpose: v.purpose,
      dateIssued: v.dateIssued,
      validUntil: emptyToUndefined(v.validUntil),
      remarks: emptyToUndefined(v.remarks),
      issuedById: v.issuedById,
      fee: v.fee,
      status: v.status,
    }
    if (record) {
      certificateActions.update(record.id, payload)
      toast.success("Certificate updated", { description: record.certificateNumber })
      onSaved?.({ ...record, ...payload })
    } else {
      const created = certificateActions.create(payload)
      toast.success(v.status === "Draft" ? "Draft saved" : "Certificate submitted for approval", {
        description: `${created.certificateNumber} · ${created.type}`,
        action: { label: "Preview", onClick: () => router.push(`/certificates/${created.id}`) },
      })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  const purposes = type ? CERTIFICATE_PURPOSES[type] : []

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? `Edit ${record.certificateNumber}` : "Issue certificate"}
      description="Prepare a barangay certificate for approval and release."
      formId="certificate-form"
      submitLabel={record ? "Save changes" : "Save certificate"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="certificate-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <ResidentSelectField name="residentId" required className="sm:col-span-2" disabled={Boolean(record)} />
          <SelectField name="type" label="Certificate type" required options={toOptions(CERTIFICATE_TYPES)} disabled={Boolean(record)} />
          <OfficialSelectField name="issuedById" label="Issuing officer" required />
          <div className="space-y-2 sm:col-span-2">
            <TextField name="purpose" label="Purpose" required placeholder="e.g. Local employment" />
            {purposes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {purposes.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => form.setValue("purpose", p, { shouldValidate: true })}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DateField name="dateIssued" label="Date" required />
          <DateField name="validUntil" label="Valid until" description="Auto-computed from the certificate type." />
          <MoneyField name="fee" label="Fee" required description="From Settings › Certificate types." />
          <SelectField
            name="status"
            label="Save as"
            required
            options={[
              { label: "Pending – submit for approval", value: "Pending" },
              { label: "Draft – continue later", value: "Draft" },
            ]}
          />
          <TextareaField name="remarks" label="Remarks" className="sm:col-span-2" rows={3} placeholder="Internal remarks (not printed)" />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
