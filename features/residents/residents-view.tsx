"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import type { Resident } from "@/types"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useLookups, useResidents, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { AGE_GROUPS, CIVIL_STATUSES, GENDERS, RESIDENT_STATUSES, toOptions } from "@/lib/constants"
import { ageGroupOf, computeAge, fullName } from "@/lib/format"
import { residentActions, simulateLatency } from "@/lib/store/actions"
import { useResidentColumns } from "./resident-columns"

const yesNo = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
]
const flag = (b: boolean) => (b ? "yes" : "no")

export function ResidentsView() {
  const router = useRouter()
  const load = usePageLoad()
  const residents = useResidents()
  const settings = useSettings()
  const { households } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const [archiving, setArchiving] = useState<Resident | null>(null)
  const canWrite = can("write")

  const handlers = useMemo(
    () => ({
      households,
      canWrite,
      onView: (r: Resident) => router.push(`/residents/${r.id}`),
      onEdit: (r: Resident) => router.push(`/residents/${r.id}/edit`),
      onArchive: (r: Resident) => setArchiving(r),
      onRestore: (r: Resident) => {
        residentActions.restore(r.id)
        toast.success("Resident restored", { description: fullName(r) })
      },
      onIssueCertificate: (r: Resident) => open({ type: "certificate", defaults: { residentId: r.id } }),
      onNewRequest: (r: Resident) => open({ type: "request", defaults: { residentId: r.id } }),
    }),
    [households, open, router, canWrite],
  )
  const columns = useResidentColumns(handlers)

  const filters: DataTableFilter<Resident>[] = useMemo(
    () => [
      { id: "purok", label: "Purok", options: settings.puroks.map((p) => ({ label: p.name, value: p.name })), getValue: (r) => r.address.purok },
      { id: "gender", label: "Gender", options: toOptions(GENDERS), getValue: (r) => r.gender },
      {
        id: "age",
        label: "Age Group",
        options: AGE_GROUPS.map((g) => ({ label: g.label, value: g.label })),
        getValue: (r) => ageGroupOf(computeAge(r.birthDate)),
      },
      { id: "civil", label: "Civil Status", options: toOptions(CIVIL_STATUSES), getValue: (r) => r.civilStatus },
      {
        id: "voter",
        label: "Voter",
        options: toOptions(["Registered", "Not Registered"]),
        getValue: (r) => (r.classification.registeredVoter ? "Registered" : "Not Registered"),
      },
      { id: "senior", label: "Senior", options: yesNo, getValue: (r) => flag(r.classification.seniorCitizen) },
      { id: "pwd", label: "PWD", options: yesNo, getValue: (r) => flag(r.classification.pwd) },
      { id: "solo", label: "Solo Parent", options: yesNo, getValue: (r) => flag(r.classification.soloParent) },
      { id: "status", label: "Status", options: toOptions(RESIDENT_STATUSES), getValue: (r) => r.status },
    ],
    [settings.puroks],
  )

  const data = load.demoEmpty ? [] : residents

  return (
    <div className="space-y-6">
      <PageHeader
        title="Residents"
        description="Registry of all residents of the barangay."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Residents" }]}
        actions={
          canWrite && (
            <Button onClick={() => router.push("/residents/new")}>
              <UserPlus /> Add resident
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search name, ID or contact…",
          getText: (r) => `${r.firstName} ${r.middleName ?? ""} ${r.lastName} ${r.residentNumber} ${r.contactNumber ?? ""}`,
        }}
        filters={filters}
        onRowClick={(r) => router.push(`/residents/${r.id}`)}
        initialSorting={[{ id: "name", desc: false }]}
        initialVisibility={{ contactNumber: false }}
        empty={{
          icon: Users,
          title: "No residents registered yet",
          description: "Start building the barangay registry by adding the first resident.",
          action: canWrite ? (
            <Button size="sm" onClick={() => router.push("/residents/new")}>
              <UserPlus /> Add resident
            </Button>
          ) : undefined,
        }}
      />

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(o) => !o && setArchiving(null)}
        title="Archive resident?"
        description={
          <>
            <strong>{fullName(archiving)}</strong> will be hidden from pickers and reports. The record and its history are kept and can be restored.
          </>
        }
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          if (!archiving) return
          await simulateLatency(400)
          residentActions.archive(archiving.id)
          toast.success("Resident archived", { description: fullName(archiving) })
        }}
      />
    </div>
  )
}
