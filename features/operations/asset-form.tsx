"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Asset, AssetCategory, AssetCondition, AssetStatus } from "@/types"
import {
  DateField,
  FormRoot,
  FormSection,
  MoneyField,
  OfficialSelectField,
  SelectField,
  TextField,
  TextareaField,
  type EntityFormProps,
} from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { assetActions } from "@/lib/store/operations-actions"
import { emptyToUndefined, isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z.object({
  name: requiredText("Asset name", 120),
  category: selectRequired("Category"),
  description: optionalText(400),
  serialNumber: optionalText(60),
  acquisitionDate: isoDate("Acquisition date"),
  acquisitionCost: z.number({ error: "Enter the cost" }).min(0, "Cannot be negative"),
  source: requiredText("Source", 120),
  custodianId: selectRequired("Custodian"),
  location: requiredText("Location", 120),
  condition: selectRequired("Condition"),
  status: selectRequired("Status"),
})

export function AssetFormDialog({ open, onOpenChange, record }: EntityFormProps<Asset>) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: record?.name ?? "",
      category: record?.category ?? "",
      description: record?.description ?? "",
      serialNumber: record?.serialNumber ?? "",
      acquisitionDate: record?.acquisitionDate ?? "",
      acquisitionCost: record?.acquisitionCost ?? 0,
      source: record?.source ?? "Barangay Fund",
      custodianId: record?.custodianId ?? "",
      location: record?.location ?? "",
      condition: record?.condition ?? "Excellent",
      status: record?.status ?? "Active",
    },
  })
  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      ...v,
      category: v.category as AssetCategory,
      condition: v.condition as AssetCondition,
      status: v.status as AssetStatus,
      description: emptyToUndefined(v.description),
      serialNumber: emptyToUndefined(v.serialNumber),
    }
    if (record) assetActions.update(record.id, payload)
    else assetActions.create(payload)
    toast.success(record ? "Asset updated" : "Asset registered", { description: v.name })
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? `Edit ${record.assetNumber}` : "Register asset"}
      formId="asset-form"
      submitLabel="Save asset"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="asset-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Asset">
          <TextField name="name" label="Asset name" required className="sm:col-span-2" />
          <SelectField name="category" label="Category" required options={toOptions(ASSET_CATEGORIES)} />
          <TextField name="serialNumber" label="Serial / plate number" />
          <TextareaField name="description" label="Description" className="sm:col-span-2" rows={2} />
        </FormSection>
        <FormSection title="Acquisition">
          <DateField name="acquisitionDate" label="Acquisition date" required disableFuture />
          <MoneyField name="acquisitionCost" label="Acquisition cost" required />
          <TextField name="source" label="Source" required className="sm:col-span-2" placeholder="Barangay Fund, donation, City Government…" />
        </FormSection>
        <FormSection title="Custody">
          <OfficialSelectField name="custodianId" label="Accountable custodian" required />
          <TextField name="location" label="Location" required />
          <SelectField name="condition" label="Condition" required options={toOptions(ASSET_CONDITIONS)} disabled={Boolean(record)} />
          <SelectField name="status" label="Status" required options={toOptions(ASSET_STATUSES.filter((s) => s !== "Disposed"))} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
