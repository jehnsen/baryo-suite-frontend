"use client"

import { Download, FileSpreadsheet, FileText, Printer, Sheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ExportFormat } from "@/lib/reports/export"

/** CSV now; Excel and PDF are queued placeholders until the reporting service exists. */
export function ExportMenu({ onExport, disabled }: { onExport: (format: ExportFormat) => void; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled}>
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Filtered rows, all columns</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onExport("csv")}>
          <FileText /> Export CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onExport("excel")}>
          <FileSpreadsheet /> Export Excel <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("pdf")}>
          <Sheet /> Export PDF <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Report actions: print (standard layout) and export. */
export function ReportToolbar({ onPrint, onExport, disabled }: { onPrint: () => void; onExport: (format: ExportFormat) => void; disabled?: boolean }) {
  return (
    <>
      <Button variant="outline" onClick={onPrint} disabled={disabled}>
        <Printer /> Print
      </Button>
      <ExportMenu onExport={onExport} disabled={disabled} />
    </>
  )
}
