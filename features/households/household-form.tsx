"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Household, HousingType, IncomeRange, OwnershipStatus, ToiletFacility, WaterSource } from "@/types"
import { AddressFields, FormRoot, FormSection, ResidentSelectField, SelectField, SwitchField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useResidents } from "@/hooks/use-data"
import { HOUSING_TYPES, INCOME_RANGES, OWNERSHIP_STATUSES, TOILET_FACILITIES, WATER_SOURCES, toOptions } from "@/lib/constants"
import { householdActions, simulateLatency } from "@/lib/store/actions"
import { addressSchema, emptyToUndefined, selectRequired } from "@/lib/validation"

const schema = z.object({
  headId: selectRequired("Household head"),
  address: addressSchema,
  housingType: selectRequired("Housing type"),
  ownershipStatus: selectRequired("Ownership status"),
  waterSource: selectRequired("Water source"),
  hasElectricity: z.boolean(),
  toiletFacility: selectRequired("Toilet facility"),
  incomeRange: selectRequired("Income range"),
  active: z.boolean(),
})

export function HouseholdFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<Household>) {
  const router = useRouter()
  const residents = useResidents()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      headId: record?.headId ?? "",
      address: {
        houseNumber: record?.address.houseNumber ?? "",
        street: record?.address.street ?? "",
        sitio: record?.address.sitio ?? "",
        purok: record?.address.purok ?? "",
      },
      housingType: record?.housingType ?? "",
      ownershipStatus: record?.ownershipStatus ?? "",
      waterSource: record?.waterSource ?? "",
      hasElectricity: record?.hasElectricity ?? true,
      toiletFacility: record?.toiletFacility ?? "",
      incomeRange: record?.incomeRange ?? "",
      active: record ? record.status === "Active" : true,
    },
  })

  // Prefill the address from the chosen head when creating.
  const headId = useWatch({ control: form.control, name: "headId" })
  useEffect(() => {
    const head = residents.find((r) => r.id === headId)
    if (!record && head && !form.getValues("address.street")) {
      form.setValue(
        "address",
        { houseNumber: head.address.houseNumber, street: head.address.street, sitio: head.address.sitio ?? "", purok: head.address.purok },
        { shouldValidate: true },
      )
    }
  }, [headId, residents, record, form])

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const payload = {
      headId: v.headId,
      address: { ...v.address, sitio: emptyToUndefined(v.address.sitio) },
      housingType: v.housingType as HousingType,
      ownershipStatus: v.ownershipStatus as OwnershipStatus,
      waterSource: v.waterSource as WaterSource,
      hasElectricity: v.hasElectricity,
      toiletFacility: v.toiletFacility as ToiletFacility,
      incomeRange: v.incomeRange as IncomeRange,
      status: (v.active ? "Active" : "Inactive") as Household["status"],
    }
    if (record) {
      householdActions.update(record.id, payload)
      toast.success("Household updated", { description: record.householdNumber })
      onSaved?.({ ...record, ...payload })
    } else {
      const created = householdActions.create(payload)
      toast.success("Household created", {
        description: `${created.householdNumber} — assign members from the household profile.`,
        action: { label: "Open", onClick: () => router.push(`/households/${created.id}`) },
      })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={record ? `Edit household ${record.householdNumber}` : "New household"}
      description="Household profile used for socio-economic reporting."
      formId="household-form"
      submitLabel={record ? "Save changes" : "Create household"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="household-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Household head" columns={1}>
          <ResidentSelectField
            name="headId"
            label="Household head"
            required
            description="The head is automatically added as a member; the address is copied from the head."
          />
        </FormSection>
        <FormSection title="Address">
          <AddressFields />
        </FormSection>
        <FormSection title="Housing & utilities">
          <SelectField name="housingType" label="Housing type" required options={toOptions(HOUSING_TYPES)} />
          <SelectField name="ownershipStatus" label="Ownership status" required options={toOptions(OWNERSHIP_STATUSES)} />
          <SelectField name="waterSource" label="Water source" required options={toOptions(WATER_SOURCES)} />
          <SelectField name="toiletFacility" label="Toilet facility" required options={toOptions(TOILET_FACILITIES)} />
          <SelectField name="incomeRange" label="Monthly household income" required options={toOptions(INCOME_RANGES)} />
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <SwitchField name="hasElectricity" label="Has electricity" />
            <SwitchField name="active" label="Active household" description="Inactive households are hidden from pickers." />
          </div>
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
