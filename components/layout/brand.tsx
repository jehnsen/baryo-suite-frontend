import Link from "next/link"
import { Landmark } from "lucide-react"
import { APP_NAME } from "@/lib/constants"

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Landmark className="size-4" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold tracking-tight">{APP_NAME}</span>
        {subtitle && <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
    </Link>
  )
}
