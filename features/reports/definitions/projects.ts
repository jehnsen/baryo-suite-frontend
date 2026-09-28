import type { Project } from "@/types"
import { BUDGET_CATEGORIES, PROJECT_STATUSES } from "@/lib/constants"
import { officialName } from "@/lib/format"
import type { ReportData } from "@/lib/reports/data"
import { average, daysDelayed, isProjectDelayed, percent, projectFinancials, sum } from "@/lib/reports/metrics"
import { defineReport, type ReportColumn, type ReportFilterSpec, type ReportMetric } from "@/lib/reports/types"

/* Projects — execution records of Project-type PPAs. Budget and financial progress come from the PPA ledger. Kagawads see their assigned projects only. */

type ProjectRow = Project & { budget: number; obligated: number; disbursed: number; financialProgress: number; delay: number }

const toProjectRows = (items: Project[], d: ReportData): ProjectRow[] =>
  items
    .map((p) => ({ ...p, ...projectFinancials(p, d.by.ppa.get(p.ppaId), d.ledger), delay: daysDelayed(p, d.today) }))
    .sort((a, b) => a.code.localeCompare(b.code))

const ppaOf = (p: Project, d: ReportData) => d.by.ppa.get(p.ppaId)

const jf = {
  year: { id: "fiscalYear", get: (p, d) => d.by.budget.get(ppaOf(p, d)?.budgetId ?? "")?.fiscalYear },
  status: { id: "status", options: PROJECT_STATUSES, get: (p) => p.status },
  category: { id: "budgetCategory", options: BUDGET_CATEGORIES, get: (p, d) => ppaOf(p, d)?.category },
  fund: { id: "fundSource", get: (p, d) => ppaOf(p, d)?.fundSourceId },
  official: { id: "official", get: (p) => p.responsibleOfficialId },
  project: { id: "project", get: (p) => p.id },
} satisfies Record<string, ReportFilterSpec<Project>>

const jc = {
  code: { id: "code", header: "Project Code", format: "mono", value: (p) => p.code, total: "count" },
  name: { id: "name", header: "Project", value: (p) => p.name, detail: (p) => p.location },
  ppa: { id: "ppa", header: "PPA", format: "mono", value: (p, d) => ppaOf(p, d)?.code },
  budget: { id: "budget", header: "Budget", format: "peso", value: (p) => p.budget, total: "sum" },
  fund: { id: "fund", header: "Funding Source", value: (p, d) => d.by.fundSource.get(ppaOf(p, d)?.fundSourceId ?? "")?.name },
  start: { id: "startDate", header: "Start Date", format: "date", value: (p) => p.startDate },
  target: { id: "targetDate", header: "Target Completion", format: "date", value: (p) => p.targetDate },
  physical: { id: "physical", header: "Physical Progress", format: "progress", value: (p) => p.physicalProgress },
  financial: { id: "financial", header: "Financial Progress", format: "progress", value: (p) => p.financialProgress },
  responsible: { id: "responsible", header: "Responsible Official", value: (p, d) => officialName(d.by.official.get(p.responsibleOfficialId), true) },
  status: { id: "status", header: "Status", format: "status", value: (p) => p.status },
} satisfies Record<string, ReportColumn<ProjectRow>>

const projectLink = { module: "projects" as const, href: (p: ProjectRow) => `/projects/${p.id}` }

const statusMetrics = (items: Project[]): ReportMetric[] =>
  (["Planning", "Procurement", "Ongoing", "Delayed", "Completed", "Cancelled"] as const).map((s) => ({
    label: s,
    value: items.filter((p) => p.status === s || (s === "Planning" && p.status === "Approved")).length,
    hint: s === "Planning" ? "Including approved, not yet procured" : undefined,
  }))

const common = {
  section: "projects" as const,
  slug: "projects",
  source: (d: ReportData) => d.projects.filter(d.scope.project),
  rows: toProjectRows,
  rowId: (p: ProjectRow) => p.id,
  rowLink: projectLink,
}

export const projectMaster = defineReport<Project, ProjectRow>({
  ...common,
  id: "project-master",
  title: "Project Master List",
  description: "All projects with PPA, budget, funding, schedule, progress and status.",
  filters: [jf.year, jf.status, jf.category, jf.fund, jf.official],
  columns: [jc.code, jc.name, jc.ppa, jc.budget, jc.fund, jc.start, jc.target, jc.physical, jc.financial, jc.status],
  summary: (items, rows) => [
    { label: "Projects", value: items.length },
    { label: "Total budget", value: sum(rows, (p) => p.budget), format: "peso" },
    { label: "Average physical progress", value: average(rows.map((p) => p.physicalProgress)), format: "percent" },
    { label: "Delayed", value: rows.filter((p) => p.status === "Delayed" || p.delay > 0).length, tone: "danger" },
  ],
  orientation: "landscape",
})

export const projectStatus = defineReport<Project, ProjectRow>({
  ...common,
  id: "project-status",
  title: "Project Status Report",
  description: "Projects grouped by stage, from planning to completion.",
  filters: [jf.year, jf.category, jf.official],
  groupings: [
    { id: "status", label: "Status", by: (p) => p.status, order: PROJECT_STATUSES },
    { id: "category", label: "Category", by: (p, d) => ppaOf(p, d)?.category ?? "—", order: BUDGET_CATEGORIES },
  ],
  defaultGrouping: "status",
  columns: [jc.code, jc.name, jc.responsible, jc.target, jc.budget, jc.physical, jc.status],
  summary: (items) => statusMetrics(items),
  charts: [
    {
      type: "bar",
      title: "Projects by status",
      seriesName: "Projects",
      wide: true,
      data: ({ items }) => PROJECT_STATUSES.map((s) => ({ label: s, value: items.filter((p) => p.status === s).length })),
    },
  ],
})

export const projectPhysical = defineReport<Project, ProjectRow>({
  ...common,
  id: "project-physical",
  title: "Project Physical Progress",
  description: "Completion percentage and milestones of each project.",
  filters: [jf.year, jf.status, jf.official],
  columns: [
    jc.code,
    jc.name,
    {
      id: "milestones",
      header: "Milestones Done",
      format: "number",
      value: (p) => p.milestones.filter((m) => m.status === "Completed").length,
      detail: (p) => `of ${p.milestones.length}`,
      total: "sum",
    },
    jc.target,
    jc.physical,
    jc.status,
  ],
  summary: (items, rows) => [
    { label: "Projects", value: items.length },
    { label: "Average physical progress", value: average(rows.map((p) => p.physicalProgress)), format: "percent" },
    { label: "Completed", value: rows.filter((p) => p.status === "Completed").length, tone: "success" },
    { label: "Below 50%", value: rows.filter((p) => p.physicalProgress < 50 && p.status !== "Cancelled").length, tone: "warning" },
  ],
  charts: [
    {
      type: "hbar",
      title: "Physical progress",
      wide: true,
      valueFormat: "percent",
      seriesName: "Physical progress",
      data: ({ rows }) => rows.map((p) => ({ label: p.name, value: p.physicalProgress })),
    },
  ],
})

export const projectFinancial = defineReport<Project, ProjectRow>({
  ...common,
  id: "project-financial",
  title: "Project Financial Progress",
  description: "Budget, obligations and disbursements of each project, against physical progress.",
  access: ["projects", "project-financial"],
  filters: [jf.year, jf.status, jf.category, jf.fund],
  columns: [
    jc.code,
    jc.name,
    jc.budget,
    { id: "obligated", header: "Obligated", format: "peso", value: (p) => p.obligated, total: "sum" },
    { id: "disbursed", header: "Disbursed", format: "peso", value: (p) => p.disbursed, total: "sum" },
    {
      id: "financial",
      header: "Financial Progress",
      format: "progress",
      value: (p) => p.financialProgress,
      total: (rows) =>
        percent(
          sum(rows, (p) => p.disbursed),
          sum(rows, (p) => p.budget),
        ),
    },
    jc.physical,
    {
      id: "gap",
      header: "Gap (Fin. − Phys.)",
      format: "number",
      value: (p) => Math.round(p.financialProgress - p.physicalProgress),
      detail: (p) => (p.financialProgress - p.physicalProgress > 15 ? "Spending ahead of works" : undefined),
    },
  ],
  summary: (_items, rows) => {
    const budget = sum(rows, (p) => p.budget)
    return [
      { label: "Project budget", value: budget, format: "peso" },
      { label: "Obligated", value: sum(rows, (p) => p.obligated), format: "peso" },
      { label: "Disbursed", value: sum(rows, (p) => p.disbursed), format: "peso" },
      {
        label: "Financial progress",
        value: percent(
          sum(rows, (p) => p.disbursed),
          budget,
        ),
        format: "percent",
      },
    ]
  },
  charts: [
    {
      type: "grouped",
      title: "Budget vs obligated vs disbursed",
      wide: true,
      horizontal: true,
      valueFormat: "peso",
      series: [
        { key: "budget", name: "Budget" },
        { key: "obligated", name: "Obligated" },
        { key: "disbursed", name: "Disbursed" },
      ],
      data: ({ rows }) => rows.map((p) => ({ label: p.name, budget: p.budget, obligated: p.obligated, disbursed: p.disbursed })),
    },
  ],
  orientation: "landscape",
  note: "Budget is the linked PPA's approved amount. Financial progress = disbursed ÷ budget, as on the project page. Gap is in percentage points.",
})

export const delayedProjects = defineReport<Project, ProjectRow>({
  ...common,
  id: "delayed-projects",
  title: "Delayed Projects",
  description: "Projects flagged as delayed or past their target completion date.",
  source: (d) => d.projects.filter(d.scope.project).filter((p) => isProjectDelayed(p, d.today)),
  filters: [jf.year, jf.category, jf.official],
  columns: [
    jc.code,
    jc.name,
    jc.target,
    jc.physical,
    {
      id: "delay",
      header: "Days Delayed",
      format: "number",
      value: (p) => p.delay || undefined,
      detail: (p) => (p.delay ? undefined : "Flagged, target not yet passed"),
    },
    jc.responsible,
    jc.status,
  ],
  summary: (items, rows) => [
    { label: "Delayed projects", value: items.length, tone: "danger" },
    { label: "Longest delay", value: rows.length ? Math.max(...rows.map((p) => p.delay)) : 0, hint: "days past target" },
    { label: "Budget at risk", value: sum(rows, (p) => p.budget - p.disbursed), format: "peso", hint: "Undisbursed budget of delayed projects" },
  ],
  note: "A project is delayed when flagged Delayed or when it is not completed by its target date.",
})

export const PROJECT_REPORTS = [projectMaster, projectStatus, projectPhysical, projectFinancial, delayedProjects]
