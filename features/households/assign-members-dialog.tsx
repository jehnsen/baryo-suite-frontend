"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Household, HouseholdRelationship } from "@/types"
import { FormRoot, FormSection, ResidentSelectField, SelectField } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useResidents } from "@/hooks/use-data"
import { RELATIONSHIPS, toOptions } from "@/lib/constants"
import { fullName } from "@/lib/format"
import { householdActions, simulateLatency } from "@/lib/store/actions"
import { selectRequired } from "@/lib/validation"

const schema = z.object({
  residentId: selectRequired("Resident"),
  relationship: selectRequired("Relationship"),
})

/** Household assignment step of the core workflow. */
export function AssignMembersDialog({ household, open, onOpenChange }: { household: Household; open: boolean; onOpenChange: (o: boolean) => void }) {
  const residents = useResidents()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { residentId: "", relationship: "" }, mode: "onTouched" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency(400)
    const r = residents.find((x) => x.id === v.residentId)
    const moving = r?.householdId && r.householdId !== household.id
    householdActions.assignMembers(household.id, [{ residentId: v.residentId, relationship: v.relationship as HouseholdRelationship }])
    toast.success("Member assigned", {
      description: `${fullName(r)} added to ${household.householdNumber}${moving ? " (moved from previous household)" : ""}. Address updated to the household address.`,
    })
    form.reset({ residentId: "", relationship: "" })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset({ residentId: "", relationship: "" })
        onOpenChange(o)
      }}
      size="sm"
      title="Assign resident"
      description={`Add a resident to household ${household.householdNumber}.`}
      formId="assign-member-form"
      submitLabel="Assign"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="assign-member-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          <ResidentSelectField
            name="residentId"
            required
            filter={(r) => r.householdId !== household.id}
            description="Unassigned residents are listed along with members of other households."
          />
          <SelectField name="relationship" label="Relationship to head" required options={toOptions(RELATIONSHIPS.filter((x) => x !== "Head"))} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
