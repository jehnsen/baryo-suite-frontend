import type { Metadata } from "next"
import { HouseholdProfile } from "@/features/households/household-profile"

export const metadata: Metadata = { title: "Household" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <HouseholdProfile id={id} />
}
