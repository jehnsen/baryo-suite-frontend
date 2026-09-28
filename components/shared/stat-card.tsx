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
}

export function StatCard({ label, value, icon: Icon, hint, trend, href, className }: StatCardProps) {
  const body = (
    <Card size="sm" className={cn("h-full transition-colors", href && "hover:bg-muted/40", className)}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon className="size-3.5" />
            </span>
          )}
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</div>
        {(hint || trend) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn("inline-flex items-center gap-0.5 font-medium", trend.value >= 0 ? "text-[var(--tone-success)]" : "text-[var(--tone-danger)]")}
              >
                {trend.value >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(trend.value)}%
              </span>
            )}
            <span className="truncate">{trend?.label ?? hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}
