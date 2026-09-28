import { Boxes, FileBadge, FolderKanban, Gavel, Landmark, Users, Wallet, type LucideIcon } from "lucide-react"
import type { ModuleKey, ReportSectionId } from "@/types"

export interface ReportSection {
  id: ReportSectionId
  title: string
  description: string
  icon: LucideIcon
  module: ModuleKey
  /** Route slugs under /reports; the first is canonical (sidebar link). */
  slugs: { slug: string; label: string }[]
}

/** Report sections: the sidebar entries under Reports and the /reports/[slug] routes. */
export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "residents",
    title: "Residents & Households",
    description: "Master lists, population profile, sectoral lists and household composition.",
    icon: Users,
    module: "reports-residents",
    slugs: [
      { slug: "residents", label: "Residents" },
      { slug: "households", label: "Households" },
    ],
  },
  {
    id: "services",
    title: "Certificates & Services",
    description: "Certificates issued, volume trends and service request processing.",
    icon: FileBadge,
    module: "reports-services",
    slugs: [
      { slug: "certificates", label: "Certificates" },
      { slug: "services", label: "Service requests" },
    ],
  },
  {
    id: "peace-order",
    title: "Peace & Order",
    description: "Blotter register, case resolution, hearings and incident summaries.",
    icon: Gavel,
    module: "reports-peace-order",
    slugs: [
      { slug: "blotter", label: "Blotter" },
      { slug: "incidents", label: "Incidents" },
    ],
  },
  {
    id: "governance",
    title: "Governance",
    description: "Sessions, attendance, legislation registers, committees and assemblies.",
    icon: Landmark,
    module: "reports-governance",
    slugs: [{ slug: "governance", label: "Governance" }],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Budget, utilization, collections, obligations, disbursements and expenses.",
    icon: Wallet,
    module: "reports-finance",
    slugs: [{ slug: "finance", label: "Finance" }],
  },
  {
    id: "projects",
    title: "Projects",
    description: "Project master list, status, physical and financial progress, delays.",
    icon: FolderKanban,
    module: "reports-projects",
    slugs: [{ slug: "projects", label: "Projects" }],
  },
  {
    id: "assets",
    title: "Assets & Inventory",
    description: "Asset registry, condition, custodians, acquisitions and stock levels.",
    icon: Boxes,
    module: "reports-assets",
    slugs: [
      { slug: "assets", label: "Assets" },
      { slug: "inventory", label: "Inventory" },
    ],
  },
]

export const REPORT_SLUGS = REPORT_SECTIONS.flatMap((s) => s.slugs.map((x) => x.slug))

export const sectionForSlug = (slug: string) => REPORT_SECTIONS.find((s) => s.slugs.some((x) => x.slug === slug))
export const sectionById = (id: ReportSectionId) => REPORT_SECTIONS.find((s) => s.id === id)!
