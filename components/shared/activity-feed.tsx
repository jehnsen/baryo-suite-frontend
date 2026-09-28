import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Activity } from "lucide-react"
import { TONE_CLASSES, type Tone } from "@/lib/status"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "./empty-state"

export interface ActivityItem {
  id: string
  actor: string
  action: string
  target?: string
  href?: string
  timestamp: string
  icon?: LucideIcon
  tone?: Tone
}

export function ActivityFeed({ items, className, emptyLabel = "No activity yet" }: { items: ActivityItem[]; className?: string; emptyLabel?: string }) {
  if (items.length === 0) return <EmptyState compact icon={Activity} title={emptyLabel} />
  return (
    <ul className={cn("divide-y", className)}>
      {items.map((item) => {
        const Icon = item.icon ?? Activity
        return (
          <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
            <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[item.tone ?? "neutral"].icon)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{item.actor}</span> <span className="text-muted-foreground">{item.action}</span>{" "}
                {item.target &&
                  (item.href ? (
                    <Link href={item.href} className="font-medium hover:underline">
                      {item.target}
                    </Link>
                  ) : (
                    <span className="font-medium">{item.target}</span>
                  ))}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(item.timestamp)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
