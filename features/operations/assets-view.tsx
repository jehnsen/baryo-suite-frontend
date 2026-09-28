"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, Monitor, Pencil, Plus } from "lucide-react"
import type { Asset } from "@/types"
import { Button } from "@/components/ui/button"
import { Money } from "@/components/shared/money"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAssets, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, formatPesoCompact, officialName } from "@/lib/format"

const col = createAppColumnHelper<Asset>()

export function AssetsView() {
  const router = useRouter()
  const load = usePageLoad()
  const assets = useAssets()
  const { officials } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canEdit = can("operations")
  const inService = assets.filter((a) => a.status !== "Disposed")

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("assetNumber", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Asset No." />,
          cell: ({ row, getValue }) => (
            <Link
              href={`/assets/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs font-medium whitespace-nowrap hover:underline"
            >
              {getValue()}
            </Link>
          ),
          meta: { label: "Asset Number" },
          enableHiding: false,
        }),
        col.accessor("name", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Asset" />,
          cell: ({ row, getValue }) => (
            <div className="min-w-48">
              <p className="font-medium">{getValue()}</p>
              <p className="text-xs text-muted-foreground">{row.original.serialNumber}</p>
            </div>
          ),
          meta: { label: "Asset Name" },
        }),
        col.accessor("category", {
          header: "Category",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Category" },
        }),
        col.accessor("acquisitionDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Acquired" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Acquisition Date" },
        }),
        col.accessor("acquisitionCost", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
          cell: ({ getValue }) => <Money value={getValue()} />,
          meta: { label: "Acquisition Cost" },
        }),
        col.accessor("source", {
          header: "Source",
          cell: ({ getValue }) => <span className="line-clamp-1 max-w-44 text-muted-foreground">{getValue()}</span>,
          meta: { label: "Source" },
        }),
        col.accessor((a) => officialName(officials.get(a.custodianId)), {
          id: "custodian",
          header: "Custodian",
          cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue()}</span>,
          meta: { label: "Assigned Custodian" },
        }),
        col.accessor("location", {
          header: "Location",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Location" },
        }),
        col.accessor("condition", {
          header: "Condition",
          cell: ({ getValue }) => <StatusBadge status={getValue()} showDot={false} />,
          meta: { label: "Condition" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "Open", icon: Eye, onSelect: () => router.push(`/assets/${row.original.id}`) },
                {
                  label: "Edit",
                  icon: Pencil,
                  onSelect: () => open({ type: "asset", record: row.original }),
                  hidden: !canEdit || row.original.status === "Disposed",
                },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [officials, router, open, canEdit],
  )

  const filters: DataTableFilter<Asset>[] = useMemo(
    () => [
      { id: "category", label: "Category", options: toOptions(ASSET_CATEGORIES), getValue: (a) => a.category },
      { id: "condition", label: "Condition", options: toOptions(ASSET_CONDITIONS), getValue: (a) => a.condition },
      { id: "status", label: "Status", options: toOptions(ASSET_STATUSES), getValue: (a) => a.status },
      {
        id: "custodian",
        label: "Custodian",
        options: [...new Set(assets.map((a) => a.custodianId))].map((id) => ({ label: officialName(officials.get(id)), value: id })),
        getValue: (a) => a.custodianId,
      },
    ],
    [assets, officials],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Property, plant and equipment of the barangay and their accountable custodians."
        breadcrumbs={[{ label: "Operations" }, { label: "Assets" }]}
        actions={
          canEdit && (
            <Button onClick={() => open({ type: "asset" })}>
              <Plus /> Register asset
            </Button>
          )
        }
      />
      {!load.isLoading && !load.isError && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Assets in service" value={inService.length} icon={Monitor} />
          <StatCard label="Total acquisition cost" value={formatPesoCompact(inService.reduce((s, a) => s + a.acquisitionCost, 0))} hint="Excludes disposed" />
          <StatCard label="Under maintenance" value={assets.filter((a) => a.status === "Under Maintenance").length} />
          <StatCard
            label="Poor / unserviceable"
            value={inService.filter((a) => a.condition === "Poor" || a.condition === "Unserviceable").length}
            hint="Candidates for repair or disposal"
          />
        </div>
      )}
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : assets}
        getRowId={(a) => a.id}
        status={load.status}
        onRetry={load.retry}
        search={{
          placeholder: "Search asset no., name, serial, location…",
          getText: (a) => `${a.assetNumber} ${a.name} ${a.serialNumber ?? ""} ${a.location}`,
        }}
        filters={filters}
        onRowClick={(a) => router.push(`/assets/${a.id}`)}
        initialSorting={[{ id: "assetNumber", desc: false }]}
        initialVisibility={{ source: false, location: false }}
        empty={{ icon: Monitor, title: "No assets registered" }}
      />
    </div>
  )
}
