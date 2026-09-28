import type { Metadata } from "next"
import { BudgetView } from "@/features/finance/budget-view"

export const metadata: Metadata = { title: "Annual Budget" }

export default function Page() {
  return <BudgetView />
}
