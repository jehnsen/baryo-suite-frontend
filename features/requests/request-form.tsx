"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { RequestChannel, ServiceRequest, ServiceType } from "@/types"
import { FormRoot, FormSection, ResidentSelectField, SelectField, TextField, TextareaField, UserSelectField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { REQUEST_CHANNELS, SERVICE_TYPES, toOptions } from "@/lib/constants"
import { requestActions, simulateLatency } from "@/lib/store/actions"
import { emptyToUndefined, optionalText, requiredText, selectRequired } from "@/lib/validation"

const schema = z.object({
  residentId: selectRequired("Resident"),
  service: selectRequired("Service"),
  purpose: requiredText("Purpose", 160),
  details: optionalText(500),
  channel: selectRequired("Channel"),
  assignedToId: z.string(),
})

export function RequestFormDialog({ open, onOpenChange, defaults, onSaved }: EntityFormProps<ServiceRequest, { residentId?: string }>) {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { residentId: defaults?.residentId ?? "", service: "", purpose: "", details: "", channel: "Walk-in", assignedToId: "" },
  })

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    const created = requestActions.create({
      residentId: v.residentId,
      service: v.service as ServiceType,
      purpose: v.purpose,
      details: emptyToUndefined(v.details),
      channel: v.channel as RequestChannel,
      assignedToId: emptyToUndefined(v.assignedToId),
    })
    toast.success("Service request filed", {
      description: `${created.requestNumber} · ${created.service}`,
      action: { label: "Open", onClick: () => router.push(`/requests/${created.id}`) },
    })
    onSaved?.(created)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New service request"
      description="Log a walk-in, phone or online request from a resident."
      formId="request-form"
      submitLabel="File request"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="request-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <ResidentSelectField name="residentId" required className="sm:col-span-2" />
          <SelectField name="service" label="Service" required options={toOptions(SERVICE_TYPES)} />
          <SelectField name="channel" label="Channel" required options={toOptions(REQUEST_CHANNELS)} />
          <TextField name="purpose" label="Purpose" required className="sm:col-span-2" placeholder="e.g. Local employment" />
          <TextareaField name="details" label="Details" className="sm:col-span-2" rows={3} placeholder="Additional information from the resident" />
          <UserSelectField
            name="assignedToId"
            label="Assign to"
            roles={["Secretary", "Encoder", "Administrator"]}
            className="sm:col-span-2"
            description="Optional — unassigned requests appear in the queue."
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
