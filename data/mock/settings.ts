import type { BarangaySettings } from "@/types"
import { CERTIFICATE_TYPES, INCIDENT_TYPES } from "@/lib/constants"
import { CERTIFICATE_FEES } from "./_services"
import { PUROKS, SITIOS } from "./_seed"

export const barangaySettings: BarangaySettings = {
  barangayName: "Busilac",
  barangayCode: "140203004",
  municipality: "Alfonso Lista",
  province: "Ifugao",
  region: "Region CAR – Cordillera Administrative Region",
  address: "Barangay Hall, Busilac, Alfonso Lista, Ifugao 3611",
  contactNumber: "(074) 000-0000",
  email: "brgy.busilac@alfonsolista.gov.ph",
  logoUrl: "/logo/brgy-busilac-logo.jpeg",
  municipalityLogoUrl: "/logo/municipality-logo.jpeg",
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
