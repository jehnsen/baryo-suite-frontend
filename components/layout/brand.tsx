import Image from "next/image"
import Link from "next/link"

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50">
      <span className="size-10 shrink-0 overflow-hidden rounded-xl shadow-sm">
        <Image src="/logo/brgy-busilac-logo.jpeg" alt="Barangay Busilac logo" width={40} height={40} className="size-10 object-cover" priority />
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
