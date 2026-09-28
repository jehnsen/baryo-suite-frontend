import type { Metadata } from "next"
import { ResidentEditPage } from "@/features/residents/resident-edit-page"

export const metadata: Metadata = { title: "Edit resident" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResidentEditPage id={id} />
}
