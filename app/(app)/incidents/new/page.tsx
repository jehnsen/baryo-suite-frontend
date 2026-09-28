import type { Metadata } from "next"
import { IncidentCreatePage } from "@/features/incidents/incident-create-page"

export const metadata: Metadata = { title: "Report incident" }

export default function Page() {
  return <IncidentCreatePage />
}
