import type { Metadata } from "next"
import { MinutesView } from "@/features/governance/minutes-view"

export const metadata: Metadata = { title: "Minutes" }

export default function Page() {
  return <MinutesView />
}
