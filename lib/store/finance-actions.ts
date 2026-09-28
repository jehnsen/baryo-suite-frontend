import type {
  AnnualBudget,
  BudgetStatus,
  Certificate,
  Collection,
  CollectionStatus,
  Disbursement,
  DisbursementStatus,
  Expense,
  FundSource,
  Obligation,
  ObligationStatus,
  PPA,
} from "@/types"
import { buildLedger } from "@/lib/finance"
import { formatPeso, fullName } from "@/lib/format"
import { appendAttachments, currentUserId, get, log, newId, nextNumber, now, patchIn, set, statusEntry, today } from "./helpers"

/* Finance & Treasury mutations. Totals are never written — see lib/finance.ts. */

const ledger = () => {
  const s = get()
  return buildLedger({ ppas: s.ppas, allocations: s.allocations, obligations: s.obligations, disbursements: s.disbursements })
}

/* --------------------------------- Budgets --------------------------------- */

export type BudgetInput = Pick<AnnualBudget, "fiscalYear" | "title" | "estimatedIncome" | "approvedBudget" | "notes">

export const budgetActions = {
  create(input: BudgetInput): AnnualBudget {
    const budget: AnnualBudget = { ...input, id: newId("bud"), status: "Draft", history: [statusEntry<BudgetStatus>("Draft")], createdAt: now() }
    set((s) => ({ ...s, budgets: [budget, ...s.budgets] }))
    log("Created", "Budget", budget.title, `Budget created for FY ${budget.fiscalYear} (${formatPeso(budget.approvedBudget)}).`, budget.id)
    return budget
  },
  update(id: string, patch: Partial<AnnualBudget>) {
    patchIn<"budgets", AnnualBudget>("budgets", id, (b) => ({ ...b, ...patch }))
    log("Updated", "Budget", get().budgets.find((b) => b.id === id)?.title ?? id, "Budget details updated.", id)
  },
  transition(id: string, to: BudgetStatus, remarks?: string) {
    const b = get().budgets.find((x) => x.id === id)
    patchIn<"budgets", AnnualBudget>("budgets", id, (x) => ({
      ...x,
      status: to,
      approvalDate: to === "Approved" ? today() : x.approvalDate,
      history: [...x.history, statusEntry(to, remarks)],
    }))
    log(
      to === "Approved" ? "Approved" : to === "Draft" ? "Returned" : "Status Changed",
      "Budget",
      b?.title ?? id,
      `Budget moved to ${to}.${remarks ? " " + remarks : ""}`,
      id,
    )
  },
  /** Set (or revise) the allocation for one category of a budget. */
  setAllocation(budgetId: string, category: PPA["category"], amounts: { approvedAmount: number; revisedAmount?: number; remarks?: string }) {
    const existing = get().allocations.find((a) => a.budgetId === budgetId && a.category === category)
    if (existing) {
      set((s) => ({ ...s, allocations: s.allocations.map((a) => (a.id === existing.id ? { ...a, ...amounts } : a)) }))
    } else {
      set((s) => ({ ...s, allocations: [...s.allocations, { id: newId("alloc"), budgetId, category, ...amounts }] }))
    }
    const b = get().budgets.find((x) => x.id === budgetId)
    log("Updated", "Budget", `${b?.title} – ${category}`, `Allocation set to ${formatPeso(amounts.revisedAmount ?? amounts.approvedAmount)}.`, budgetId)
  },
}

/* ------------------------------- Fund sources ------------------------------ */

export type FundSourceInput = Omit<FundSource, "id">

export const fundSourceActions = {
  create(input: FundSourceInput): FundSource {
    const f: FundSource = { ...input, id: newId("fs") }
    set((s) => ({ ...s, fundSources: [f, ...s.fundSources] }))
    log("Created", "Fund Sources", f.name, `Recorded ${formatPeso(f.amount)} (${f.referenceNumber}).`, f.id)
    return f
  },
  update(id: string, patch: Partial<FundSource>) {
    patchIn<"fundSources", FundSource>("fundSources", id, (f) => ({ ...f, ...patch }))
    log("Updated", "Fund Sources", get().fundSources.find((f) => f.id === id)?.name ?? id, "Fund source updated.", id)
  },
}

/* ----------------------------------- PPAs ---------------------------------- */

export type PPAInput = Omit<PPA, "id">

export const ppaActions = {
  create(input: PPAInput): PPA {
    const ppa: PPA = { ...input, id: newId("ppa") }
    set((s) => ({ ...s, ppas: [...s.ppas, ppa] }))
    log("Created", "PPAs", `${ppa.code} – ${ppa.name}`, `${ppa.type} added under ${ppa.category} (${formatPeso(ppa.approvedBudget)}).`, ppa.id)
    return ppa
  },
  update(id: string, patch: Partial<PPA>) {
    const prev = get().ppas.find((p) => p.id === id)
    patchIn<"ppas", PPA>("ppas", id, (p) => ({ ...p, ...patch }))
    const revised =
      patch.revisedBudget !== undefined && patch.revisedBudget !== prev?.revisedBudget ? ` Budget revised to ${formatPeso(patch.revisedBudget)}.` : ""
    log("Updated", "PPAs", `${prev?.code} – ${prev?.name}`, `PPA updated.${revised}`, id)
  },
}

/* -------------------------------- Collections ------------------------------ */

export type CollectionInput = Omit<Collection, "id" | "transactionNumber" | "status" | "createdAt" | "collectorId" | "depositReference">

export const collectionActions = {
  nextOrNumber(): string {
    const max = get().collections.reduce((m, c) => Math.max(m, Number(c.orNumber.replace(/\D/g, "")) || 0), 0)
    return `OR-${String(max + 1).padStart(7, "0")}`
  },
  create(input: CollectionInput): Collection {
    const c: Collection = {
      ...input,
      id: newId("col"),
      transactionNumber: nextNumber(
        get().collections.map((x) => x.transactionNumber),
        "COL",
        5,
      ),
      status: "Recorded",
      collectorId: currentUserId(),
      createdAt: now(),
    }
    set((s) => ({ ...s, collections: [c, ...s.collections] }))
    log("Recorded", "Collections", `${c.orNumber} – ${c.payerName}`, `${c.type}: ${formatPeso(c.amount)} via ${c.paymentMethod}.`, c.id)
    return c
  },
  /** Called when a paid certificate is released so treasury and certificate records reconcile. */
  recordFromCertificate(cert: Certificate) {
    if (!cert.orNumber || cert.fee <= 0 || get().collections.some((c) => c.certificateId === cert.id)) return
    const r = get().residents.find((x) => x.id === cert.residentId)
    collectionActions.create({
      orNumber: cert.orNumber,
      date: today(),
      payerName: fullName(r),
      residentId: cert.residentId,
      type: cert.type === "Barangay Clearance" ? "Barangay Clearance" : cert.type === "Business Clearance" ? "Business Clearance" : "Certification Fee",
      description: `${cert.type} – ${cert.purpose}`,
      amount: cert.fee,
      paymentMethod: "Cash",
      certificateId: cert.id,
    })
  },
  setStatus(ids: string[], status: CollectionStatus, details?: { depositReference?: string; reason?: string }) {
    set((s) => ({
      ...s,
      collections: s.collections.map((c) => (ids.includes(c.id) ? { ...c, status, depositReference: details?.depositReference ?? c.depositReference } : c)),
    }))
    const total = get()
      .collections.filter((c) => ids.includes(c.id))
      .reduce((sum, c) => sum + c.amount, 0)
    const action = status === "Deposited" ? "Deposited" : status === "Reconciled" ? "Reconciled" : "Cancelled"
    log(
      action,
      "Collections",
      ids.length === 1 ? (get().collections.find((c) => c.id === ids[0])?.orNumber ?? ids[0]) : `${ids.length} collections`,
      `${formatPeso(total)} marked ${status}.${details?.depositReference ? ` Deposit slip ${details.depositReference}.` : ""}${details?.reason ? ` ${details.reason}` : ""}`,
      ids.length === 1 ? ids[0] : undefined,
    )
  },
}

/* -------------------------------- Obligations ------------------------------ */

export type ObligationInput = Pick<Obligation, "date" | "payee" | "description" | "ppaId" | "fundSourceId" | "amount" | "requestedById" | "attachments"> & {
  submit?: boolean
}

export const obligationActions = {
  create({ submit, ...input }: ObligationInput): Obligation {
    const history = [statusEntry<ObligationStatus>("Draft"), ...(submit ? [statusEntry<ObligationStatus>("For Review", "Budget availability certified.")] : [])]
    const o: Obligation = {
      ...input,
      id: newId("obl"),
      obligationNumber: nextNumber(
        get().obligations.map((x) => x.obligationNumber),
        "OBR",
      ),
      status: submit ? "For Review" : "Draft",
      history,
      createdAt: now(),
    }
    set((s) => ({ ...s, obligations: [o, ...s.obligations] }))
    log(
      "Created",
      "Obligations",
      `${o.obligationNumber} – ${o.payee}`,
      `${formatPeso(o.amount)} requested against ${get().ppas.find((p) => p.id === o.ppaId)?.code}.`,
      o.id,
    )
    return o
  },
  update(id: string, patch: Partial<Obligation>) {
    patchIn<"obligations", Obligation>("obligations", id, (o) => ({ ...o, ...patch }))
    log("Updated", "Obligations", get().obligations.find((o) => o.id === id)?.obligationNumber ?? id, "Obligation updated.", id)
  },
  /** Returns an error message instead of approving beyond the PPA's available balance. */
  transition(id: string, to: ObligationStatus, remarks?: string): string | void {
    const o = get().obligations.find((x) => x.id === id)
    if (!o) return
    if (to === "Approved") {
      const ppa = get().ppas.find((p) => p.id === o.ppaId)!
      const available = ledger().forPPA(ppa).available
      if (o.amount > available) return `Insufficient balance: ${ppa.code} has ${formatPeso(available)} available.`
    }
    patchIn<"obligations", Obligation>("obligations", id, (x) => ({ ...x, status: to, history: [...x.history, statusEntry(to, remarks)] }))
    const action = to === "Approved" ? "Approved" : to === "Cancelled" ? "Cancelled" : to === "Draft" ? "Returned" : "Submitted"
    log(
      action,
      "Obligations",
      `${o.obligationNumber} – ${o.payee}`,
      `Obligation ${to.toLowerCase()} (${formatPeso(o.amount)}).${remarks ? " " + remarks : ""}`,
      id,
    )
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("obligations", id, files),
}

/* ------------------------------- Disbursements ----------------------------- */

export type DisbursementInput = Pick<Disbursement, "date" | "payee" | "obligationId" | "amount" | "paymentMethod" | "remarks" | "attachments"> & {
  submit?: boolean
}

export const disbursementActions = {
  create({ submit, ...input }: DisbursementInput): Disbursement {
    const obligation = get().obligations.find((o) => o.id === input.obligationId)!
    const history = [statusEntry<DisbursementStatus>("Draft"), ...(submit ? [statusEntry<DisbursementStatus>("For Review")] : [])]
    const number = nextNumber(
      get().disbursements.map((d) => d.disbursementNumber),
      "DSB",
    )
    const d: Disbursement = {
      ...input,
      id: newId("dv"),
      disbursementNumber: number,
      voucherNumber: `DV-${number.slice(4, 8)}-${input.date.slice(5, 7)}-${number.slice(-3)}`,
      fundSourceId: obligation.fundSourceId,
      status: submit ? "For Review" : "Draft",
      history,
      createdAt: now(),
    }
    set((s) => ({ ...s, disbursements: [d, ...s.disbursements] }))
    log("Created", "Disbursements", `${d.disbursementNumber} – ${d.payee}`, `Voucher of ${formatPeso(d.amount)} against ${obligation.obligationNumber}.`, d.id)
    return d
  },
  update(id: string, patch: Partial<Disbursement>) {
    patchIn<"disbursements", Disbursement>("disbursements", id, (d) => ({ ...d, ...patch }))
    log("Updated", "Disbursements", get().disbursements.find((d) => d.id === id)?.disbursementNumber ?? id, "Disbursement updated.", id)
  },
  transition(id: string, to: DisbursementStatus, remarks?: string, fields: { referenceNumber?: string } = {}): string | void {
    const d = get().disbursements.find((x) => x.id === id)
    if (!d) return
    if (to === "Released") {
      const o = get().obligations.find((x) => x.id === d.obligationId)!
      const remaining = o.amount - ledger().disbursedForObligation(o.id)
      if (d.amount > remaining) return `Amount exceeds the undisbursed balance of ${o.obligationNumber} (${formatPeso(remaining)}).`
    }
    patchIn<"disbursements", Disbursement>("disbursements", id, (x) => ({
      ...x,
      status: to,
      referenceNumber: fields.referenceNumber ?? x.referenceNumber,
      history: [...x.history, statusEntry(to, remarks)],
    }))
    const action =
      to === "Released" ? "Released" : to === "Approved" ? "Approved" : to === "Cancelled" ? "Cancelled" : to === "Draft" ? "Returned" : "Submitted"
    log(
      action,
      "Disbursements",
      `${d.disbursementNumber} – ${d.payee}`,
      `Disbursement ${to.toLowerCase()} (${formatPeso(d.amount)}).${remarks ? " " + remarks : ""}`,
      id,
    )
    if (to === "Released") disbursementActions.onReleased(get().disbursements.find((x) => x.id === id)!)
  },
  /** Release side effects: record the expense and roll the obligation status forward. */
  onReleased(d: Disbursement) {
    const o = get().obligations.find((x) => x.id === d.obligationId)!
    const ppa = get().ppas.find((p) => p.id === o.ppaId)!
    const expense: Expense = {
      id: newId("exp"),
      expenseNumber: nextNumber(
        get().expenses.map((e) => e.expenseNumber),
        "EXP",
      ),
      date: today(),
      category: ppa.category,
      ppaId: ppa.id,
      payee: d.payee,
      description: d.remarks || o.description,
      amount: d.amount,
      fundSourceId: d.fundSourceId,
      reference: d.referenceNumber ?? d.voucherNumber,
      attachments: [],
      disbursementId: d.id,
    }
    set((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
    const released = ledger().disbursedForObligation(o.id)
    const status: ObligationStatus = released >= o.amount ? "Fully Disbursed" : "Partially Disbursed"
    if (status !== o.status) {
      patchIn<"obligations", Obligation>("obligations", o.id, (x) => ({
        ...x,
        status,
        history: [...x.history, statusEntry(status, `${d.disbursementNumber} released.`)],
      }))
    }
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("disbursements", id, files),
}

export const expenseActions = {
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("expenses", id, files),
}

/** Utility for forms: remaining PPA balance for a prospective obligation. */
export const availableForPPA = (ppaId: string) => {
  const ppa = get().ppas.find((p) => p.id === ppaId)
  return ppa ? ledger().forPPA(ppa).available : 0
}
