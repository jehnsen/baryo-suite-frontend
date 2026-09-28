"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentUser } from "@/hooks/use-data"
import { FormActionBar } from "@/components/shared/form-action-bar"
import { IncidentFormFields, useIncidentCreateForm } from "./incident-form"

export function IncidentCreatePage() {
  const router = useRouter()
  const { role, can } = useCurrentUser()

  if (!can("write")) {
    return (
      <EmptyState
        icon={Lock}
        title={`Reporting incidents is not available for ${role}`}
        description="Your role does not have access to this action. Contact the barangay administrator if you need access."
        className="py-24"
      />
    )
  }

  return <IncidentCreateFormPage onCancel={() => router.push("/incidents")} onSaved={(id) => router.push(`/incidents?open=${id}`)} />
}

const FORM_ID = "incident-create-form"

function IncidentCreateFormPage({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const { form, onSubmit } = useIncidentCreateForm((created) => onSaved(created.id))

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Report incident"
        description="Incidents are operational records. Escalate to a blotter case when a formal complaint is filed."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Incidents", href: "/incidents" }, { label: "Report" }]}
      />
      <IncidentFormFields form={form} formId={FORM_ID} onSubmit={onSubmit} />
      <FormActionBar formId={FORM_ID} submitLabel="Record incident" isSubmitting={form.formState.isSubmitting} onCancel={onCancel} />
    </div>
  )
}
