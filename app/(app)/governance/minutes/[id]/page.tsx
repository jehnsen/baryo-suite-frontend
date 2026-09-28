import type { Metadata } from "next"
import { MinutesDetail } from "@/features/governance/minutes-detail"

export const metadata: Metadata = { title: "Minutes" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MinutesDetail id={id} />
}
