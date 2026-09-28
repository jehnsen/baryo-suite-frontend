import type { Metadata } from "next"
import { ResidentsView } from "@/features/residents/residents-view"

export const metadata: Metadata = { title: "Residents" }

export default function Page() {
  return <ResidentsView />
}
