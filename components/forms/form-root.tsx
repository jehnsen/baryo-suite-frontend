"use client"

import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FormRootProps<TFieldValues extends FieldValues, TTransformed> {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<TFieldValues, any, TTransformed>
  onSubmit: SubmitHandler<TTransformed>
  children: React.ReactNode
  className?: string
}

/**
 * Provides RHF context to the reusable field components and wires the
 * submit/invalid handlers. Pair with FormDialog/FormDrawer via `id`.
 */
export function FormRoot<TFieldValues extends FieldValues, TTransformed>({
  id,
  form,
  onSubmit,
  children,
  className,
}: FormRootProps<TFieldValues, TTransformed>) {
  return (
    <FormProvider {...form}>
      <form
        id={id}
        noValidate
        className={cn("space-y-6", className)}
        onSubmit={form.handleSubmit(onSubmit, () => toast.error("Please review the highlighted fields."))}
      >
        {children}
      </form>
    </FormProvider>
  )
}

/** Props every entity create/edit form container accepts. */
export interface EntityFormProps<TRecord, TDefaults = Partial<TRecord>> {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing. */
  record?: TRecord
  /** Prefill values when creating (e.g. resident from a profile page). */
  defaults?: TDefaults
  onSaved?: (record: TRecord) => void
}
