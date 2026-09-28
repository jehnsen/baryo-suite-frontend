import type { Metadata } from "next"
import { CertificateDetail } from "@/features/certificates/certificate-detail"

export const metadata: Metadata = { title: "Certificate" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CertificateDetail id={id} />
}
