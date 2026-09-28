import type { Metadata } from "next"
import { ObligationsView } from "@/features/finance/obligations-view"

export const metadata: Metadata = { title: "Obligations" }

export default function Page() {
  return <ObligationsView />
}
