import type { Metadata } from "next"
import { PPADetail } from "@/features/finance/ppa-detail"

export const metadata: Metadata = { title: "PPA monitoring" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PPADetail id={id} />
}
