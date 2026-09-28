"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import type { Incident } from "@/types"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentUser, useIncidents } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { IncidentFormActionBar } from "./incident-form-action-bar"
import { IncidentFormFields, useIncidentEditForm } from "./incident-form"

export function IncidentEditPage({ id }: { id: string }) {
  const load = usePageLoad()
  const incident = useIncidents().find((i) => i.id === id)
  return (
    <LoadState load={load}>
      {incident ? <IncidentEditGuard incident={incident} /> : <RecordNotFound entity="Incident" backHref="/incidents" backLabel="Back to incidents" />}
    </LoadState>
  )
}

function IncidentEditGuard({ incident }: { incident: Incident }) {
  const router = useRouter()
  const { role, can } = useCurrentUser()

  if (!can("write")) {
    return (
      <EmptyState
        icon={Lock}
        title={`Editing incidents is not available for ${role}`}
        description="Your role does not have access to this action. Contact the barangay administrator if you need access."
        className="py-24"
      />
    )
  }

  return (
    <IncidentEditFormPage
      incident={incident}
      onCancel={() => router.push(`/incidents?open=${incident.id}`)}
      onSaved={() => router.push(`/incidents?open=${incident.id}`)}
    />
  )
}

const FORM_ID = "incident-edit-form"

function IncidentEditFormPage({ incident, onCancel, onSaved }: { incident: Incident; onCancel: () => void; onSaved: () => void }) {
  const { form, onSubmit } = useIncidentEditForm(incident, onSaved)

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={`Edit ${incident.incidentNumber}`}
        description="Incidents are operational records. Escalate to a blotter case when a formal complaint is filed."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Incidents", href: "/incidents" },
          { label: incident.incidentNumber, href: `/incidents?open=${incident.id}` },
          { label: "Edit" },
        ]}
      />
      <IncidentFormFields form={form} formId={FORM_ID} onSubmit={onSubmit} />
      <IncidentFormActionBar formId={FORM_ID} submitLabel="Save changes" isSubmitting={form.formState.isSubmitting} onCancel={onCancel} />
    </div>
  )
}
