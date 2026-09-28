import type { Metadata } from "next"
import { HouseholdsView } from "@/features/households/households-view"

export const metadata: Metadata = { title: "Households" }

export default function Page() {
  return <HouseholdsView />
}
