import { formatPeso, formatPesoCompact } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Peso amount with consistent tabular figures. Never format currency inline in pages. */
export function Money({ value, compact, className, muted }: { value: number; compact?: boolean; className?: string; muted?: boolean }) {
  return (
    <span
      className={cn("whitespace-nowrap tabular-nums", value < 0 && "text-[var(--tone-danger)]", muted && "text-muted-foreground", className)}
      title={compact ? formatPeso(value) : undefined}
    >
      {compact ? formatPesoCompact(value) : formatPeso(value)}
    </span>
  )
}
