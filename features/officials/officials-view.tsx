"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, LayoutGrid, List, Pencil, Phone, ShieldCheck, UserPlus } from "lucide-react"
import type { BarangayOfficial, OfficialPosition } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { StatCardsSkeleton } from "@/components/shared/loading-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { SearchInput } from "@/components/shared/search-input"
import { StatusBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useCurrentUser, useOfficials } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { OFFICIAL_POSITIONS, OFFICIAL_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, fullName, officialName } from "@/lib/format"

const GROUPS: { label: string; positions: OfficialPosition[] }[] = [
  { label: "Punong Barangay", positions: ["Punong Barangay"] },
  { label: "Sangguniang Barangay Members", positions: ["Kagawad", "SK Chairperson"] },
  { label: "Appointed Officials", positions: ["Barangay Secretary", "Barangay Treasurer"] },
  { label: "Barangay Tanod", positions: ["Barangay Tanod"] },
  { label: "Staff", positions: ["Staff"] },
]

const col = createAppColumnHelper<BarangayOfficial>()

function OfficialCard({ o }: { o: BarangayOfficial }) {
  return (
    <Link href={`/officials/${o.id}`} className="group block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card size="sm" className="h-full transition-colors group-hover:bg-muted/40">
        <CardContent className="flex items-start gap-3">
          <PersonAvatar name={fullName(o)} src={o.photoUrl} size="md" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate font-medium">{officialName(o, true)}</p>
            <p className="text-xs text-muted-foreground">{o.position}</p>
            {o.committee && <p className="line-clamp-1 text-xs text-muted-foreground">{o.committee}</p>}
            <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground tabular-nums">
              <Phone className="size-3" /> {o.contactNumber}
            </p>
          </div>
          {o.status !== "Active" && <StatusBadge status={o.status} />}
        </CardContent>
      </Card>
    </Link>
  )
}

export function OfficialsView() {
  const router = useRouter()
  const load = usePageLoad()
  const officials = useOfficials()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canAdmin = can("admin")
  const [view, setView] = useState<"grid" | "table">("grid")
  const [query, setQuery] = useState("")
  const sorted = useMemo(() => [...(load.demoEmpty ? [] : officials)].sort((a, b) => a.rank - b.rank), [officials, load.demoEmpty])
  const visible = sorted.filter((o) => `${fullName(o)} ${o.position} ${o.committee ?? ""}`.toLowerCase().includes(query.toLowerCase()))

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor((o) => fullName(o), {
          id: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => (
            <div className="flex items-center gap-2.5">
              <PersonAvatar name={fullName(row.original)} src={row.original.photoUrl} />
              <span className="font-medium whitespace-nowrap">{officialName(row.original, true)}</span>
            </div>
          ),
          meta: { label: "Name" },
          enableHiding: false,
        }),
        col.accessor("position", { header: "Position", meta: { label: "Position" } }),
        col.accessor("committee", {
          header: "Committee",
          cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() ?? "—"}</span>,
          meta: { label: "Committee" },
        }),
        col.accessor("contactNumber", {
          header: "Contact",
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{getValue()}</span>,
          meta: { label: "Contact Number" },
        }),
        col.accessor("termStart", { header: "Term Start", cell: ({ getValue }) => formatDate(getValue()), meta: { label: "Term Start" } }),
        col.accessor("termEnd", { header: "Term End", cell: ({ getValue }) => formatDate(getValue()), meta: { label: "Term End" } }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => (
            <RowActions
              actions={[
                { label: "View profile", icon: Eye, onSelect: () => router.push(`/officials/${row.original.id}`) },
                { label: "Edit", icon: Pencil, onSelect: () => open({ type: "official", record: row.original }), hidden: !canAdmin },
              ]}
            />
          ),
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [router, open, canAdmin],
  )

  const filters: DataTableFilter<BarangayOfficial>[] = useMemo(
    () => [
      { id: "position", label: "Position", options: toOptions(OFFICIAL_POSITIONS), getValue: (o) => o.position },
      { id: "status", label: "Status", options: toOptions(OFFICIAL_STATUSES), getValue: (o) => o.status },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barangay Officials"
        description="Elected and appointed officials, tanods and staff for the current term."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Officials" }]}
        actions={
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as "grid" | "table")} aria-label="View">
              <ToggleGroupItem value="grid" aria-label="Directory view">
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
            {canAdmin && (
              <Button onClick={() => open({ type: "official" })}>
                <UserPlus /> Add official
              </Button>
            )}
          </>
        }
      />

      {view === "table" ? (
        <DataTable
          columns={columns}
          data={sorted}
          getRowId={(o) => o.id}
          status={load.status}
          onRetry={load.retry}
          search={{ placeholder: "Search name, position, committee…", getText: (o) => `${fullName(o)} ${o.position} ${o.committee ?? ""}` }}
          filters={filters}
          onRowClick={(o) => router.push(`/officials/${o.id}`)}
          pageSize={20}
          empty={{ icon: ShieldCheck, title: "No officials recorded" }}
        />
      ) : load.isLoading ? (
        <StatCardsSkeleton count={8} />
      ) : load.isError ? (
        <ErrorState onRetry={load.retry} />
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState icon={ShieldCheck} title="No officials recorded" description="Add the Punong Barangay, Kagawads and appointed officials." />
        </Card>
      ) : (
        <div className="space-y-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, position, committee…" />
          {visible.length === 0 && <EmptyState compact title="No matching officials" />}
          {GROUPS.map((g) => {
            const members = visible.filter((o) => g.positions.includes(o.position))
            if (members.length === 0) return null
            return (
              <section key={g.label} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {g.label} <span className="font-normal">({members.length})</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {members.map((o) => (
                    <OfficialCard key={o.id} o={o} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
