"use client"

import Link from "next/link"
import { ChevronRight, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { TONE_CLASSES } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { FinanceAlert } from "./use-finance-alerts"

const ICONS = { danger: CircleAlert, warning: TriangleAlert, info: Info, purple: Info, success: CircleCheck, neutral: Info } as const

export function FinanceAlerts({ alerts, limit }: { alerts: FinanceAlert[]; limit?: number }) {
  if (alerts.length === 0) return <EmptyState compact icon={CircleCheck} title="No alerts" description="Budgets, approvals and collections are in order." />
  return (
    <ul className="divide-y">
      {alerts.slice(0, limit).map((a) => {
        const Icon = ICONS[a.tone]
        return (
          <li key={a.id}>
            <Link href={a.href} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60">
              <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[a.tone].icon)}>
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block text-xs text-muted-foreground">{a.description}</span>
              </span>
              <ChevronRight className="mt-1 size-4 text-muted-foreground" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
