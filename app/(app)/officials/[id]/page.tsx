import type { Metadata } from "next"
import { OfficialProfile } from "@/features/officials/official-profile"

export const metadata: Metadata = { title: "Official" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OfficialProfile id={id} />
}
