"use client"

import { useMemo, useState } from "react"
import { Columns3, Download, FileSpreadsheet, FileText, SearchX } from "lucide-react"
import { toast } from "sonner"
import { useTable, type PaginationState, type RowData, type SortingState, type ColumnVisibilityState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { FilterBar, type FilterConfig, type FilterValues } from "@/components/shared/filter-bar"
import { DateRangeFilter, isWithinRange, type DateRangeValue } from "@/components/shared/date-range-filter"
import { Pagination } from "@/components/shared/pagination"
import { SearchInput } from "@/components/shared/search-input"
import { TableSkeleton } from "@/components/shared/loading-skeleton"
import type { LoadStatus } from "@/hooks/use-page-load"
import { cn } from "@/lib/utils"
import { appTableFeatures, type AppColumnDef } from "./table-features"

export interface DataTableFilter<TData> extends Omit<FilterConfig, "options"> {
  options: { label: string; value: string }[]
  /** Value(s) of this row for the facet; a row matches if any selected value is present. */
  getValue: (row: TData) => string | string[] | undefined
}

export interface DataTableProps<TData extends RowData> {
  columns: AppColumnDef<TData>[]
  data: TData[]
  getRowId?: (row: TData) => string
  status?: LoadStatus
  onRetry?: () => void
  search?: { placeholder?: string; getText: (row: TData) => string }
  filters?: DataTableFilter<TData>[]
  dateFilter?: { label?: string; getDate: (row: TData) => string }
  /** Buttons rendered at the right of the toolbar. */
  toolbarActions?: React.ReactNode
  /** Shown when the dataset itself is empty (not when filters hide everything). */
  empty?: { icon?: React.ComponentProps<typeof EmptyState>["icon"]; title: string; description?: string; action?: React.ReactNode }
  onRowClick?: (row: TData) => void
  initialSorting?: SortingState
  initialVisibility?: ColumnVisibilityState
  pageSize?: number
  /** Show the export menu (placeholder until the reporting API exists). */
  exportable?: boolean
  className?: string
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  status = "ready",
  onRetry,
  search,
  filters = [],
  dateFilter,
  toolbarActions,
  empty,
  onRowClick,
  initialSorting = [],
  initialVisibility = {},
  pageSize = 10,
  exportable = true,
  className,
}: DataTableProps<TData>) {
  const [query, setQuery] = useState("")
  const [filterValues, setFilterValues] = useState<FilterValues>({})
  const [dateRange, setDateRange] = useState<DateRangeValue>({})
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(initialVisibility)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))

  // Search / facets / date run before TanStack so any module can filter on derived values.
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    const activeFacets = filters.filter((f) => (filterValues[f.id]?.length ?? 0) > 0)
    return data.filter((row) => {
      if (q && search && !normalize(search.getText(row)).includes(q)) return false
      for (const f of activeFacets) {
        const v = f.getValue(row)
        const values = Array.isArray(v) ? v : v === undefined ? [] : [v]
        if (!values.some((x) => filterValues[f.id].includes(x))) return false
      }
      if (dateFilter && (dateRange.from || dateRange.to) && !isWithinRange(dateFilter.getDate(row), dateRange)) return false
      return true
    })
  }, [data, query, filters, filterValues, search, dateFilter, dateRange])

  // Facet counts over the whole dataset.
  const filterConfigs: FilterConfig[] = useMemo(
    () =>
      filters.map((f) => {
        const counts = new Map<string, number>()
        data.forEach((row) => {
          const v = f.getValue(row)
          ;(Array.isArray(v) ? v : v === undefined ? [] : [v]).forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1))
        })
        return { id: f.id, label: f.label, options: f.options.map((o) => ({ ...o, count: counts.get(o.value) ?? 0 })) }
      }),
    [filters, data],
  )

  const table = useTable({
    features: appTableFeatures,
    columns,
    data: filtered,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
  })

  const hidableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide())
  const isFiltered = query.length > 0 || Object.values(filterValues).some((v) => v.length) || Boolean(dateRange.from)
  const rows = table.getRowModel().rows

  const exportPlaceholder = (format: string) =>
    toast.info(`${format} export queued`, {
      description: `${filtered.length} records will be exported once the reporting service is connected.`,
    })

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {search && (
            <SearchInput
              value={query}
              onChange={(v) => {
                setQuery(v)
                resetPage()
              }}
              placeholder={search.placeholder}
            />
          )}
          {(filterConfigs.length > 0 || dateFilter) && (
            <FilterBar
              filters={filterConfigs}
              values={filterValues}
              onChange={(v) => {
                setFilterValues(v)
                resetPage()
              }}
              extraActive={Boolean(dateRange.from)}
              onReset={() => setDateRange({})}
            >
              {dateFilter && (
                <DateRangeFilter
                  label={dateFilter.label}
                  value={dateRange}
                  onChange={(v) => {
                    setDateRange(v)
                    resetPage()
                  }}
                />
              )}
            </FilterBar>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hidableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Columns3 /> <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hidableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {column.columnDef.meta?.label ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {exportable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download /> <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportPlaceholder("CSV")}>
                  <FileText /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportPlaceholder("Excel")}>
                  <FileSpreadsheet /> Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportPlaceholder("PDF")}>
                  <FileText /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {toolbarActions}
        </div>
      </div>

      {/* Body */}
      {status === "loading" ? (
        <TableSkeleton rows={Math.min(pageSize, 8)} columns={Math.min(columns.length, 6)} className="[&>div:first-child]:hidden" />
      ) : status === "error" ? (
        <div className="rounded-lg border bg-card">
          <ErrorState onRetry={onRetry} />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState icon={empty?.icon} title={empty?.title ?? "No records yet"} description={empty?.description} action={empty?.action} />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id} className="hover:bg-transparent">
                    {group.headers.map((header) => (
                      <TableHead key={header.id} className={cn("h-9 text-xs font-medium text-muted-foreground", header.column.columnDef.meta?.className)}>
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={table.getVisibleLeafColumns().length}>
                      <EmptyState
                        compact
                        icon={SearchX}
                        title="No matching records"
                        description={isFiltered ? "Try adjusting your search or filters." : undefined}
                        action={
                          isFiltered ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setQuery("")
                                setFilterValues({})
                                setDateRange({})
                              }}
                            >
                              Clear filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} onClick={onRowClick ? () => onRowClick(row.original) : undefined} className={cn(onRowClick && "cursor-pointer")}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cn("py-2.5", cell.column.columnDef.meta?.className)}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            totalItems={filtered.length}
            onPageChange={(i) => setPagination((p) => ({ ...p, pageIndex: i }))}
            onPageSizeChange={(s) => setPagination({ pageIndex: 0, pageSize: s })}
          />
        </>
      )}
    </div>
  )
}
