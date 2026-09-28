import type { Metadata } from "next"
import { ResidentCreatePage } from "@/features/residents/resident-create-page"

export const metadata: Metadata = { title: "Register resident" }

export default function Page() {
  return <ResidentCreatePage />
}
