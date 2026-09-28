import type { Metadata } from "next"
import { LegislationDetail } from "@/features/governance/legislation-views"

export const metadata: Metadata = { title: "Resolution" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LegislationDetail kind="resolution" id={id} />
}
