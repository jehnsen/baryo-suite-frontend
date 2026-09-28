"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { Role, User, UserStatus } from "@/types"
import { FormRoot, FormSection, OfficialSelectField, SelectField, TextField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { useUsers } from "@/hooks/use-data"
import { ROLES, USER_STATUSES, toOptions } from "@/lib/constants"
import { ROLE_DESCRIPTIONS } from "@/lib/permissions"
import { simulateLatency, userActions } from "@/lib/store/actions"
import { emptyToUndefined, requiredText, selectRequired } from "@/lib/validation"

export function UserFormDialog({ open, onOpenChange, record, onSaved }: EntityFormProps<User>) {
  const users = useUsers()
  const schema = z.object({
    name: requiredText("Name", 100),
    email: z
      .email("Enter a valid email address")
      .refine((e) => !users.some((u) => u.email.toLowerCase() === e.toLowerCase() && u.id !== record?.id), "This email is already in use"),
    role: selectRequired("Role"),
    status: selectRequired("Status"),
    officialId: z.string(),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: record?.name ?? "",
      email: record?.email ?? "",
      role: record?.role ?? "",
      status: record?.status ?? "Invited",
      officialId: record?.officialId ?? "",
    },
  })
  const role = useWatch({ control: form.control, name: "role" }) as Role | ""

  const onSubmit = async (v: z.output<typeof schema>) => {
    await simulateLatency()
    if (record) {
      const patch = { name: v.name, email: v.email, role: v.role as Role, status: v.status as UserStatus, officialId: emptyToUndefined(v.officialId) }
      userActions.update(record.id, patch)
      toast.success("User updated", { description: v.email })
      onSaved?.({ ...record, ...patch })
    } else {
      const created = userActions.invite({ name: v.name, email: v.email, role: v.role as Role, officialId: emptyToUndefined(v.officialId) })
      toast.success("Invitation sent", { description: `${created.email} will receive a sign-in link once email is connected.` })
      onSaved?.(created)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? "Edit user" : "Invite user"}
      description="Users sign in to BaryoSuite with the permissions of their role."
      formId="user-form"
      submitLabel={record ? "Save changes" : "Send invite"}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="user-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="name" label="Full name" required className="sm:col-span-2" />
          <TextField name="email" label="Email" type="email" required className="sm:col-span-2" />
          <SelectField name="role" label="Role" required options={toOptions(ROLES)} description={role ? ROLE_DESCRIPTIONS[role] : undefined} />
          {record ? <SelectField name="status" label="Status" required options={toOptions(USER_STATUSES)} /> : <div />}
          <OfficialSelectField
            name="officialId"
            label="Linked official"
            className="sm:col-span-2"
            description="Optional — links the account to an official's profile."
          />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
