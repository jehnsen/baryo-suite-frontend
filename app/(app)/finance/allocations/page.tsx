import type { Metadata } from "next"
import { AllocationsView } from "@/features/finance/allocations-view"

export const metadata: Metadata = { title: "Budget Allocations" }

export default function Page() {
  return <AllocationsView />
}
