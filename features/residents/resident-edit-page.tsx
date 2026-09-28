"use client"

import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import type { Resident } from "@/types"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentUser, useResidents } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { fullName } from "@/lib/format"
import { ResidentFormActionBar } from "./resident-form-action-bar"
import { ResidentFormFields, useResidentEditForm } from "./resident-form"

export function ResidentEditPage({ id }: { id: string }) {
  const load = usePageLoad()
  const resident = useResidents().find((r) => r.id === id)
  return (
    <LoadState load={load}>
      {resident ? <ResidentEditGuard resident={resident} /> : <RecordNotFound entity="Resident" backHref="/residents" backLabel="Back to residents" />}
    </LoadState>
  )
}

function ResidentEditGuard({ resident }: { resident: Resident }) {
  const router = useRouter()
  const { role, can } = useCurrentUser()

  if (!can("write")) {
    return (
      <EmptyState
        icon={Lock}
        title={`Editing residents is not available for ${role}`}
        description="Your role does not have access to this action. Contact the barangay administrator if you need access."
        className="py-24"
      />
    )
  }

  return (
    <ResidentEditFormPage resident={resident} onCancel={() => router.push(`/residents/${resident.id}`)} onSaved={() => router.push(`/residents/${resident.id}`)} />
  )
}

const FORM_ID = "resident-edit-form"

function ResidentEditFormPage({ resident, onCancel, onSaved }: { resident: Resident; onCancel: () => void; onSaved: () => void }) {
  const { form, onSubmit } = useResidentEditForm(resident, onSaved)

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Edit resident"
        description={`${resident.residentNumber} · update ${fullName(resident)}'s profile.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Residents", href: "/residents" },
          { label: fullName(resident), href: `/residents/${resident.id}` },
          { label: "Edit" },
        ]}
      />
      <ResidentFormFields form={form} formId={FORM_ID} onSubmit={onSubmit} />
      <ResidentFormActionBar formId={FORM_ID} submitLabel="Save changes" isSubmitting={form.formState.isSubmitting} onCancel={onCancel} />
    </div>
  )
}
