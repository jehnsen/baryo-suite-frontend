import type { Metadata } from "next"
import { FinanceDashboard } from "@/features/finance/finance-dashboard"

export const metadata: Metadata = { title: "Finance Dashboard" }

export default function Page() {
  return <FinanceDashboard />
}
