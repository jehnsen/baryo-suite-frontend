import type { Metadata } from "next"
import { AssetDetail } from "@/features/operations/asset-detail"

export const metadata: Metadata = { title: "Asset" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AssetDetail id={id} />
}
