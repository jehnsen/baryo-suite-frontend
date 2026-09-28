"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, Home, HousePlus, Pencil } from "lucide-react"
import type { Household } from "@/types"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useHouseholds, useLookups, useResidents, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { HOUSING_TYPES, INCOME_RANGES, toOptions } from "@/lib/constants"
import { formalName, formatAddress, fullName } from "@/lib/format"

interface HouseholdRow extends Household {
  headName: string
  memberNames: string[]
  size: number
}

const col = createAppColumnHelper<HouseholdRow>()

export function HouseholdsView() {
  const router = useRouter()
  const load = usePageLoad()
  const households = useHouseholds()
  const allResidents = useResidents()
  const settings = useSettings()
  const { residents } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canWrite = can("write")

  const rows: HouseholdRow[] = useMemo(() => {
    const byHousehold = new Map<string, string[]>()
    allResidents.forEach((r) => {
      if (r.householdId && r.status !== "Archived") byHousehold.set(r.householdId, [...(byHousehold.get(r.householdId) ?? []), fullName(r)])
    })
    return households.map((h) => ({
      ...h,
      headName: formalName(residents.get(h.headId)),
      memberNames: byHousehold.get(h.id) ?? [],
      size: byHousehold.get(h.id)?.length ?? 0,
    }))
  }, [households, allResidents, residents])

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("householdNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Household No." />,
          cell: ({ row, getValue }) => (
            <Link href={`/households/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs font-medium hover:underline">
              {getValue()}
            </Link>
          ),
          meta: { label: "Household No." },
          enableHiding: false,
        }),
        col.accessor("headName", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Household Head" />,
          cell: ({ getValue }) => <span className="font-medium whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Household Head" },
        }),
        col.accessor((h) => formatAddress(h.address, { includePurok: false }), {
          id: "address",
          header: "Address",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-64 text-muted-foreground">{getValue()}</span>,
          meta: { label: "Address" },
        }),
        col.accessor((h) => h.address.purok, {
          id: "purok",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Purok" />,
          meta: { label: "Purok" },
        }),
        col.accessor("memberNames", {
          header: "Members",
          cell: ({ getValue }) => {
            const names = getValue()
            return (
              <span className="line-clamp-1 max-w-72 text-muted-foreground">
                {names
                  .slice(0, 3)
                  .map((n) => n.split(" ")[0])
                  .join(", ")}
                {names.length > 3 ? ` +${names.length - 3}` : ""}
              </span>
            )
          },
          enableSorting: false,
          meta: { label: "Members" },
        }),
        col.accessor("size", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
          meta: { label: "Household Size" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "View household", icon: Eye, onSelect: () => router.push(`/households/${row.original.id}`) },
                { label: "Edit", icon: Pencil, onSelect: () => open({ type: "household", record: row.original }), hidden: !canWrite },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
          enableSorting: false,
        }),
      ]),
    [router, open, canWrite],
  )

  const filters: DataTableFilter<HouseholdRow>[] = useMemo(
    () => [
      { id: "purok", label: "Purok", options: settings.puroks.map((p) => ({ label: p.name, value: p.name })), getValue: (h) => h.address.purok },
      { id: "housing", label: "Housing", options: toOptions(HOUSING_TYPES), getValue: (h) => h.housingType },
      { id: "income", label: "Income", options: toOptions(INCOME_RANGES), getValue: (h) => h.incomeRange },
      {
        id: "size",
        label: "Size",
        options: toOptions(["1–2", "3–4", "5–6", "7+"]),
        getValue: (h) => (h.size <= 2 ? "1–2" : h.size <= 4 ? "3–4" : h.size <= 6 ? "5–6" : "7+"),
      },
      { id: "status", label: "Status", options: toOptions(["Active", "Inactive"]), getValue: (h) => h.status },
    ],
    [settings.puroks],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        description="Household profiles and their members."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Households" }]}
        actions={
          canWrite && (
            <Button onClick={() => open({ type: "household" })}>
              <HousePlus /> Add household
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : rows}
        getRowId={(h) => h.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search household no., head, member or street…",
          getText: (h) => `${h.householdNumber} ${h.headName} ${h.memberNames.join(" ")} ${h.address.street}`,
        }}
        filters={filters}
        onRowClick={(h) => router.push(`/households/${h.id}`)}
        initialSorting={[{ id: "householdNumber", desc: false }]}
        empty={{
          icon: Home,
          title: "No households yet",
          description: "Create a household and assign residents to it.",
          action: canWrite ? (
            <Button size="sm" onClick={() => open({ type: "household" })}>
              <HousePlus /> Add household
            </Button>
          ) : undefined,
        }}
      />
    </div>
  )
}
