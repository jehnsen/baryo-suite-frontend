import type { Metadata } from "next"
import { DisbursementDetail } from "@/features/finance/disbursement-detail"

export const metadata: Metadata = { title: "Disbursement" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DisbursementDetail id={id} />
}
