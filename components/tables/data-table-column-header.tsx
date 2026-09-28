"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type { Column, RowData } from "@tanstack/react-table"
import type { AppTableFeatures } from "./table-features"
import { cn } from "@/lib/utils"

interface Props<TData extends RowData, TValue> {
  column: Column<AppTableFeatures, TData, TValue>
  title: string
  className?: string
}

/** Sortable header button. Use as `header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />`. */
export function DataTableColumnHeader<TData extends RowData, TValue>({ column, title, className }: Props<TData, TValue>) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>
  const sorted = column.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground",
        sorted && "text-foreground",
        className,
      )}
    >
      {title}
      <Icon className={cn("size-3.5", !sorted && "text-muted-foreground/60")} />
    </button>
  )
}
