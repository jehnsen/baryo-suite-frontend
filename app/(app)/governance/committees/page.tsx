import type { Metadata } from "next"
import { CommitteesView } from "@/features/governance/committees-view"

export const metadata: Metadata = { title: "Committees" }

export default function Page() {
  return <CommitteesView />
}
