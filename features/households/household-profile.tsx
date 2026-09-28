"use client"

import Link from "next/link"
import { useState } from "react"
import { Droplets, Home, Pencil, Plug, Toilet, UserPlus, Users, Wallet } from "lucide-react"
import { toast } from "sonner"
import type { Household, Resident } from "@/types"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadState, RecordNotFound } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useHouseholdMembers, useHouseholds, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { computeAge, formatAddress, formatDate, fullName } from "@/lib/format"
import { householdActions, simulateLatency } from "@/lib/store/actions"
import { AssignMembersDialog } from "./assign-members-dialog"
import { HouseholdMembersTable } from "./household-members-table"

export function HouseholdProfile({ id }: { id: string }) {
  const load = usePageLoad()
  const household = useHouseholds().find((h) => h.id === id)
  return (
    <LoadState load={load}>
      {household ? (
        <HouseholdProfileContent household={household} />
      ) : (
        <RecordNotFound entity="Household" backHref="/households" backLabel="Back to households" />
      )}
    </LoadState>
  )
}

function HouseholdProfileContent({ household: h }: { household: Household }) {
  const { residents } = useLookups()
  const members = useHouseholdMembers(h.id)
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const [assignOpen, setAssignOpen] = useState(false)
  const [removing, setRemoving] = useState<Resident | null>(null)
  const head = residents.get(h.headId)
  const canWrite = can("write")
  const seniors = members.filter((m) => m.classification.seniorCitizen).length
  const minors = members.filter((m) => computeAge(m.birthDate) < 18).length
  const voters = members.filter((m) => m.classification.registeredVoter).length

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Households", href: "/households" }, { label: h.householdNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {head?.lastName ?? ""} Household <StatusBadge status={h.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{h.householdNumber}</span> · {formatAddress(h.address)}
          </>
        }
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => open({ type: "household", record: h })}>
                <Pencil /> Edit
              </Button>
              <Button onClick={() => setAssignOpen(true)}>
                <UserPlus /> Assign resident
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total members" value={members.length} icon={Users} />
        <StatCard label="Minors (below 18)" value={minors} />
        <StatCard label="Senior citizens" value={seniors} />
        <StatCard label="Registered voters" value={voters} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={`Household members (${members.length})`} className="lg:col-span-2" contentClassName="px-0">
          {members.length ? (
            <HouseholdMembersTable members={members} onRemove={canWrite ? setRemoving : undefined} />
          ) : (
            <EmptyState compact icon={Users} title="No members yet" description="Assign residents to this household." />
          )}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Profile">
            <DetailList
              columns={1}
              items={[
                {
                  label: "Household head",
                  value: head ? (
                    <Link href={`/residents/${head.id}`} className="font-medium hover:underline">
                      {fullName(head)}
                    </Link>
                  ) : undefined,
                },
                { label: "Address", value: formatAddress(h.address) },
                { label: "Purok", value: h.address.purok },
                { label: "Registered", value: formatDate(h.createdAt) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Housing & utilities">
            <ul className="space-y-3 text-sm">
              {[
                { icon: Home, label: "Housing type", value: `${h.housingType} · ${h.ownershipStatus}` },
                { icon: Droplets, label: "Water source", value: h.waterSource },
                { icon: Plug, label: "Electricity", value: h.hasElectricity ? "Connected" : "None" },
                { icon: Toilet, label: "Toilet facility", value: h.toiletFacility },
                { icon: Wallet, label: "Monthly income", value: h.incomeRange },
              ].map((i) => (
                <li key={i.label} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <i.icon className="size-3.5" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted-foreground">{i.label}</span>
                    {i.value}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <AssignMembersDialog household={h} open={assignOpen} onOpenChange={setAssignOpen} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove from household?"
        description={`${fullName(removing)} will become unassigned. Their resident record is not affected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return
          await simulateLatency(400)
          householdActions.removeMember(removing.id)
          toast.success("Member removed", { description: fullName(removing) })
        }}
      />
    </div>
  )
}
