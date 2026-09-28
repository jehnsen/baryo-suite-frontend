import Link from "next/link"
import { Landmark } from "lucide-react"

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
        <Landmark className="size-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-xl font-semibold tracking-tight text-sidebar-foreground">
          Baryo<span className="font-normal text-sidebar-primary">Suite</span>
        </span>
        {subtitle && <span className="mt-1 block truncate text-[10px] tracking-wide text-sidebar-foreground/65">{subtitle}</span>}
      </span>
    </Link>
  )
}
