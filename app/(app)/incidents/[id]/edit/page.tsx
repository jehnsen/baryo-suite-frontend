import type { Metadata } from "next"
import { IncidentEditPage } from "@/features/incidents/incident-edit-page"

export const metadata: Metadata = { title: "Edit incident" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <IncidentEditPage id={id} />
}
