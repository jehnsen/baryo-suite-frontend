import type { BarangaySettings, Collection, User } from "@/types"
import { formatDate, formatPeso, pesosInWords } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Receipt preview (Accountable Form No. 51 layout) for a treasury collection. */
export function CollectionReceipt({
  collection: c,
  settings,
  collector,
  className,
}: {
  collection: Collection
  settings: BarangaySettings
  collector?: User
  className?: string
}) {
  return (
    <article
      className={cn(
        "relative mx-auto w-full max-w-md bg-white p-6 font-serif text-[12px] leading-relaxed text-neutral-900 shadow-sm ring-1 ring-black/10 print:shadow-none print:ring-0",
        className,
      )}
    >
      {c.status === "Cancelled" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 border-4 border-red-600/40 px-4 py-1 font-sans text-4xl font-bold tracking-widest text-red-600/40">CANCELLED</span>
        </div>
      )}
      <header className="border-b border-neutral-800 pb-3 text-center">
        <p className="font-sans text-[9px] tracking-widest text-neutral-500 uppercase">Accountable Form No. 51 · Preview</p>
        <p className="mt-1 text-[11px]">
          Republic of the Philippines · {settings.municipality}, {settings.province}
        </p>
        <p className="text-base font-bold uppercase">Barangay {settings.barangayName}</p>
        <p className="text-sm font-semibold tracking-[0.2em] uppercase">Official Receipt</p>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-sans text-[11px]">
        <dt className="text-neutral-500">O.R. No.</dt>
        <dd className="text-right font-mono font-semibold text-red-700">{c.orNumber}</dd>
        <dt className="text-neutral-500">Date</dt>
        <dd className="text-right">{formatDate(c.date, "MMMM d, yyyy")}</dd>
        <dt className="text-neutral-500">Transaction</dt>
        <dd className="text-right font-mono">{c.transactionNumber}</dd>
      </dl>
      <p className="mt-3">
        <span className="text-neutral-500">Payor:</span> <strong>{c.payerName}</strong>
        {c.businessName && <span className="block text-neutral-600">{c.businessName}</span>}
      </p>
      <table className="mt-3 w-full border-collapse font-sans text-[11px]">
        <thead>
          <tr className="border-y border-neutral-800">
            <th className="py-1 text-left font-semibold">Nature of collection</th>
            <th className="py-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2 pr-2">
              {c.type}
              <span className="block text-neutral-500">{c.description}</span>
            </td>
            <td className="py-2 text-right tabular-nums">{formatPeso(c.amount)}</td>
          </tr>
          <tr className="border-t border-neutral-800 font-semibold">
            <td className="py-1">TOTAL</td>
            <td className="py-1 text-right tabular-nums">{formatPeso(c.amount)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] italic">Amount in words: {pesosInWords(c.amount)}</p>
      <p className="mt-2 font-sans text-[11px]">
        Payment: <strong>{c.paymentMethod}</strong>
        {(c.paymentMethod === "GCash" || c.paymentMethod === "Maya") && (
          <span className="text-neutral-500"> (e-wallet placeholder — no online payment processed)</span>
        )}
      </p>
      <div className="mt-8 text-center">
        <div className="mx-auto w-56 border-t border-neutral-800 pt-1 font-sans text-[11px] font-semibold uppercase">
          {collector?.name ?? "Collecting Officer"}
        </div>
        <p className="font-sans text-[10px] text-neutral-500">Collecting Officer</p>
      </div>
    </article>
  )
}
