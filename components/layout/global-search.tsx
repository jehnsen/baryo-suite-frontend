"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FileBadge, FileClock, FolderKanban, Gavel, Home, Monitor, ScrollText, Search, ShieldAlert, Stamp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { StatusBadge } from "@/components/shared/status-badge"
import { useModKeyHotkey } from "@/hooks/use-hotkey"
import {
  useAssets,
  useBlotters,
  useCertificates,
  useCurrentUser,
  useHouseholds,
  useIncidents,
  useLookups,
  useOrdinances,
  useProjects,
  useResidents,
  useResolutions,
  useServiceRequests,
} from "@/hooks/use-data"
import { ALL_NAV_ITEMS } from "@/lib/navigation"
import { formalName, fullName } from "@/lib/format"
import type { ModuleKey } from "@/types"

interface Result {
  id: string
  title: string
  subtitle: string
  href: string
  status?: string
}

interface Group {
  module: ModuleKey
  heading: string
  icon: typeof Users
  results: Result[]
}

const LIMIT = 5
const norm = (s: string) => s.toLowerCase()

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const { canAccess } = useCurrentUser()
  const residents = useResidents()
  const households = useHouseholds()
  const certificates = useCertificates()
  const requests = useServiceRequests()
  const blotters = useBlotters()
  const incidents = useIncidents()
  const lookups = useLookups()
  const ordinances = useOrdinances()
  const resolutions = useResolutions()
  const projects = useProjects()
  const assets = useAssets()

  useModKeyHotkey(
    "k",
    useCallback(() => setOpen((o) => !o), []),
  )

  const groups: Group[] = useMemo(() => {
    const q = norm(query.trim())
    if (q.length < 2) return []
    const match = (...fields: (string | undefined)[]) => fields.some((f) => f && norm(f).includes(q))
    const name = (id: string) => fullName(lookups.residents.get(id))
    return [
      {
        module: "residents" as const,
        heading: "Residents",
        icon: Users,
        results: residents
          .filter((r) => match(r.firstName + " " + r.lastName, r.residentNumber, r.contactNumber))
          .map((r) => ({ id: r.id, title: formalName(r), subtitle: `${r.residentNumber} · ${r.address.purok}`, href: `/residents/${r.id}`, status: r.status })),
      },
      {
        module: "households" as const,
        heading: "Households",
        icon: Home,
        results: households
          .filter((h) => match(h.householdNumber, name(h.headId), h.address.street))
          .map((h) => ({
            id: h.id,
            title: `${h.householdNumber} – ${name(h.headId)}`,
            subtitle: `${h.address.street}, ${h.address.purok}`,
            href: `/households/${h.id}`,
          })),
      },
      {
        module: "certificates" as const,
        heading: "Certificates",
        icon: FileBadge,
        results: certificates
          .filter((c) => match(c.certificateNumber, name(c.residentId), c.type))
          .map((c) => ({
            id: c.id,
            title: `${c.certificateNumber} – ${name(c.residentId)}`,
            subtitle: c.type,
            href: `/certificates/${c.id}`,
            status: c.status,
          })),
      },
      {
        module: "requests" as const,
        heading: "Service Requests",
        icon: FileClock,
        results: requests
          .filter((r) => match(r.requestNumber, name(r.residentId), r.service))
          .map((r) => ({ id: r.id, title: `${r.requestNumber} – ${name(r.residentId)}`, subtitle: r.service, href: `/requests/${r.id}`, status: r.status })),
      },
      {
        module: "blotter" as const,
        heading: "Blotter Cases",
        icon: Gavel,
        results: blotters
          .filter((b) => match(b.blotterNumber, b.complainant.name, b.respondent.name, b.incidentType))
          .map((b) => ({
            id: b.id,
            title: `${b.blotterNumber} – ${b.incidentType}`,
            subtitle: `${b.complainant.name} vs. ${b.respondent.name}`,
            href: `/blotter/${b.id}`,
            status: b.status,
          })),
      },
      {
        module: "incidents" as const,
        heading: "Incidents",
        icon: ShieldAlert,
        results: incidents
          .filter((i) => match(i.incidentNumber, i.type, i.location))
          .map((i) => ({ id: i.id, title: `${i.incidentNumber} – ${i.type}`, subtitle: i.location, href: `/incidents?open=${i.id}`, status: i.status })),
      },
      {
        module: "ordinances" as const,
        heading: "Ordinances",
        icon: ScrollText,
        results: ordinances
          .filter((o) => match(o.ordinanceNumber, o.title))
          .map((o) => ({ id: o.id, title: o.ordinanceNumber, subtitle: o.title, href: `/governance/ordinances/${o.id}`, status: o.status })),
      },
      {
        module: "resolutions" as const,
        heading: "Resolutions",
        icon: Stamp,
        results: resolutions
          .filter((r) => match(r.resolutionNumber, r.title))
          .map((r) => ({ id: r.id, title: r.resolutionNumber, subtitle: r.title, href: `/governance/resolutions/${r.id}`, status: r.status })),
      },
      {
        module: "projects" as const,
        heading: "Projects",
        icon: FolderKanban,
        results: projects
          .filter((p) => match(p.code, p.name, p.contractor))
          .map((p) => ({ id: p.id, title: `${p.code} – ${p.name}`, subtitle: p.location, href: `/projects/${p.id}`, status: p.status })),
      },
      {
        module: "assets" as const,
        heading: "Assets",
        icon: Monitor,
        results: assets
          .filter((a) => match(a.assetNumber, a.name, a.serialNumber))
          .map((a) => ({ id: a.id, title: `${a.assetNumber} – ${a.name}`, subtitle: a.location, href: `/assets/${a.id}`, status: a.status })),
      },
    ].filter((g) => canAccess(g.module) && g.results.length > 0)
  }, [query, residents, households, certificates, requests, blotters, incidents, lookups, canAccess, ordinances, resolutions, projects, assets])

  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const pages = ALL_NAV_ITEMS.filter((i) => canAccess(i.module))

  return (
    <>
      <Button
        variant="outline"
        aria-label="Search residents, documents and cases"
        onClick={() => setOpen(true)}
        className="h-10 w-full max-w-sm justify-start gap-2.5 rounded-xl border-border/70 bg-background px-3 font-normal text-muted-foreground shadow-none sm:w-64 lg:w-80"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Search residents, cases…</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global search"
        description="Search residents, households, documents and cases"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search by name, ID, case or document number…" />
          <CommandList className="max-h-[60vh]">
            {query.trim().length < 2 ? (
              <CommandGroup heading="Go to">
                {pages.map((p) => (
                  <CommandItem key={p.href} onSelect={() => go(p.href)}>
                    <p.icon /> {p.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <>
                <CommandEmpty>No results for “{query}”.</CommandEmpty>
                {groups.map((g) => (
                  <CommandGroup key={g.module} heading={`${g.heading} (${g.results.length})`}>
                    {g.results.slice(0, LIMIT).map((r) => (
                      <CommandItem key={r.id} value={r.id} onSelect={() => go(r.href)}>
                        <g.icon />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                        </span>
                        {r.status && <StatusBadge status={r.status} />}
                      </CommandItem>
                    ))}
                    {g.results.length > LIMIT && (
                      <CommandItem value={`${g.module}-more`} onSelect={() => go(ALL_NAV_ITEMS.find((i) => i.module === g.module)!.href)}>
                        <span className="text-muted-foreground">View all {g.heading.toLowerCase()}…</span>
                        <CommandShortcut>↵</CommandShortcut>
                      </CommandItem>
                    )}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
