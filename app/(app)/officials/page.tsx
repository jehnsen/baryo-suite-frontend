import type { Metadata } from "next"
import { OfficialsView } from "@/features/officials/officials-view"

export const metadata: Metadata = { title: "Officials" }

export default function Page() {
  return <OfficialsView />
}
