import type { Metadata } from "next"
import { AssetsView } from "@/features/operations/assets-view"

export const metadata: Metadata = { title: "Assets" }

export default function Page() {
  return <AssetsView />
}
