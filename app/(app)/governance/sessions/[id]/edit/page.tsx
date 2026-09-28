import type { Metadata } from "next"
import { SessionFormPage } from "@/features/governance/session-form"

export const metadata: Metadata = { title: "Edit session" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SessionFormPage id={id} />
}
