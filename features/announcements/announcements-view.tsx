"use client"

import { useMemo, useState } from "react"
import { Archive, BellRing, Eye, Megaphone, Pencil, Plus, Send } from "lucide-react"
import { toast } from "sonner"
import type { Announcement, AnnouncementStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { DetailDrawer } from "@/components/shared/detail-drawer"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge, TagBadge } from "@/components/shared/status-badge"
import { DataTable, type DataTableFilter } from "@/components/tables/data-table"
import { DataTableColumnHeader } from "@/components/tables/data-table-column-header"
import { RowActions } from "@/components/tables/row-actions"
import { createAppColumnHelper } from "@/components/tables/table-features"
import { useEntityDialogs } from "@/components/providers/entity-dialogs-provider"
import { useAnnouncements, useCurrentUser, useLookups } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_STATUSES, toOptions } from "@/lib/constants"
import { formatDate, formatDateTime, toISODate } from "@/lib/format"
import { announcementActions } from "@/lib/store/actions"
import { cn } from "@/lib/utils"

const col = createAppColumnHelper<Announcement>()

const isExpired = (a: Announcement) => Boolean(a.expirationDate && a.expirationDate < toISODate(new Date()))

export function AnnouncementsView() {
  const load = usePageLoad()
  const announcements = useAnnouncements()
  const { users } = useLookups()
  const { open } = useEntityDialogs()
  const { can } = useCurrentUser()
  const canWrite = can("write")
  const [viewId, setViewId] = useState<string | null>(null)
  const viewing = announcements.find((a) => a.id === viewId)

  const setStatus = (a: Announcement, s: AnnouncementStatus) => {
    announcementActions.setStatus(a.id, s)
    toast.success(s === "Published" ? "Announcement published" : "Announcement archived", { description: a.title })
  }

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("title", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
          cell: ({ row, getValue }) => (
            <div className="max-w-md min-w-64">
              <p className="line-clamp-1 font-medium">
                {row.original.category === "Emergency" && <Megaphone className="mr-1.5 inline size-3.5 text-[var(--tone-danger)]" />}
                {getValue()}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            </div>
          ),
          meta: { label: "Title" },
          enableHiding: false,
        }),
        col.accessor("category", {
          header: "Category",
          cell: ({ getValue }) => (
            <TagBadge className={cn(getValue() === "Emergency" && "border-[var(--tone-danger)]/40 text-[var(--tone-danger)]")}>{getValue()}</TagBadge>
          ),
          meta: { label: "Category" },
        }),
        col.accessor((a) => (a.audience === "Selected Purok" ? (a.puroks ?? []).join(", ") : a.audience), {
          id: "audience",
          header: "Audience",
          cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue()}</span>,
          meta: { label: "Audience" },
        }),
        col.accessor("publishDate", {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Publish Date" />,
          cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{formatDate(getValue())}</span>,
          meta: { label: "Publish Date" },
        }),
        col.accessor("expirationDate", {
          header: "Expires",
          cell: ({ row, getValue }) => (
            <span className={cn("whitespace-nowrap tabular-nums", isExpired(row.original) && "text-muted-foreground line-through")}>
              {formatDate(getValue())}
            </span>
          ),
          meta: { label: "Expiration Date" },
        }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} />, meta: { label: "Status" } }),
        col.display({
          id: "actions",
          cell: ({ row }) => {
            const a = row.original
            return (
              <RowActions
                actions={[
                  { label: "Preview", icon: Eye, onSelect: () => setViewId(a.id) },
                  { label: "Edit", icon: Pencil, onSelect: () => open({ type: "announcement", record: a }), hidden: !canWrite },
                  { label: "Publish", icon: Send, onSelect: () => setStatus(a, "Published"), hidden: !canWrite || a.status === "Published" },
                  { label: "Archive", icon: Archive, onSelect: () => setStatus(a, "Archived"), hidden: !canWrite || a.status === "Archived", separator: true },
                ]}
              />
            )
          },
          meta: { className: "w-10" },
          enableHiding: false,
        }),
      ]),
    [open, canWrite],
  )

  const filters: DataTableFilter<Announcement>[] = useMemo(
    () => [
      { id: "category", label: "Category", options: toOptions(ANNOUNCEMENT_CATEGORIES), getValue: (a) => a.category },
      { id: "audience", label: "Audience", options: toOptions(ANNOUNCEMENT_AUDIENCES), getValue: (a) => a.audience },
      { id: "status", label: "Status", options: toOptions(ANNOUNCEMENT_STATUSES), getValue: (a) => a.status },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Advisories and notices for residents of the barangay."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Announcements" }]}
        actions={
          canWrite && (
            <Button onClick={() => open({ type: "announcement" })}>
              <Plus /> New announcement
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={load.demoEmpty ? [] : announcements}
        getRowId={(a) => a.id}
        status={load.status}
        onRetry={load.retry}
        search={{ placeholder: "Search announcements…", getText: (a) => `${a.title} ${a.description}` }}
        filters={filters}
        dateFilter={{ label: "Publish date", getDate: (a) => a.publishDate }}
        onRowClick={(a) => setViewId(a.id)}
        initialSorting={[{ id: "publishDate", desc: true }]}
        empty={{
          icon: BellRing,
          title: "No announcements yet",
          description: "Post advisories, health notices and emergency alerts for residents.",
          action: canWrite ? (
            <Button size="sm" onClick={() => open({ type: "announcement" })}>
              New announcement
            </Button>
          ) : undefined,
        }}
      />

      <DetailDrawer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewId(null)}
        title={viewing?.title}
        meta={
          viewing && (
            <>
              <StatusBadge status={viewing.status} />
              <TagBadge>{viewing.category}</TagBadge>
              {isExpired(viewing) && <TagBadge>Expired</TagBadge>}
            </>
          )
        }
        footer={
          viewing &&
          canWrite && (
            <>
              <Button variant="outline" onClick={() => open({ type: "announcement", record: viewing })}>
                <Pencil /> Edit
              </Button>
              {viewing.status !== "Archived" && (
                <Button variant="outline" onClick={() => setStatus(viewing, "Archived")}>
                  <Archive /> Archive
                </Button>
              )}
              {viewing.status !== "Published" && (
                <Button onClick={() => setStatus(viewing, "Published")}>
                  <Send /> Publish
                </Button>
              )}
            </>
          )
        }
      >
        {viewing && (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-line">{viewing.description}</p>
            <DetailList
              items={[
                {
                  label: "Audience",
                  value: viewing.audience === "Selected Purok" ? `Selected purok: ${(viewing.puroks ?? []).join(", ")}` : viewing.audience,
                  full: true,
                },
                { label: "Publish date", value: formatDate(viewing.publishDate, "MMMM d, yyyy") },
                { label: "Expiration", value: viewing.expirationDate ? formatDate(viewing.expirationDate, "MMMM d, yyyy") : "No expiration" },
                { label: "Posted by", value: users.get(viewing.authorId)?.name },
                { label: "Created", value: formatDateTime(viewing.createdAt) },
              ]}
            />
          </>
        )}
      </DetailDrawer>
    </div>
  )
}
