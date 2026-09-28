"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Announcement, BarangayOfficial, BlotterCase, Certificate, CertificateType, Household, User } from "@/types"
import { AnnouncementFormDialog } from "@/features/announcements/announcement-form"
import { BlotterFormDrawer, type BlotterDefaults } from "@/features/blotter/blotter-form"
import { CertificateFormDialog } from "@/features/certificates/certificate-form"
import { HouseholdFormDialog } from "@/features/households/household-form"
import { OfficialFormDialog } from "@/features/officials/official-form"
import { RequestFormDialog } from "@/features/requests/request-form"
import { UserFormDialog } from "@/features/users/user-form"

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
    </EntityDialogsContext.Provider>
  )
}

export function useEntityDialogs() {
  const ctx = useContext(EntityDialogsContext)
  if (!ctx) throw new Error("useEntityDialogs must be used within EntityDialogsProvider")
  return ctx
}
