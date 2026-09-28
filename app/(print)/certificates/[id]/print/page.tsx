import type { Metadata } from "next"
import { CertificatePrintView } from "@/features/certificates/certificate-print-view"

export const metadata: Metadata = { title: "Print certificate" }

export default async function CertificatePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CertificatePrintView id={id} />
}
