import type { Metadata } from "next"
import { AuditLogsView } from "@/features/audit-logs/audit-logs-view"

export const metadata: Metadata = { title: "Audit Logs" }

export default function Page() {
  return <AuditLogsView />
}
