import type { Metadata } from "next"
import { BlotterDetail } from "@/features/blotter/blotter-detail"

export const metadata: Metadata = { title: "Blotter case" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BlotterDetail id={id} />
}
