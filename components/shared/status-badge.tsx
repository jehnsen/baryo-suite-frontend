import { cn } from "@/lib/utils"
import { TONE_CLASSES, toneFor, type Tone } from "@/lib/status"

interface StatusBadgeProps {
  status: string
  /** Override the tone resolved from the central status map. */
  tone?: Tone
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, tone, className, showDot = true }: StatusBadgeProps) {
  const t = TONE_CLASSES[tone ?? toneFor(status)]
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap", t.badge, className)}>
      {showDot && <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />}
      {status}
    </span>
  )
}

/** Neutral outline chip for classifications/tags (Senior, PWD, Voter…). */
export function TagBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground", className)}>
      {children}
    </span>
  )
}
