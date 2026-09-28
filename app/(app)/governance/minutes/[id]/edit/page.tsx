import type { Metadata } from "next"
import { MinutesEditor } from "@/features/governance/minutes-editor"

export const metadata: Metadata = { title: "Edit minutes" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MinutesEditor id={id} />
}
