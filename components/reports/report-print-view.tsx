import { Landmark } from "lucide-react"
import type { ReportData } from "@/lib/reports/data"
import { formatDateTime, officialName } from "@/lib/format"
import { formatMetric } from "@/lib/reports/format"
import type { ReportColumn, ReportGrouping, ReportMetric, Signatory } from "@/lib/reports/types"
import { APP_NAME } from "@/lib/constants"
import { StaticReportTable } from "./report-table"

interface ReportPrintViewProps<R> {
  title: string
  sectionTitle: string
  reportId: string
  period: string
  criteria: string[]
  columns: ReportColumn<R>[]
  rows: R[]
  rowId: (row: R) => string
  metrics: ReportMetric[]
  grouping?: ReportGrouping<R>
  showDetails?: boolean
  note?: string
  orientation?: "portrait" | "landscape"
  signatories: Signatory[]
  d: ReportData
  generatedBy: string
  generatedAt: Date
}

const SIGNATORY_ROLE: Record<Exclude<Signatory, "preparedBy">, { caption: string; key: "secretaryId" | "treasurerId" | "punongBarangayId"; title: string }> = {
  secretary: { caption: "Certified correct", key: "secretaryId", title: "Barangay Secretary" },
  treasurer: { caption: "Certified correct", key: "treasurerId", title: "Barangay Treasurer" },
  punongBarangay: { caption: "Noted / Approved", key: "punongBarangayId", title: "Punong Barangay" },
}

/**
 * Standard printed report: letterhead from Barangay Settings, title, period,
 * criteria, summary, full (unpaginated) data with totals, signatories and footer.
 * Only mounted while printing (see usePrintMode).
 */
export function ReportPrintView<R>(p: ReportPrintViewProps<R>) {
  const s = p.d.settings
  const printable = p.columns.filter((c) => !c.hidden && !c.screenOnly)
  return (
    <article
      className="report-print hidden bg-white font-sans text-[10.5px] leading-snug text-neutral-900 print:block [&_td]:text-[10px] [&_th]:text-[9.5px] [&_th]:text-neutral-700"
      data-orientation={p.orientation ?? (printable.length > 7 ? "landscape" : "portrait")}
    >
      {/* Letterhead */}
      <header className="flex items-center gap-4 border-b-2 border-double border-neutral-800 pb-3">
        <LetterheadMark src={s.logoUrl} label="Barangay Logo" alt={`Barangay ${s.barangayName} logo`} />
        <div className="flex-1 text-center font-serif leading-tight">
          <p className="text-[10.5px]">Republic of the Philippines</p>
          <p className="text-[10.5px]">Province of {s.province}</p>
          <p className="text-[10.5px]">{s.municipality}</p>
          <p className="mt-0.5 text-[15px] font-bold tracking-wide uppercase">Barangay {s.barangayName}</p>
          <p className="font-sans text-[9px] text-neutral-600">
            {s.address} · {s.contactNumber} · {s.email}
          </p>
        </div>
        <LetterheadMark src={s.municipalityLogoUrl} label="Municipal Seal" alt={`${s.municipality} seal`} />
      </header>

      {/* Title block */}
      <div className="mt-4 text-center">
        <p className="text-[9px] tracking-[0.18em] text-neutral-500 uppercase">{p.sectionTitle} report</p>
        <h1 className="text-[16px] font-bold tracking-wide uppercase">{p.title}</h1>
        <p className="mt-0.5 text-[11px] font-medium">{p.period}</p>
        {p.criteria.length > 0 && <p className="mt-0.5 text-[9.5px] text-neutral-600">{p.criteria.join(" · ")}</p>}
      </div>
      <div className="mt-2 flex justify-between border-y border-neutral-300 py-1 text-[9px] text-neutral-600">
        <span>
          Generated {formatDateTime(p.generatedAt)} by {p.generatedBy}
        </span>
        <span>
          {p.rows.length} {p.rows.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {/* Summary */}
      {p.metrics.length > 0 && (
        <dl className="mt-3 grid break-inside-avoid grid-cols-4 gap-x-4 gap-y-1.5">
          {p.metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-2 border-b border-dotted border-neutral-300 pb-0.5">
              <dt className="text-neutral-600">{m.label}</dt>
              <dd className="font-semibold tabular-nums">{formatMetric(m)}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Data */}
      <div className="mt-4 [&_[data-slot=table-container]]:overflow-visible">
        {p.rows.length ? (
          <StaticReportTable columns={printable} rows={p.rows} rowId={p.rowId} d={p.d} grouping={p.grouping} showDetails={p.showDetails} variant="print" />
        ) : (
          <p className="py-6 text-center text-neutral-500">No records match the selected filters.</p>
        )}
      </div>
      {p.note && <p className="mt-2 text-[9px] text-neutral-600 italic">Note: {p.note}</p>}

      {/* Signatories */}
      <div className="mt-10 grid break-inside-avoid gap-8" style={{ gridTemplateColumns: `repeat(${p.signatories.length}, minmax(0, 1fr))` }}>
        {p.signatories.map((sig) => {
          const role = sig === "preparedBy" ? null : SIGNATORY_ROLE[sig]
          const name = role ? officialName(p.d.by.official.get(s[role.key]), true) : p.generatedBy
          return (
            <div key={sig}>
              <p className="text-[9.5px] text-neutral-600">{role ? role.caption : "Prepared by"}:</p>
              <p className="mt-8 border-t border-neutral-800 pt-1 text-center font-semibold uppercase">{name}</p>
              <p className="text-center text-[9.5px]">{role ? role.title : "BaryoSuite user"}</p>
            </div>
          )
        })}
      </div>

      <footer className="mt-6 border-t border-neutral-300 pt-1 text-center text-[8.5px] text-neutral-500">
        System-generated by {APP_NAME} from the records of Barangay {s.barangayName} · Report ID: {p.reportId} · Figures reflect data as of{" "}
        {formatDateTime(p.generatedAt)}
      </footer>
    </article>
  )
}

/** Letterhead crest — renders the configured image, or an icon placeholder while unset. */
function LetterheadMark({ src, label, alt }: { src?: string; label: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full border border-neutral-400 text-neutral-500">
        <Landmark className="size-6" strokeWidth={1.4} aria-hidden />
        <span className="mt-0.5 text-[7px] tracking-wide uppercase">{label}</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size printable document, not a responsive page image
    <img src={src} alt={alt} className="size-16 shrink-0 rounded-full object-cover" />
  )
}
