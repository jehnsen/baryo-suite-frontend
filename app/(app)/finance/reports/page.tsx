import type { Metadata } from "next"
import { ReportsView } from "@/features/finance/reports-view"

export const metadata: Metadata = { title: "Financial Reports" }

export default function Page() {
  return <ReportsView />
}
