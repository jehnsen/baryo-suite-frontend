import type { Metadata } from "next"
import { LegislationListView } from "@/features/governance/legislation-views"

export const metadata: Metadata = { title: "Resolutions" }

export default function Page() {
  return <LegislationListView kind="resolution" />
}
