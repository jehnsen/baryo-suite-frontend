"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Asset, AssetCondition, MaintenanceRecord } from "@/types"
import { DateField, FormRoot, FormSection, MoneyField, OfficialSelectField, SelectField, TextField, TextareaField } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { ASSET_CONDITIONS, toOptions } from "@/lib/constants"
import { toISODate } from "@/lib/format"
import { simulateLatency } from "@/lib/store/actions"
import { assetActions } from "@/lib/store/operations-actions"
import { isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

interface Props {
  asset: Asset
  open: boolean
  onOpenChange: (o: boolean) => void
}

const assignSchema = z.object({ custodianId: selectRequired("Custodian"), location: requiredText("Location", 120), remarks: optionalText(300) })

export function AssignAssetDialog({ asset, open, onOpenChange }: Props) {
  const form = useForm({
    resolver: zodResolver(assignSchema),
    mode: "onTouched",
    values: { custodianId: asset.custodianId, location: asset.location, remarks: "" },
  })
  const onSubmit = async (v: z.output<typeof assignSchema>) => {
    await simulateLatency(350)
    assetActions.assign(asset.id, v.custodianId, v.location, v.remarks || undefined)
    toast.success("Custodian updated", { description: "A new property acknowledgement receipt should be signed." })
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Assign / transfer asset"
      description={`${asset.assetNumber} · ${asset.name}`}
      formId="assign-asset-form"
      submitLabel="Assign"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="assign-asset-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          <OfficialSelectField name="custodianId" label="Accountable custodian" required />
          <TextField name="location" label="Location" required />
          <TextareaField name="remarks" label="Remarks" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}

const conditionSchema = z.object({ condition: selectRequired("Condition"), remarks: optionalText(300) })

export function ConditionDialog({ asset, open, onOpenChange }: Props) {
  const form = useForm({ resolver: zodResolver(conditionSchema), mode: "onTouched", values: { condition: asset.condition, remarks: "" } })
  const onSubmit = async (v: z.output<typeof conditionSchema>) => {
    await simulateLatency(350)
    assetActions.recordCondition(asset.id, v.condition as AssetCondition, v.remarks || undefined)
    toast.success("Condition recorded", { description: v.condition })
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Record condition"
      description="From inspection or physical count."
      formId="condition-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="condition-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          <SelectField
            name="condition"
            label="Condition"
            required
            options={toOptions(ASSET_CONDITIONS)}
            description="“For Repair” moves the asset to Under Maintenance."
          />
          <TextareaField name="remarks" label="Remarks" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}

const maintenanceSchema = z.object({
  date: isoDate("Date"),
  type: selectRequired("Type"),
  description: requiredText("Description", 300),
  cost: z.number().min(0),
  performedBy: requiredText("Performed by", 120),
})

export function MaintenanceDialog({ asset, open, onOpenChange }: Props) {
  const form = useForm({
    resolver: zodResolver(maintenanceSchema),
    mode: "onTouched",
    defaultValues: { date: toISODate(new Date()), type: "Preventive", description: "", cost: 0, performedBy: "" },
  })
  const onSubmit = async (v: z.output<typeof maintenanceSchema>) => {
    await simulateLatency(350)
    assetActions.addMaintenance(asset.id, { ...v, type: v.type as MaintenanceRecord["type"] })
    toast.success("Maintenance recorded")
    form.reset()
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record maintenance"
      description={`${asset.assetNumber} · ${asset.name}`}
      formId="maintenance-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="maintenance-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <DateField name="date" label="Date" required disableFuture />
          <SelectField name="type" label="Type" required options={toOptions(["Preventive", "Repair", "Inspection"])} />
          <TextareaField name="description" label="Work done" required className="sm:col-span-2" rows={2} />
          <MoneyField name="cost" label="Cost" />
          <TextField name="performedBy" label="Performed by" required />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
