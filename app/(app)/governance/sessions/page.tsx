import type { Metadata } from "next"
import { SessionsView } from "@/features/governance/sessions-view"

export const metadata: Metadata = { title: "Barangay Sessions" }

export default function Page() {
  return <SessionsView />
}
