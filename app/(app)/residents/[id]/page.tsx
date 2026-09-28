import type { Metadata } from "next"
import { ResidentProfile } from "@/features/residents/resident-profile"

export const metadata: Metadata = { title: "Resident profile" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResidentProfile id={id} />
}
