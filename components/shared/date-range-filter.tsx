"use client"

import { format, parseISO, startOfMonth, subDays } from "date-fns"
import { CalendarRange, X } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toISODate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface DateRangeValue {
  from?: string
  to?: string
}

const PRESETS = [
  { label: "Today", range: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 days", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
]

export function DateRangeFilter({
  value,
  onChange,
  label = "Date",
  className,
}: {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  label?: string
  className?: string
}) {
  const selected: DateRange | undefined = value.from ? { from: parseISO(value.from), to: value.to ? parseISO(value.to) : undefined } : undefined
  const active = Boolean(value.from)
  const text = active
    ? `${format(parseISO(value.from!), "MMM d")}${value.to && value.to !== value.from ? ` – ${format(parseISO(value.to), "MMM d, yyyy")}` : ", " + format(parseISO(value.from!), "yyyy")}`
    : label

  const setRange = (r?: DateRange) =>
    onChange({ from: r?.from ? toISODate(r.from) : undefined, to: r?.to ? toISODate(r.to) : r?.from ? toISODate(r.from) : undefined })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8", !active && "border-dashed", className)}>
          <CalendarRange className="text-muted-foreground" />
          <span className={cn(!active && "text-foreground")}>{text}</span>
          {active && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date range"
              className="-mr-1 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange({})
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation()
                  onChange({})
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col gap-0 p-0 sm:flex-row" align="start">
        <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:flex-col sm:border-r sm:border-b-0">
          {PRESETS.map((p) => (
            <Button key={p.label} variant="ghost" size="sm" className="justify-start" onClick={() => setRange(p.range())}>
              {p.label}
            </Button>
          ))}
        </div>
        <Calendar mode="range" selected={selected} onSelect={setRange} numberOfMonths={1} defaultMonth={selected?.from} />
      </PopoverContent>
    </Popover>
  )
}

/** Inclusive check of an ISO date/timestamp against a DateRangeValue. */
export function isWithinRange(iso: string, range: DateRangeValue): boolean {
  const day = iso.slice(0, 10)
  if (range.from && day < range.from) return false
  if (range.to && day > range.to) return false
  return true
}
