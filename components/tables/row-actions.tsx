"use client"

import { Fragment } from "react"
import type { LucideIcon } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface RowAction {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  destructive?: boolean
  hidden?: boolean
  disabled?: boolean
  /** Render a separator before this item. */
  separator?: boolean
}

/** Kebab menu for table rows; stops propagation so row clicks don't fire. */
export function RowActions({ actions, label = "Row actions" }: { actions: RowAction[]; label?: string }) {
  const visible = actions.filter((a) => !a.hidden)
  if (visible.length === 0) return null
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {visible.map((a) => (
            <Fragment key={a.label}>
              {a.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={a.onSelect} variant={a.destructive ? "destructive" : "default"} disabled={a.disabled}>
                {a.icon && <a.icon />}
                {a.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
