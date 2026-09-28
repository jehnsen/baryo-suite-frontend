import type { BarangaySettings } from "@/types"
import { CERTIFICATE_TYPES, INCIDENT_TYPES } from "@/lib/constants"
import { CERTIFICATE_FEES } from "./_services"
import { PUROKS, SITIOS } from "./_seed"

export const barangaySettings: BarangaySettings = {
  barangayName: "San Roque",
  barangayCode: "031403021",
  municipality: "Baliwag City",
  province: "Bulacan",
  region: "Region III – Central Luzon",
  address: "Barangay Hall, Rizal St., San Roque, Baliwag City, Bulacan 3006",
  contactNumber: "(044) 766-2145",
  email: "brgy.sanroque@brgysanroque.ph",
  punongBarangayId: "off-001",
  secretaryId: "off-010",
  treasurerId: "off-011",
  puroks: PUROKS.map((name, i) => ({ id: `prk-${i + 1}`, name, sitios: SITIOS[name] })),
  certificateTypes: CERTIFICATE_TYPES.map((type) => ({
    type,
    fee: CERTIFICATE_FEES[type],
    validityDays: type === "Barangay Clearance" || type === "Business Clearance" ? 180 : type === "First Time Job Seeker Certificate" ? 365 : 90,
  })),
  incidentTypes: INCIDENT_TYPES,
  classifications: ["seniorCitizen", "pwd", "soloParent", "registeredVoter", "indigent", "student", "unemployed"],
  budgetThresholds: { warning: 75, critical: 90 },
}
