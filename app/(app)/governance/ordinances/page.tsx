import type { Metadata } from "next"
import { LegislationListView } from "@/features/governance/legislation-views"

export const metadata: Metadata = { title: "Ordinances" }

export default function Page() {
  return <LegislationListView kind="ordinance" />
}
