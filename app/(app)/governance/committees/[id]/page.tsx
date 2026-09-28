import type { Metadata } from "next"
import { CommitteeDetail } from "@/features/governance/committee-detail"

export const metadata: Metadata = { title: "Committee" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CommitteeDetail id={id} />
}
