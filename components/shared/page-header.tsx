import { Breadcrumbs, type Crumb } from "./breadcrumbs"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  className?: string
  icon?: LucideIcon
}

export function PageHeader({ title, description, breadcrumbs, actions, className, icon: Icon }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between",
          Icon && "welcome-panel rounded-2xl border border-primary/10 p-5 sm:p-6",
        )}
      >
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-card/70 text-primary sm:flex">
              <Icon className="size-6" strokeWidth={1.6} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-balance sm:text-3xl">{title}</h1>
            {description && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 xl:max-w-[50%]">{actions}</div>}
      </div>
    </div>
  )
}
