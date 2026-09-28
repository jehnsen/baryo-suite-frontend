import { cn } from "@/lib/utils"

export interface DetailItem {
  label: string
  value: React.ReactNode
  /** Span the full row (long text such as narratives). */
  full?: boolean
}

/** Label/value grid used by every profile and detail view. */
export function DetailList({ items, columns = 2, className }: { items: DetailItem[]; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0 space-y-1.5 border-b border-border/60 pb-3", item.full && "sm:col-span-full")}>
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground">{item.label}</dt>
          <dd className="text-sm leading-relaxed break-words">
            {item.value === undefined || item.value === null || item.value === "" ? <span className="text-muted-foreground">—</span> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
