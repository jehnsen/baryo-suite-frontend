"use client"

import { useMemo } from "react"
import type { Resident, Role } from "@/types"
import { PersonAvatar } from "@/components/shared/person-avatar"
import {
  useCommittees,
  useFundSources,
  useHouseholds,
  useLookups,
  useObligations,
  useOfficials,
  usePPAs,
  useResidents,
  useSessions,
  useUsers,
} from "@/hooks/use-data"
import { useLedger } from "@/hooks/use-finance"
import { computeAge, formalName, formatDate, formatPeso, fullName, officialName } from "@/lib/format"
import type { BaseFieldProps } from "./form-field"
import { EntityComboboxField, MultiSelectField } from "./fields"

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

/* ------------------------------ Phase 2 pickers ---------------------------- */

/** PPA picker showing code, category and available balance. */
export function PPASelectField({ label = "Program / Project / Activity", budgetId, ...props }: PickerProps & { budgetId?: string }) {
  const ppas = usePPAs()
  const ledger = useLedger()
  const options = useMemo(
    () =>
      ppas
        .filter((p) => (!budgetId || p.budgetId === budgetId) && p.status !== "Cancelled" && p.status !== "Completed")
        .map((p) => ({
          value: p.id,
          label: `${p.code} · ${p.name}`,
          description: `${p.category} · Available ${formatPeso(ledger.forPPA(p).available)}`,
          keywords: `${p.code} ${p.name} ${p.category}`,
        })),
    [ppas, ledger, budgetId],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search PPA code or name" emptyText="No open PPA found." />
}

export function FundSourceSelectField({ label = "Fund source", fiscalYear, ...props }: PickerProps & { fiscalYear?: number }) {
  const fundSources = useFundSources()
  const options = useMemo(
    () =>
      fundSources
        .filter((f) => !fiscalYear || f.fiscalYear === fiscalYear)
        .map((f) => ({ value: f.id, label: f.name, description: `${f.type} · ${formatPeso(f.amount)}`, keywords: `${f.type} ${f.referenceNumber}` })),
    [fundSources, fiscalYear],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search fund source" />
}

export function CommitteeSelectField({ label = "Committee", ...props }: PickerProps) {
  const committees = useCommittees()
  const { officials } = useLookups()
  const options = useMemo(
    () =>
      committees.map((c) => ({
        value: c.id,
        label: c.name.replace("Committee on ", ""),
        description: `Chair: ${officialName(officials.get(c.chairpersonId))}`,
        keywords: c.name,
      })),
    [committees, officials],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search committee" />
}

/** Approved obligations that still have an undisbursed balance. */
export function ObligationSelectField({ label = "Obligation", ...props }: PickerProps) {
  const obligations = useObligations()
  const ledger = useLedger()
  const options = useMemo(
    () =>
      obligations
        .filter((o) => o.status === "Approved" || o.status === "Partially Disbursed")
        .map((o) => {
          const balance = o.amount - ledger.disbursedForObligation(o.id)
          return {
            value: o.id,
            label: `${o.obligationNumber} · ${o.payee}`,
            description: `Undisbursed ${formatPeso(balance)} of ${formatPeso(o.amount)}`,
            keywords: `${o.obligationNumber} ${o.payee} ${o.description}`,
          }
        }),
    [obligations, ledger],
  )
  return (
    <EntityComboboxField
      {...props}
      label={label}
      options={options}
      placeholder="Search obligation no. or payee"
      emptyText="No approved obligation with a balance."
    />
  )
}

export function SessionSelectField({ label = "Session", ...props }: PickerProps) {
  const sessions = useSessions()
  const options = useMemo(
    () =>
      sessions
        .filter((s) => s.status !== "Cancelled")
        .map((s) => ({ value: s.id, label: `${s.sessionNumber} · ${s.title}`, description: formatDate(s.date, "MMMM d, yyyy"), keywords: s.sessionNumber })),
    [sessions],
  )
  return <EntityComboboxField {...props} label={label} options={options} placeholder="Search session" />
}

/** Several officials at once (committee members, attendees). */
export function OfficialMultiSelectField({ label = "Officials", ...props }: PickerProps) {
  const officials = useOfficials()
  const options = useMemo(
    () =>
      officials
        .filter((o) => o.status !== "Inactive")
        .sort((a, b) => a.rank - b.rank)
        .map((o) => ({ value: o.id, label: `${officialName(o)} (${o.position})` })),
    [officials],
  )
  return <MultiSelectField {...props} label={label} options={options} placeholder="Select officials" />
}
