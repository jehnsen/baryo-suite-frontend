import type { Metadata } from "next"
import { CollectionReceiptPrint } from "@/features/finance/collection-receipt-print"

export const metadata: Metadata = { title: "Official receipt" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CollectionReceiptPrint id={id} />
}
