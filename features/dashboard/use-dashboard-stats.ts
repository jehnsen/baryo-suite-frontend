"use client"

import { useMemo } from "react"
import { format, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns"
import { AGE_GROUPS, BLOTTER_STATUSES } from "@/lib/constants"
import { computeAge, toISODate } from "@/lib/format"
import { useBlotters, useCertificates, useHouseholds, useResidents, useServiceRequests, useSettings } from "@/hooks/use-data"

/** All dashboard aggregates, derived from the store in one place. */
export function useDashboardStats() {
  const residents = useResidents()
  const households = useHouseholds()
  const certificates = useCertificates()
  const requests = useServiceRequests()
  const blotters = useBlotters()
  const settings = useSettings()

  return useMemo(() => {
    const now = new Date()
    const today = toISODate(now)
    const active = residents.filter((r) => r.status === "Active")
    const ages = active.map((r) => computeAge(r.birthDate, now))

    const newThisMonth = active.filter((r) => isSameMonth(parseISO(r.createdAt), now)).length
    const issuedThisMonth = certificates.filter((c) => c.status === "Released" && isSameMonth(parseISO(c.dateIssued), now)).length
    const issuedLastMonth = certificates.filter((c) => c.status === "Released" && isSameMonth(parseISO(c.dateIssued), subMonths(now, 1))).length

    const months = Array.from({ length: 9 }, (_, i) => startOfMonth(subMonths(now, 8 - i)))
    const monthlyCertificates = months.map((m) => ({
      label: format(m, "MMM"),
      value: certificates.filter((c) => c.status !== "Cancelled" && isSameMonth(parseISO(c.dateIssued), m)).length,
    }))

    const openBlotterStatuses = ["Reported", "Under Investigation", "For Mediation"]
    const upcomingHearings = blotters
      .flatMap((b) => b.hearings.filter((h) => h.status === "Scheduled" && h.date >= today).map((h) => ({ hearing: h, blotter: b })))
      .sort((a, b) => (a.hearing.date + a.hearing.time).localeCompare(b.hearing.date + b.hearing.time))

    return {
      kpis: {
        residents: active.length,
        newThisMonth,
        households: households.filter((h) => h.status === "Active").length,
        seniors: active.filter((r) => r.classification.seniorCitizen).length,
        pwd: active.filter((r) => r.classification.pwd).length,
        voters: active.filter((r) => r.classification.registeredVoter).length,
        pendingRequests: requests.filter((r) => ["Submitted", "Under Review", "Approved", "Ready for Release"].includes(r.status)).length,
        newRequestsToday: requests.filter((r) => r.dateRequested.slice(0, 10) === today).length,
        openBlotters: blotters.filter((b) => openBlotterStatuses.includes(b.status)).length,
        issuedThisMonth,
        issuedTrend: issuedLastMonth ? Math.round(((issuedThisMonth - issuedLastMonth) / issuedLastMonth) * 100) : 0,
      },
      gender: {
        male: active.filter((r) => r.gender === "Male").length,
        female: active.filter((r) => r.gender === "Female").length,
      },
      ageGroups: AGE_GROUPS.map((g) => ({ label: g.label, value: ages.filter((a) => a >= g.min && a <= g.max).length })),
      byPurok: settings.puroks.map((p) => ({ label: p.name.replace("Purok ", "P-"), value: active.filter((r) => r.address.purok === p.name).length })),
      monthlyCertificates,
      blotterByStatus: BLOTTER_STATUSES.map((s) => ({ label: s, value: blotters.filter((b) => b.status === s).length })),
      tasks: {
        pendingCertificates: certificates.filter((c) => c.status === "Pending"),
        openRequests: requests.filter((r) => r.status === "Submitted" || r.status === "Under Review"),
        upcomingHearings,
      },
    }
  }, [residents, households, certificates, requests, blotters, settings])
}
