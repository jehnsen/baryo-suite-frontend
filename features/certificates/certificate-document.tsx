import { format, parseISO } from "date-fns"
import type { BarangayOfficial, BarangaySettings, Certificate, Resident } from "@/types"
import { computeAge, formatAddress, formatDate, formatPeso, fullName, officialName } from "@/lib/format"
import { cn } from "@/lib/utils"

interface CertificateDocumentProps {
  certificate: Certificate
  resident: Resident
  settings: BarangaySettings
  punongBarangay?: BarangayOfficial
  preparedBy?: BarangayOfficial
  className?: string
}

const TITLES: Record<Certificate["type"], string> = {
  "Barangay Clearance": "Barangay Clearance",
  "Certificate of Residency": "Certificate of Residency",
  "Certificate of Indigency": "Certificate of Indigency",
  "Certificate of Good Moral Character": "Certificate of Good Moral Character",
  "Business Clearance": "Barangay Business Clearance",
  "First Time Job Seeker Certificate": "Barangay Certification",
}

function Body({ c, r, s }: { c: Certificate; r: Resident; s: BarangaySettings }) {
  const name = <strong className="uppercase">{fullName(r)}</strong>
  const pronoun = r.gender === "Male" ? "he" : "she"
  const Pronoun = r.gender === "Male" ? "He" : "She"
  const place = `Barangay ${s.barangayName}, ${s.municipality}, ${s.province}`
  const intro = (
    <>
      This is to certify that {name}, {computeAge(r.birthDate)} years of age, {r.civilStatus.toLowerCase()}, {r.nationality}, is a bona fide resident of{" "}
      {formatAddress(r.address)}, {place}
    </>
  )
  const purpose = <strong>{c.purpose}</strong>

  switch (c.type) {
    case "Barangay Clearance":
      return (
        <>
          <p>{intro}.</p>
          <p>
            This further certifies that {pronoun} is known to me to be of good moral character and a law-abiding citizen of this community, and that {pronoun}{" "}
            has <strong>no derogatory record</strong> on file in this office as of this date.
          </p>
          <p>This clearance is issued upon the request of the above-named person for {purpose} and for whatever legal purpose it may serve.</p>
        </>
      )
    case "Certificate of Residency":
      return (
        <>
          <p>
            {intro}, and has been residing in this barangay for{" "}
            <strong>
              {r.yearsOfResidency} year{r.yearsOfResidency === 1 ? "" : "s"}
            </strong>
            .
          </p>
          <p>This certification is issued upon the request of the above-named person for {purpose} and for whatever legal purpose it may serve.</p>
        </>
      )
    case "Certificate of Indigency":
      return (
        <>
          <p>{intro}.</p>
          <p>
            This further certifies that {pronoun} belongs to an <strong>indigent family</strong> in this barangay whose income is not sufficient to meet the
            family&apos;s basic needs.
          </p>
          <p>This certification is issued upon the request of the above-named person for {purpose}.</p>
        </>
      )
    case "Certificate of Good Moral Character":
      return (
        <>
          <p>{intro}.</p>
          <p>
            {Pronoun} is personally known to the undersigned to be a person of <strong>good moral character</strong>, peaceful and law-abiding, and has not been
            involved in any activity inimical to the welfare of the community.
          </p>
          <p>This certification is issued upon the request of the above-named person for {purpose}.</p>
        </>
      )
    case "Business Clearance":
      return (
        <>
          <p>
            This is to certify that {name}, of {formatAddress(r.address)}, {place}, is hereby granted <strong>BARANGAY BUSINESS CLEARANCE</strong> for:
          </p>
          <p className="text-center font-semibold uppercase">{c.purpose}</p>
          <p>
            The business has complied with the requirements of this barangay and is located within its territorial jurisdiction. This clearance is issued
            pursuant to Section 152(c) of the Local Government Code of 1991 and is subject to revocation for violation of barangay ordinances.
          </p>
        </>
      )
    case "First Time Job Seeker Certificate":
      return (
        <>
          <p>
            {intro}, for {r.yearsOfResidency} year{r.yearsOfResidency === 1 ? "" : "s"}.
          </p>
          <p>
            This further certifies that {pronoun} is a <strong>qualified availee of Republic Act No. 11261</strong>, otherwise known as the{" "}
            <em>First Time Jobseekers Assistance Act of 2019</em>, and has signed the Oath of Undertaking in the presence of the undersigned.
          </p>
          <p>This certification is valid only for one (1) year from the date of issuance and may be used only once.</p>
        </>
      )
  }
}

/** Printable A4 certificate following common Philippine barangay formatting. */
export function CertificateDocument({ certificate: c, resident: r, settings: s, punongBarangay, preparedBy, className }: CertificateDocumentProps) {
  const issued = parseISO(c.dateIssued)
  return (
    <article
      className={cn(
        "relative mx-auto flex aspect-[210/297] w-full max-w-[794px] flex-col bg-white px-[7%] py-[6%] font-serif text-[13px] leading-relaxed text-neutral-900 shadow-sm ring-1 ring-black/10 print:max-w-none print:shadow-none print:ring-0",
        className,
      )}
    >
      {c.status === "Cancelled" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 border-4 border-red-600/40 px-6 py-2 font-sans text-6xl font-bold tracking-widest text-red-600/40">CANCELLED</span>
        </div>
      )}
      {(c.status === "Draft" || c.status === "Pending") && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 font-sans text-7xl font-bold tracking-widest text-neutral-900/[0.06]">{c.status.toUpperCase()}</span>
        </div>
      )}

      {/* Letterhead */}
      <header className="flex items-center justify-between gap-4 border-b-2 border-double border-neutral-800 pb-4">
        <LetterheadMark src={s.logoUrl} label="Barangay Logo" alt={`Barangay ${s.barangayName} logo`} />
        <div className="text-center leading-snug">
          <p className="text-[12px]">Republic of the Philippines</p>
          <p className="text-[12px]">Province of {s.province}</p>
          <p className="text-[12px]">{s.municipality}</p>
          <p className="mt-1 text-[17px] font-bold tracking-wide uppercase">Barangay {s.barangayName}</p>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase">Office of the Punong Barangay</p>
          <p className="mt-0.5 font-sans text-[10px] text-neutral-600">
            {s.contactNumber} · {s.email}
          </p>
        </div>
        <LetterheadMark src={s.municipalityLogoUrl} label="Municipal Seal" alt={`${s.municipality} seal`} />
      </header>

      <h1 className="mt-8 text-center text-[22px] font-bold tracking-[0.12em] uppercase">{TITLES[c.type]}</h1>
      <p className="mt-6 font-semibold">TO WHOM IT MAY CONCERN:</p>

      <div className="mt-4 space-y-4 text-justify indent-10">
        <Body c={c} r={r} s={s} />
        <p>
          Issued this <strong>{format(issued, "do")}</strong> day of <strong>{format(issued, "MMMM, yyyy")}</strong> at Barangay {s.barangayName},{" "}
          {s.municipality}, {s.province}, Philippines.
        </p>
      </div>

      {/* Signatures */}
      <div className="mt-auto grid grid-cols-2 items-end gap-8 pt-10">
        <div className="space-y-6">
          <div className="flex items-end gap-4">
            <div className="flex size-20 items-center justify-center border border-neutral-400 font-sans text-[9px] text-neutral-500">Right Thumbmark</div>
            <div className="flex-1 text-center">
              <div className="border-b border-neutral-800" />
              <p className="mt-1 font-sans text-[10px] text-neutral-600">Signature of Applicant</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 font-sans text-[10.5px] leading-5">
            <dt className="text-neutral-600">Certificate No.</dt>
            <dd className="font-mono font-semibold">{c.certificateNumber}</dd>
            <dt className="text-neutral-600">O.R. No.</dt>
            <dd>{c.fee > 0 ? (c.orNumber ?? "__________") : "Exempted"}</dd>
            <dt className="text-neutral-600">Amount Paid</dt>
            <dd>{c.fee > 0 ? formatPeso(c.fee) : "Free of charge"}</dd>
            <dt className="text-neutral-600">Date Issued</dt>
            <dd>{formatDate(c.dateIssued, "MMMM d, yyyy")}</dd>
            {c.validUntil && (
              <>
                <dt className="text-neutral-600">Valid Until</dt>
                <dd>{formatDate(c.validUntil, "MMMM d, yyyy")}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="relative text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2">
            <Placeholder label="Barangay Seal" />
          </div>
          <div className="mx-auto mb-1 flex h-12 w-48 items-end justify-center font-sans text-[10px] text-neutral-400 italic">signature</div>
          <p className="border-t border-neutral-800 pt-1 font-bold uppercase">{officialName(punongBarangay, true)}</p>
          <p className="text-[12px]">Punong Barangay</p>
          {preparedBy && (
            <p className="mt-6 font-sans text-[10px] text-neutral-600">
              Prepared by: {officialName(preparedBy)}, {preparedBy.position}
            </p>
          )}
        </div>
      </div>
      <p className="mt-6 text-center font-sans text-[9.5px] text-neutral-500 italic">
        Not valid without the official dry seal of the barangay. Any erasure or alteration invalidates this document.
      </p>
    </article>
  )
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 p-1 text-center font-sans text-[9px] leading-tight text-neutral-400 uppercase">
      {label}
    </div>
  )
}

/** Letterhead crest — renders the configured image, or a dashed placeholder while unset. */
function LetterheadMark({ src, label, alt }: { src?: string; label: string; alt: string }) {
  if (!src) return <Placeholder label={label} />
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size printable document, not a responsive page image
    <img src={src} alt={alt} className="size-20 shrink-0 rounded-full object-cover" />
  )
}
