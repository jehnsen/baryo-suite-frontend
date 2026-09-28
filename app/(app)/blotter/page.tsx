import type { Metadata } from "next"
import { BlotterView } from "@/features/blotter/blotter-view"

export const metadata: Metadata = { title: "Blotter" }

export default function Page() {
  return <BlotterView />
}
