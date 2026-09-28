"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecordNotFound } from "@/components/shared/load-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { useCertificates, useLookups, useSettings } from "@/hooks/use-data"
import { CertificateDocument } from "./certificate-document"

export function CertificatePrintView({ id }: { id: string }) {
  const certificate = useCertificates().find((c) => c.id === id)
  const settings = useSettings()
  const { residents, officials } = useLookups()
  const resident = certificate ? residents.get(certificate.residentId) : undefined

  if (!certificate || !resident) {
    return <RecordNotFound entity="Certificate" backHref="/certificates" backLabel="Back to certificates" />
  }

  return (
    <div className="min-h-dvh bg-muted/50 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/certificates/${certificate.id}`}>
            <ArrowLeft /> Back
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-mono">{certificate.certificateNumber}</span>
          <StatusBadge status={certificate.status} />
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <div className="overflow-x-auto p-4 sm:p-8 print:overflow-visible print:p-0">
        <div className="min-w-[640px] print:min-w-0">
          <CertificateDocument
            certificate={certificate}
            resident={resident}
            settings={settings}
            punongBarangay={officials.get(settings.punongBarangayId)}
            preparedBy={officials.get(certificate.issuedById)}
            className="print:aspect-auto print:h-[297mm] print:w-[210mm]"
          />
        </div>
      </div>
    </div>
  )
}
