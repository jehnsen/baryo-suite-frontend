import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  hint?: React.ReactNode
  /** Percentage change vs. prior period. */
  trend?: { value: number; label?: string }
  href?: string
  className?: string
  emphasis?: "primary" | "secondary"
}

export function StatCard({ label, value, icon: Icon, hint, trend, href, className, emphasis }: StatCardProps) {
  const body = (
    <Card
      size="sm"
      className={cn(
        "h-full shadow-[0_2px_8px_-4px_rgb(24_57_34/0.12)] ring-border/80 transition-all data-[size=sm]:[--card-spacing:--spacing(5)]",
        href && "group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/30 motion-reduce:transform-none",
        emphasis === "primary" && "bg-primary text-primary-foreground ring-primary",
        emphasis === "secondary" && "bg-secondary/15 ring-secondary/60",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[13px] font-medium text-muted-foreground", emphasis === "primary" && "text-primary-foreground/80")}>{label}</span>
          {Icon && (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground",
                emphasis === "primary" && "bg-primary-foreground/15 text-primary-foreground",
                emphasis === "secondary" && "bg-secondary/40 text-secondary-foreground dark:text-secondary",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</div>
        {(hint || trend) && (
          <div className={cn("flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground", emphasis === "primary" && "text-primary-foreground/80")}>
            {trend && (
              <span
                className={cn("inline-flex items-center gap-0.5 font-medium", trend.value >= 0 ? "text-[var(--tone-success)]" : "text-[var(--tone-danger)]")}
              >
                {trend.value >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(trend.value)}%
              </span>
            )}
            <span>{trend?.label ?? hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
  return href ? (
    <Link href={href} className="group block min-w-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}
