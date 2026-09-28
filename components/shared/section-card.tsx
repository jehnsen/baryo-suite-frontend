import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

/** Card with a compact header row — the standard container for content sections. */
export function SectionCard({ title, description, actions, children, className, contentClassName }: SectionCardProps) {
  return (
    <Card className={cn("gap-5 shadow-[0_2px_8px_-4px_rgb(24_57_34/0.12)] ring-border/80 [--card-spacing:--spacing(5)]", className)}>
      {(title || actions) && (
        <CardHeader>
          {title && <CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle>}
          {description && <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
