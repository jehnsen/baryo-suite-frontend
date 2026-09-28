import type { LucideIcon } from "lucide-react"
import { Circle } from "lucide-react"
import { TONE_CLASSES, type Tone } from "@/lib/status"
import { cn } from "@/lib/utils"

export interface TimelineItem {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  timestamp?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  /** Future / not-yet-reached step (rendered muted, dashed connector). */
  pending?: boolean
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => {
        const Icon = item.icon ?? Circle
        const last = i === items.length - 1
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 bottom-0 left-3.5 w-px -translate-x-1/2",
                  items[i + 1]?.pending ? "border-l border-dashed border-border bg-transparent" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                item.pending ? "border border-dashed bg-background text-muted-foreground" : TONE_CLASSES[item.tone ?? "neutral"].icon,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className={cn("text-sm font-medium", item.pending && "text-muted-foreground")}>{item.title}</p>
                {item.timestamp && <span className="text-xs text-muted-foreground tabular-nums">{item.timestamp}</span>}
              </div>
              {item.description && <div className="mt-0.5 text-sm text-muted-foreground">{item.description}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
