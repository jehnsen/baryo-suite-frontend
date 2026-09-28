"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { BarangaySession, MotionResult } from "@/types"
import { FormRoot, FormSection, OfficialSelectField, SelectField, TextField, TextareaField } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { MOTION_RESULTS, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { newId } from "@/lib/store/helpers"
import { barangaySessionActions } from "@/lib/store/governance-actions"
import { requiredText, selectRequired } from "@/lib/validation"

const num = z.string().regex(/^\d*$/, "Enter a number")
const schema = z.object({
  agendaItemId: z.string(),
  text: requiredText("Motion", 400),
  movedById: selectRequired("Moved by"),
  secondedById: z.string(),
  result: selectRequired("Result"),
  votesFor: num,
  votesAgainst: num,
  abstentions: num,
  decision: z.string().max(300),
})

/** Record a motion (and optional decision) against an agenda item. */
export function MotionDialog({ session, open, onOpenChange }: { session: BarangaySession; open: boolean; onOpenChange: (o: boolean) => void }) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      agendaItemId: "",
      text: "",
      movedById: "",
      secondedById: "",
      result: "Carried",
      votesFor: "",
      votesAgainst: "",
      abstentions: "",
      decision: "",
    },
  })
  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency(350)
    const n = (x: string) => (x === "" ? undefined : Number(x))
    barangaySessionActions.update(session.id, {
      motions: [
        ...session.motions,
        {
          id: newId("mo"),
          agendaItemId: v.agendaItemId || undefined,
          text: v.text,
          movedById: v.movedById,
          secondedById: v.secondedById || undefined,
          result: v.result as MotionResult,
          votesFor: n(v.votesFor),
          votesAgainst: n(v.votesAgainst),
          abstentions: n(v.abstentions),
        },
      ],
      decisions: v.decision.trim() ? [...session.decisions, v.decision.trim()] : session.decisions,
    })
    toast.success("Motion recorded", { description: v.result })
    form.reset()
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record motion"
      description={session.sessionNumber}
      formId="motion-form"
      submitLabel="Record motion"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="motion-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <SelectField
            name="agendaItemId"
            label="Agenda item"
            className="sm:col-span-2"
            options={session.agenda.map((a) => ({ label: `${a.order}. ${a.title}`, value: a.id }))}
          />
          <TextareaField name="text" label="Motion" required className="sm:col-span-2" rows={2} placeholder="To approve …" />
          <OfficialSelectField name="movedById" label="Moved by" required />
          <OfficialSelectField name="secondedById" label="Seconded by" />
          <SelectField name="result" label="Result" required options={toOptions(MOTION_RESULTS)} />
          <div className="grid grid-cols-3 gap-2">
            <TextField name="votesFor" label="For" type="number" />
            <TextField name="votesAgainst" label="Against" type="number" />
            <TextField name="abstentions" label="Abstain" type="number" />
          </div>
          <TextField name="decision" label="Decision (optional)" className="sm:col-span-2" placeholder="Recorded in the session's decisions" />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
