import type { Metadata } from "next"
import { ObligationDetail } from "@/features/finance/obligation-detail"

export const metadata: Metadata = { title: "Obligation" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ObligationDetail id={id} />
}
