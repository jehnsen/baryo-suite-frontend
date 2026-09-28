import type { Metadata } from "next"
import { DisbursementsView } from "@/features/finance/disbursements-view"

export const metadata: Metadata = { title: "Disbursements" }

export default function Page() {
  return <DisbursementsView />
}
