"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type {
  AnnualBudget,
  Asset,
  BarangayAssembly,
  Committee,
  Ordinance,
  Project,
  Resolution,
  Announcement,
  BarangayOfficial,
  BlotterCase,
  BudgetAllocation,
  BudgetCategory,
  Certificate,
  CertificateType,
  Disbursement,
  FundSource,
  InventoryItem,
  Obligation,
  Household,
  PPA,
  User,
} from "@/types"
import { AnnouncementFormDialog } from "@/features/announcements/announcement-form"
import { BlotterFormDrawer, type BlotterDefaults } from "@/features/blotter/blotter-form"
import { CertificateFormDialog } from "@/features/certificates/certificate-form"
import { HouseholdFormDialog } from "@/features/households/household-form"
import { OfficialFormDialog } from "@/features/officials/official-form"
import { RequestFormDialog } from "@/features/requests/request-form"
import { UserFormDialog } from "@/features/users/user-form"
import { AllocationFormDialog } from "@/features/finance/allocation-form"
import { BudgetFormDialog } from "@/features/finance/budget-form"
import { FundSourceFormDialog } from "@/features/finance/fund-source-form"
import { PPAFormDrawer } from "@/features/finance/ppa-form"
import { CollectionFormDialog } from "@/features/finance/collection-form"
import { AssemblyFormDialog } from "@/features/governance/assembly-form"
import { CommitteeFormDialog } from "@/features/governance/committee-form"
import { LegislationFormDialog } from "@/features/governance/legislation-form"
import { AssetFormDialog } from "@/features/operations/asset-form"
import { InventoryItemFormDialog } from "@/features/operations/inventory-dialogs"
import { ProjectFormDrawer } from "@/features/operations/project-form"
import { DisbursementFormDrawer } from "@/features/finance/disbursement-form"
import { ObligationFormDrawer } from "@/features/finance/obligation-form"

/**
 * Composition root for create/edit forms. Pages and the global "+ Create"
 * menu call `open({ type, record?, defaults? })` instead of each mounting
 * their own copy of a form. Residents and incidents use full pages
 * (`/residents/new`, `/incidents/[id]/edit`, etc.) instead of going through
 * this dialog system.
 */
export type EntityDialog =
  | { type: "household"; record?: Household }
  | { type: "certificate"; record?: Certificate; defaults?: { residentId?: string; type?: CertificateType } }
  | { type: "request"; defaults?: { residentId?: string } }
  | { type: "blotter"; record?: BlotterCase; defaults?: BlotterDefaults }
  | { type: "announcement"; record?: Announcement }
  | { type: "official"; record?: BarangayOfficial }
  | { type: "user"; record?: User }
  // Phase 2 — finance
  | { type: "budget"; record?: AnnualBudget }
  | { type: "fundSource"; record?: FundSource }
  | { type: "allocation"; record?: BudgetAllocation; defaults?: { budgetId: string } }
  | { type: "ppa"; record?: PPA; defaults?: { budgetId?: string; category?: BudgetCategory } }
  | { type: "collection" }
  | { type: "obligation"; record?: Obligation; defaults?: { ppaId?: string } }
  | { type: "disbursement"; record?: Disbursement; defaults?: { obligationId?: string } }
  // Phase 2 — governance
  | { type: "ordinance"; record?: Ordinance }
  | { type: "resolution"; record?: Resolution }
  | { type: "committee"; record?: Committee }
  | { type: "assembly"; record?: BarangayAssembly }
  // Phase 2 — operations
  | { type: "project"; record?: Project; defaults?: { ppaId?: string } }
  | { type: "asset"; record?: Asset }
  | { type: "inventoryItem"; record?: InventoryItem }

export type CreatableEntity = EntityDialog["type"]

interface ContextValue {
  open: (dialog: EntityDialog) => void
  close: () => void
}

const EntityDialogsContext = createContext<ContextValue | null>(null)

export function EntityDialogsProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<EntityDialog | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  // Remount the form on each open so default values reset.
  const [nonce, setNonce] = useState(0)

  const open = useCallback((d: EntityDialog) => {
    setDialog(d)
    setNonce((n) => n + 1)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])
  const value = useMemo(() => ({ open, close }), [open, close])

  const common = { open: isOpen, onOpenChange: (o: boolean) => (o ? setIsOpen(true) : close()) }

  return (
    <EntityDialogsContext.Provider value={value}>
      {children}
      {dialog?.type === "household" && <HouseholdFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "certificate" && <CertificateFormDialog key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "request" && <RequestFormDialog key={nonce} {...common} defaults={dialog.defaults} />}
      {dialog?.type === "blotter" && <BlotterFormDrawer key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "announcement" && <AnnouncementFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "official" && <OfficialFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "user" && <UserFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "budget" && <BudgetFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "fundSource" && <FundSourceFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "allocation" && <AllocationFormDialog key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "ppa" && <PPAFormDrawer key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "collection" && <CollectionFormDialog key={nonce} {...common} />}
      {dialog?.type === "obligation" && <ObligationFormDrawer key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "ordinance" && <LegislationFormDialog key={nonce} {...common} kind="ordinance" record={dialog.record} />}
      {dialog?.type === "resolution" && <LegislationFormDialog key={nonce} {...common} kind="resolution" record={dialog.record} />}
      {dialog?.type === "committee" && <CommitteeFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "assembly" && <AssemblyFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "inventoryItem" && <InventoryItemFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "asset" && <AssetFormDialog key={nonce} {...common} record={dialog.record} />}
      {dialog?.type === "project" && <ProjectFormDrawer key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
      {dialog?.type === "disbursement" && <DisbursementFormDrawer key={nonce} {...common} record={dialog.record} defaults={dialog.defaults} />}
    </EntityDialogsContext.Provider>
  )
}

export function useEntityDialogs() {
  const ctx = useContext(EntityDialogsContext)
  if (!ctx) throw new Error("useEntityDialogs must be used within EntityDialogsProvider")
  return ctx
}
