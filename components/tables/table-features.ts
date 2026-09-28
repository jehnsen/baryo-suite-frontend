import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"

export interface AppColumnMeta {
  /** Human label for the column-visibility menu (defaults to the column id). */
  label?: string
  /** Applied to both <th> and <td>. */
  className?: string
}

/**
 * The single feature set shared by every table in the app. Search and faceted
 * filtering happen before rows reach TanStack (see DataTable), so only
 * sorting, pagination and visibility are registered here.
 */
export const appTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: {} as AppColumnMeta,
})

export type AppTableFeatures = typeof appTableFeatures

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppColumnDef<TData extends RowData> = ColumnDef<AppTableFeatures, TData, any>

export const createAppColumnHelper = <TData extends RowData>() => createColumnHelper<AppTableFeatures, TData>()
