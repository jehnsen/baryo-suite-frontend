import type { Metadata } from "next"
import { SessionFormPage } from "@/features/governance/session-form"

export const metadata: Metadata = { title: "Schedule session" }

export default function Page() {
  return <SessionFormPage />
}
