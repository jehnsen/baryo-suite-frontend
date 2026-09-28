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
    <Card className={cn("gap-4", className)}>
      {(title || actions) && (
        <CardHeader>
          {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
