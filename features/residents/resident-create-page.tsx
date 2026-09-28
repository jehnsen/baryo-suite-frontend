"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentUser } from "@/hooks/use-data"
import { FormActionBar } from "@/components/shared/form-action-bar"
import { ResidentFormFields, useResidentCreateForm } from "./resident-form"

export function ResidentCreatePage() {
  const router = useRouter()
  const { role, can } = useCurrentUser()

  if (!can("write")) {
    return (
      <EmptyState
        icon={Lock}
        title={`Registering residents is not available for ${role}`}
        description="Your role does not have access to this action. Contact the barangay administrator if you need access."
        className="py-24"
      />
    )
  }

  return <ResidentCreateFormPage onCancel={() => router.push("/residents")} onSaved={(id) => router.push(`/residents/${id}`)} />
}

const FORM_ID = "resident-create-form"

function ResidentCreateFormPage({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const { form, onSubmit } = useResidentCreateForm(undefined, (created) => onSaved(created.id))

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Register resident"
        description="Add a new resident to the barangay registry."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Residents", href: "/residents" }, { label: "Register" }]}
      />
      <ResidentFormFields form={form} formId={FORM_ID} onSubmit={onSubmit} />
      <FormActionBar formId={FORM_ID} submitLabel="Register resident" isSubmitting={form.formState.isSubmitting} onCancel={onCancel} />
    </div>
  )
}
