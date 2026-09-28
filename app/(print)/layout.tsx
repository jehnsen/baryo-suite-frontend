import { AccessGuard } from "@/components/layout/access-guard"
import { SessionGate } from "@/components/providers/session-gate"

/** Print pages (certificates, receipts) render without the shell but still need a session and module access. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <AccessGuard notice={false}>{children}</AccessGuard>
    </SessionGate>
  )
}
