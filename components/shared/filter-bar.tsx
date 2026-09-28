"use client"

import { Check, ListFilter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface FilterConfig {
  id: string
  label: string
  options: FilterOption[]
}

export type FilterValues = Record<string, string[]>

interface FacetedFilterProps {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

/** Multi-select filter pill (Popover + Command). */
export function FacetedFilter({ label, options, selected, onChange }: FacetedFilterProps) {
  const set = new Set(selected)
  const toggle = (value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(Array.from(next))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 border-dashed", set.size > 0 && "border-solid")}>
          <ListFilter className="text-muted-foreground" />
          {label}
          {set.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              {set.size > 2 ? (
                <span className="rounded-sm bg-accent px-1 text-xs font-medium text-accent-foreground">{set.size} selected</span>
              ) : (
                options
                  .filter((o) => set.has(o.value))
                  .map((o) => (
                    <span key={o.value} className="rounded-sm bg-accent px-1 text-xs font-medium text-accent-foreground">
                      {o.label}
                    </span>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {options.length > 6 && <CommandInput placeholder={label} />}
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const active = set.has(o.value)
                return (
                  <CommandItem key={o.value} onSelect={() => toggle(o.value)} data-checked={active}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {active && <Check className="size-3 text-current" />}
                    </span>
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {set.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface FilterBarProps {
  filters: FilterConfig[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  /** Extra filter controls (e.g. DateRangeFilter) rendered inline. */
  children?: React.ReactNode
  /** Whether non-faceted children currently hold a value (enables Reset). */
  extraActive?: boolean
  onReset?: () => void
}

export function FilterBar({ filters, values, onChange, children, extraActive, onReset }: FilterBarProps) {
  const active = extraActive || Object.values(values).some((v) => v.length > 0)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <FacetedFilter key={f.id} label={f.label} options={f.options} selected={values[f.id] ?? []} onChange={(v) => onChange({ ...values, [f.id]: v })} />
      ))}
      {children}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => {
            onChange({})
            onReset?.()
          }}
        >
          Reset
          <X />
        </Button>
      )}
    </div>
  )
}
