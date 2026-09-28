import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageSkeleton } from "@/components/shared/loading-skeleton"
import { ReportSectionView } from "@/features/reports/report-section-view"
import { REPORT_SLUGS, sectionForSlug } from "@/lib/reports/sections"

export function generateStaticParams() {
  return REPORT_SLUGS.map((section) => ({ section }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  return { title: `${sectionForSlug(section)?.title ?? "Reports"} reports` }
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!sectionForSlug(section)) notFound()
  // The selected report is ?report=<id>, read with useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportSectionView slug={section} />
    </Suspense>
  )
}
