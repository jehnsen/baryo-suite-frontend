"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatNumber } from "@/lib/format"

interface PaginationProps {
  pageIndex: number
  pageSize: number
  totalItems: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({ pageIndex, pageSize, totalItems, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(totalItems, (pageIndex + 1) * pageSize)
  const canPrev = pageIndex > 0
  const canNext = pageIndex < pageCount - 1

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm sm:flex-row">
      <p className="text-muted-foreground tabular-nums">
        Showing{" "}
        <span className="font-medium text-foreground">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{" "}
        of <span className="font-medium text-foreground">{formatNumber(totalItems)}</span>
      </p>
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-muted-foreground tabular-nums">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(0)}
            disabled={!canPrev}
            aria-label="First page"
            className="hidden sm:inline-flex"
          >
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(pageIndex - 1)} disabled={!canPrev} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(pageIndex + 1)} disabled={!canNext} aria-label="Next page">
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={!canNext}
            aria-label="Last page"
            className="hidden sm:inline-flex"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
