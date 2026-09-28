import type { Metadata } from "next"
import { AssemblyDetail } from "@/features/governance/assembly-detail"

export const metadata: Metadata = { title: "Barangay Assembly" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AssemblyDetail id={id} />
}
