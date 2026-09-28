"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Project } from "@/types"
import { DateField, FormRoot, FormSection, OfficialSelectField, PPASelectField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDrawer } from "@/components/shared/form-drawer"
import { Money } from "@/components/shared/money"
import { usePPAs, useProjects } from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { ppaApproved } from "@/lib/finance"
import { simulateLatency } from "@/lib/store/actions"
import { projectActions } from "@/lib/store/operations-actions"
import { isoDate, optionalText, requiredText, selectRequired } from "@/lib/validation"

/** Budget and fund source come from the linked PPA — the project form never duplicates them. */
export function ProjectFormDrawer({ open, onOpenChange, record, defaults }: EntityFormProps<Project, { ppaId?: string }>) {
  const router = useRouter()
  const ppas = usePPAs()
  const projects = useProjects()
  const ledger = useLedger()
  const taken = new Set(projects.filter((p) => p.id !== record?.id).map((p) => p.ppaId))

  const schema = z
    .object({
      ppaId: selectRequired("PPA").refine((id) => !taken.has(id), "This PPA already has a project record"),
      name: requiredText("Project name", 140),
      description: optionalText(800),
      location: requiredText("Location", 160),
      contractor: requiredText("Contractor / supplier", 120),
      responsibleOfficialId: selectRequired("Responsible official"),
      startDate: isoDate("Start date"),
      targetDate: isoDate("Target date"),
    })
    .refine((v) => v.targetDate >= v.startDate, { path: ["targetDate"], message: "Must be on or after the start date" })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      ppaId: record?.ppaId ?? defaults?.ppaId ?? "",
      name: record?.name ?? "",
      description: record?.description ?? "",
      location: record?.location ?? "",
      contractor: record?.contractor ?? "",
      responsibleOfficialId: record?.responsibleOfficialId ?? "",
      startDate: record?.startDate ?? "",
      targetDate: record?.targetDate ?? "",
    },
  })
  const ppaId = useWatch({ control: form.control, name: "ppaId" })
  const ppa = ppas.find((p) => p.id === ppaId)

  useEffect(() => {
    if (!ppa || record) return
    if (!form.getValues("name")) form.setValue("name", ppa.name)
    if (!form.getValues("description")) form.setValue("description", ppa.description)
    form.setValue("responsibleOfficialId", ppa.responsibleOfficialId)
    form.setValue("startDate", ppa.startDate)
    form.setValue("targetDate", ppa.targetCompletion)
  }, [ppa, form, record])

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    if (record) {
      projectActions.update(record.id, v)
      toast.success("Project updated", { description: record.code })
    } else {
      const p = projectActions.create(v)
      toast.success("Project created", { description: p.code, action: { label: "Open", onClick: () => router.push(`/projects/${p.id}`) } })
    }
    onOpenChange(false)
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.code}` : "New project"}
      description="Execution record for a Project-type PPA."
      formId="project-form"
      submitLabel={record ? "Save changes" : "Create project"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="project-form" form={form} onSubmit={onSubmit}>
        <FormSection title="Funding" columns={1}>
          <PPASelectField name="ppaId" label="Programs, projects & activities" required disabled={Boolean(record)} />
          {ppa && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <span>
                <span className="block text-xs text-muted-foreground">Budget (from PPA)</span>
                <Money value={ppaApproved(ppa)} className="font-medium" />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">Obligated</span>
                <Money value={ledger.forPPA(ppa).obligated} />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">Category</span>
                {ppa.category}
              </span>
            </div>
          )}
        </FormSection>
        <FormSection title="Project">
          <TextField name="name" label="Project name" required className="sm:col-span-2" />
          <TextareaField name="description" label="Description" className="sm:col-span-2" rows={3} />
          <TextField name="location" label="Location" required />
          <TextField name="contractor" label="Contractor / supplier" required />
          <OfficialSelectField name="responsibleOfficialId" label="Responsible official" required />
          <div />
          <DateField name="startDate" label="Start date" required />
          <DateField name="targetDate" label="Target completion" required />
        </FormSection>
      </FormRoot>
    </FormDrawer>
  )
}
