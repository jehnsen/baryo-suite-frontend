"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { MilestoneStatus, ProjectMilestone } from "@/types"
import { DateField, FormRoot, FormSection, SelectField, TextField, TextareaField } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { MILESTONE_STATUSES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { projectActions } from "@/lib/store/operations-actions"
import { isoDate, optionalIsoDate, optionalText, requiredText } from "@/lib/validation"

const schema = z
  .object({
    title: requiredText("Milestone", 160),
    targetDate: isoDate("Target date"),
    completionDate: optionalIsoDate,
    progress: z.string().regex(/^(100|[1-9]?\d)$/, "Enter 0–100"),
    status: z.enum(["Pending", "In Progress", "Completed", "Delayed"]),
    remarks: optionalText(300),
  })
  .refine((v) => v.status !== "Completed" || v.completionDate, { path: ["completionDate"], message: "Enter the completion date" })

export function MilestoneDialog({
  projectId,
  milestone,
  open,
  onOpenChange,
}: {
  projectId: string
  milestone?: ProjectMilestone
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: {
      title: milestone?.title ?? "",
      targetDate: milestone?.targetDate ?? "",
      completionDate: milestone?.completionDate ?? "",
      progress: String(milestone?.progress ?? 0),
      status: (milestone?.status ?? "Pending") as MilestoneStatus,
      remarks: milestone?.remarks ?? "",
    },
  })
  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency(350)
    const progress = v.status === "Completed" ? 100 : Number(v.progress)
    projectActions.saveMilestone(projectId, {
      id: milestone?.id,
      title: v.title,
      targetDate: v.targetDate,
      completionDate: v.completionDate || undefined,
      progress,
      status: v.status,
      remarks: v.remarks || undefined,
    })
    toast.success(milestone ? "Milestone updated" : "Milestone added")
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={milestone ? "Update milestone" : "Add milestone"}
      formId="milestone-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="milestone-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="title" label="Milestone" required className="sm:col-span-2" />
          <DateField name="targetDate" label="Target date" required />
          <DateField name="completionDate" label="Completion date" />
          <TextField name="progress" label="Progress (%)" type="number" required />
          <SelectField name="status" label="Status" required options={toOptions(MILESTONE_STATUSES)} />
          <TextareaField name="remarks" label="Remarks" className="sm:col-span-2" rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
