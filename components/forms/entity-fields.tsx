"use client"

import { useMemo } from "react"
import type { Resident, Role } from "@/types"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { useHouseholds, useLookups, useOfficials, useResidents, useUsers } from "@/hooks/use-data"
import { computeAge, formalName, fullName, officialName } from "@/lib/format"
import type { BaseFieldProps } from "./form-field"
import { EntityComboboxField } from "./fields"

type PickerProps = Omit<BaseFieldProps, "label"> & { label?: string }

export function ResidentSelectField({
  label = "Resident",
  filter,
  excludeIds,
  ...props
}: PickerProps & { filter?: (r: Resident) => boolean; excludeIds?: string[] }) {
  const residents = useResidents()
  const options = useMemo(
    () =>
      residents
        .filter((r) => r.status === "Active" && (!filter || filter(r)) && !excludeIds?.includes(r.id))
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map((r) => ({
          value: r.id,
          label: formalName(r),
          description: `${r.residentNumber} · ${computeAge(r.birthDate)} yrs · ${r.address.purok}`,
          keywords: `${r.residentNumber} ${r.firstName} ${r.lastName}`,
          leading: <PersonAvatar name={fullName(r)} size="xs" />,
        })),
    [residents, filter, excludeIds],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search by name or resident no." emptyText="No active resident found." />
}

export function HouseholdSelectField({ label = "Household", ...props }: PickerProps) {
  const households = useHouseholds()
  const { residents } = useLookups()
  const options = useMemo(
    () =>
      households
        .filter((h) => h.status === "Active")
        .map((h) => {
          const head = residents.get(h.headId)
          return {
            value: h.id,
            label: `${h.householdNumber} · ${head ? head.lastName + " Household" : "—"}`,
            description: `Head: ${fullName(head)} · ${h.address.purok}`,
            keywords: `${h.householdNumber} ${head?.firstName ?? ""} ${head?.lastName ?? ""}`,
          }
        }),
    [households, residents],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search by household no. or head" emptyText="No household found." />
}

export function OfficialSelectField({ label = "Official", activeOnly = true, ...props }: PickerProps & { activeOnly?: boolean }) {
  const officials = useOfficials()
  const options = useMemo(
    () =>
      officials
        .filter((o) => !activeOnly || o.status !== "Inactive")
        .sort((a, b) => a.rank - b.rank)
        .map((o) => ({
          value: o.id,
          label: officialName(o),
          description: o.position + (o.committee ? ` · ${o.committee}` : ""),
          keywords: o.position,
          leading: <PersonAvatar name={fullName(o)} size="xs" />,
        })),
    [officials, activeOnly],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search official" />
}

export function UserSelectField({ label = "User", roles, ...props }: PickerProps & { roles?: Role[] }) {
  const users = useUsers()
  const options = useMemo(
    () =>
      users
        .filter((u) => u.status === "Active" && (!roles || roles.includes(u.role)))
        .map((u) => ({ value: u.id, label: u.name, description: u.role, keywords: u.email, leading: <PersonAvatar name={u.name} size="xs" /> })),
    [users, roles],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search staff" />
}
