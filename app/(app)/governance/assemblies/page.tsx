import type { Metadata } from "next"
import { AssembliesView } from "@/features/governance/assemblies-view"

export const metadata: Metadata = { title: "Barangay Assemblies" }

export default function Page() {
  return <AssembliesView />
}
