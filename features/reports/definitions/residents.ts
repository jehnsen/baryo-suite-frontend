import type { Household, Resident } from "@/types"
import { CLASSIFICATION_LABELS, GENDERS, HOUSING_TYPES, INCOME_RANGES, RESIDENT_STATUSES } from "@/lib/constants"
import { formalName, formatAddress } from "@/lib/format"
import type { ReportData } from "@/lib/reports/data"
import { REPORT_AGE_GROUPS, ageGroupOf, ageOf, averageHouseholdSize, countBy, isYouth, percent, sum, voterStatus } from "@/lib/reports/metrics"
import { defineReport, type ReportColumn, type ReportFilterSpec, type ReportMetric } from "@/lib/reports/types"

/* Residents & Households — population figures use Active residents, as on the dashboard. */

const activeResidents = (d: ReportData) => d.residents.filter((r) => r.status === "Active")

type ClassificationKey = keyof typeof CLASSIFICATION_LABELS
const classificationKeys = (r: Resident) => (Object.keys(CLASSIFICATION_LABELS) as ClassificationKey[]).filter((k) => r.classification[k])

/** Resident enriched with report-date values (age) and lookups (household number). */
type ResidentRow = Resident & { age: number; householdNumber?: string; classificationText: string }

const toResidentRows = (items: Resident[], d: ReportData): ResidentRow[] =>
  items
    .map((r) => ({
      ...r,
      age: ageOf(r, d.now),
      householdNumber: r.householdId ? d.by.household.get(r.householdId)?.householdNumber : undefined,
      classificationText: classificationKeys(r)
        .filter((k) => k !== "registeredVoter")
        .map((k) => CLASSIFICATION_LABELS[k])
        .join(", "),
    }))
    .sort((a, b) => formalName(a).localeCompare(formalName(b)))

const rf = {
  search: { id: "search", label: "Name or resident ID", getText: (r) => `${formalName(r)} ${r.firstName} ${r.lastName} ${r.residentNumber}` },
  purok: { id: "purok", get: (r) => r.address.purok },
  gender: { id: "gender", get: (r) => r.gender },
  ageGroup: { id: "ageGroup", get: (r, d) => ageGroupOf(ageOf(r, d.now)) },
  civilStatus: { id: "civilStatus", get: (r) => r.civilStatus },
  classification: { id: "classification", get: (r) => classificationKeys(r) },
  voterStatus: { id: "voterStatus", get: (r) => voterStatus(r) },
} satisfies Record<string, ReportFilterSpec<Resident>>

const rc = {
  id: { id: "residentNumber", header: "Resident ID", format: "mono", value: (r) => r.residentNumber },
  name: { id: "name", header: "Name", value: (r) => formalName(r), total: "count" },
  gender: { id: "gender", header: "Gender", value: (r) => r.gender },
  age: { id: "age", header: "Age", format: "number", value: (r) => r.age },
  birthDate: { id: "birthDate", header: "Birth Date", format: "date", value: (r) => r.birthDate },
  civilStatus: { id: "civilStatus", header: "Civil Status", value: (r) => r.civilStatus },
  address: { id: "address", header: "Address", value: (r) => formatAddress(r.address, { includePurok: false }) },
  purok: { id: "purok", header: "Purok", value: (r) => r.address.purok },
  household: { id: "household", header: "Household", format: "mono", value: (r) => r.householdNumber },
  contact: { id: "contact", header: "Contact", value: (r) => r.contactNumber },
  voter: { id: "voter", header: "Voter Status", value: voterStatus },
  classification: { id: "classification", header: "Classification", value: (r) => r.classificationText || undefined },
  status: { id: "status", header: "Status", format: "status", value: (r) => r.status },
} satisfies Record<string, ReportColumn<ResidentRow>>

const residentLink = { module: "residents" as const, href: (r: ResidentRow) => `/residents/${r.id}` }

const genderSplit = (items: Resident[]): ReportMetric[] =>
  GENDERS.map((g) => {
    const n = items.filter((r) => r.gender === g).length
    return { label: g, value: n, hint: `${percent(n, items.length).toFixed(1)}% of list` }
  })

/** Sectoral master list (seniors, PWD, solo parents, voters) over Active residents. */
function sectoralList(opts: {
  id: string
  title: string
  description: string
  where: (r: Resident) => boolean
  columns: ReportColumn<ResidentRow>[]
  total: string
  extra?: (rows: ResidentRow[]) => ReportMetric[]
  note?: string
}) {
  return defineReport<Resident, ResidentRow>({
    id: opts.id,
    title: opts.title,
    description: opts.description,
    section: "residents",
    slug: "residents",
    source: (d) => activeResidents(d).filter(opts.where),
    filters: [rf.search, rf.purok, rf.gender, rf.ageGroup],
    rows: toResidentRows,
    rowId: (r) => r.id,
    columns: opts.columns,
    summary: (items, rows) => [{ label: opts.total, value: items.length }, ...genderSplit(items), ...(opts.extra?.(rows) ?? [])],
    rowLink: residentLink,
    note: opts.note,
  })
}

/* ---------------------------------------------------------------- reports -- */

export const residentMaster = defineReport<Resident, ResidentRow>({
  id: "resident-master",
  title: "Resident Master List",
  description: "Every registered resident with demographic, household and classification details.",
  section: "residents",
  slug: "residents",
  source: (d) => d.residents.filter((r) => r.status !== "Archived"),
  filters: [
    rf.search,
    rf.purok,
    rf.gender,
    rf.ageGroup,
    rf.civilStatus,
    rf.classification,
    rf.voterStatus,
    { id: "status", options: RESIDENT_STATUSES.filter((s) => s !== "Archived"), get: (r) => r.status, defaultValues: ["Active"] },
  ],
  rows: toResidentRows,
  rowId: (r) => r.id,
  columns: [rc.id, rc.name, rc.gender, rc.age, rc.birthDate, rc.civilStatus, rc.purok, rc.household, rc.contact, rc.voter, rc.classification, rc.status],
  summary: (items) => [
    { label: "Residents", value: items.length },
    ...genderSplit(items),
    { label: "Registered voters", value: items.filter((r) => r.classification.registeredVoter).length },
  ],
  rowLink: residentLink,
  orientation: "landscape",
})

const POPULATION_INDICATORS: { label: string; test: (r: Resident, age: number) => boolean }[] = [
  { label: "Male", test: (r) => r.gender === "Male" },
  { label: "Female", test: (r) => r.gender === "Female" },
  { label: "Senior citizens", test: (r) => r.classification.seniorCitizen },
  { label: "Youth (15–30)", test: (_r, age) => isYouth(age) },
  { label: "Persons with disability", test: (r) => r.classification.pwd },
  { label: "Solo parents", test: (r) => r.classification.soloParent },
  { label: "Registered voters", test: (r) => r.classification.registeredVoter },
  { label: "Indigent", test: (r) => r.classification.indigent },
  { label: "Students", test: (r) => r.classification.student },
  { label: "Unemployed", test: (r) => r.classification.unemployed },
]

type IndicatorRow = { label: string; count: number; share: number }

export const populationSummary = defineReport<Resident, IndicatorRow>({
  id: "population-summary",
  title: "Population Summary",
  description: "Population profile of active residents by gender, age, purok and sector.",
  section: "residents",
  slug: "residents",
  source: activeResidents,
  filters: [rf.purok, rf.gender, rf.ageGroup, rf.classification],
  rows: (items, d) =>
    POPULATION_INDICATORS.map((ind) => {
      const count = items.filter((r) => ind.test(r, ageOf(r, d.now))).length
      return { label: ind.label, count, share: percent(count, items.length) }
    }),
  rowId: (r) => r.label,
  tableTitle: "Population indicators",
  columns: [
    { id: "label", header: "Indicator", value: (r) => r.label },
    { id: "count", header: "Count", format: "number", value: (r) => r.count },
    { id: "share", header: "% of population", format: "progress", value: (r) => r.share },
  ],
  summary: (items, rows) => {
    const get = (label: string) => rows.find((r) => r.label === label)?.count ?? 0
    return [
      { label: "Total population", value: items.length },
      { label: "Male", value: get("Male") },
      { label: "Female", value: get("Female") },
      { label: "Senior citizens", value: get("Senior citizens") },
      { label: "Youth (15–30)", value: get("Youth (15–30)") },
      { label: "PWD", value: get("Persons with disability") },
      { label: "Solo parents", value: get("Solo parents") },
      { label: "Registered voters", value: get("Registered voters") },
    ]
  },
  charts: [
    { type: "proportion", title: "Population by gender", data: ({ items }) => countBy(items, (r) => r.gender, GENDERS) },
    {
      type: "bar",
      title: "Population by age group",
      seriesName: "Residents",
      data: ({ items, d }) =>
        countBy(
          items,
          (r) => ageGroupOf(ageOf(r, d.now)),
          REPORT_AGE_GROUPS.map((g) => g.label),
        ),
    },
    {
      type: "bar",
      title: "Population by purok",
      seriesName: "Residents",
      data: ({ items, d }) =>
        countBy(
          items,
          (r) => r.address.purok,
          d.settings.puroks.map((p) => p.name),
        ).map((x) => ({ ...x, label: x.label.replace("Purok ", "P-") })),
    },
    {
      type: "hbar",
      title: "Population by classification",
      seriesName: "Residents",
      data: ({ rows }) => rows.filter((r) => r.label !== "Male" && r.label !== "Female").map((r) => ({ label: r.label, value: r.count })),
    },
  ],
  note: "Youth follows RA 10742 (ages 15–30). A resident can belong to several sectors, so sector counts overlap.",
})

type PurokRow = {
  purok: string
  population: number
  male: number
  female: number
  households: number
  seniors: number
  pwd: number
  voters: number
  share: number
}

export const populationByPurok = defineReport<Resident, PurokRow>({
  id: "population-by-purok",
  title: "Population by Purok",
  description: "Population, households and sectors per purok, with each purok's share of the total.",
  section: "residents",
  slug: "residents",
  source: activeResidents,
  filters: [rf.gender, rf.ageGroup, rf.classification],
  rows: (items, d) =>
    d.settings.puroks.map((p) => {
      const inPurok = items.filter((r) => r.address.purok === p.name)
      return {
        purok: p.name,
        population: inPurok.length,
        male: inPurok.filter((r) => r.gender === "Male").length,
        female: inPurok.filter((r) => r.gender === "Female").length,
        households: d.households.filter((h) => h.status === "Active" && h.address.purok === p.name).length,
        seniors: inPurok.filter((r) => r.classification.seniorCitizen).length,
        pwd: inPurok.filter((r) => r.classification.pwd).length,
        voters: inPurok.filter((r) => r.classification.registeredVoter).length,
        share: percent(inPurok.length, items.length),
      }
    }),
  rowId: (r) => r.purok,
  columns: [
    { id: "purok", header: "Purok", value: (r) => r.purok },
    { id: "population", header: "Population", format: "number", value: (r) => r.population, total: "sum" },
    { id: "male", header: "Male", format: "number", value: (r) => r.male, total: "sum" },
    { id: "female", header: "Female", format: "number", value: (r) => r.female, total: "sum" },
    { id: "households", header: "Households", format: "number", value: (r) => r.households, total: "sum" },
    { id: "seniors", header: "Senior Citizens", format: "number", value: (r) => r.seniors, total: "sum" },
    { id: "pwd", header: "PWD", format: "number", value: (r) => r.pwd, total: "sum" },
    { id: "voters", header: "Voters", format: "number", value: (r) => r.voters, total: "sum" },
    { id: "share", header: "% of Total", format: "percent", value: (r) => r.share, total: (rows) => (sum(rows, (r) => r.population) ? 100 : 0) },
  ],
  charts: [
    {
      type: "bar",
      title: "Population by purok",
      wide: true,
      seriesName: "Residents",
      data: ({ rows }) => rows.map((r) => ({ label: r.purok, value: r.population })),
    },
  ],
  note: "Households are counted from active household records in each purok and are not affected by resident filters.",
})

type AgeRow = { group: string; male: number; female: number; total: number; share: number }

export const ageDistribution = defineReport<Resident, AgeRow>({
  id: "age-distribution",
  title: "Age Distribution",
  description: "Active residents by age bracket and gender.",
  section: "residents",
  slug: "residents",
  source: activeResidents,
  filters: [rf.purok, rf.gender, rf.classification],
  rows: (items, d) =>
    REPORT_AGE_GROUPS.map((g) => {
      const inGroup = items.filter((r) => ageGroupOf(ageOf(r, d.now)) === g.label)
      return {
        group: g.label,
        male: inGroup.filter((r) => r.gender === "Male").length,
        female: inGroup.filter((r) => r.gender === "Female").length,
        total: inGroup.length,
        share: percent(inGroup.length, items.length),
      }
    }),
  rowId: (r) => r.group,
  columns: [
    { id: "group", header: "Age Group", value: (r) => r.group },
    { id: "male", header: "Male", format: "number", value: (r) => r.male, total: "sum" },
    { id: "female", header: "Female", format: "number", value: (r) => r.female, total: "sum" },
    { id: "total", header: "Total", format: "number", value: (r) => r.total, total: "sum" },
    { id: "share", header: "% of Population", format: "progress", value: (r) => r.share },
  ],
  summary: (items, _rows, d) => {
    const ages = items.map((r) => ageOf(r, d.now)).sort((a, b) => a - b)
    const median = ages.length ? ages[Math.floor(ages.length / 2)] : 0
    return [
      { label: "Residents", value: items.length },
      { label: "Median age", value: median },
      { label: "Children (0–17)", value: ages.filter((a) => a < 18).length },
      { label: "Working age (18–59)", value: ages.filter((a) => a >= 18 && a < 60).length },
      { label: "60 and over", value: ages.filter((a) => a >= 60).length },
    ]
  },
  charts: [
    {
      type: "grouped",
      title: "Age groups by gender",
      wide: true,
      series: [
        { key: "male", name: "Male" },
        { key: "female", name: "Female" },
      ],
      data: ({ rows }) => rows.map((r) => ({ label: r.group, male: r.male, female: r.female })),
    },
  ],
})

export const seniorCitizens = sectoralList({
  id: "senior-citizens",
  title: "Senior Citizen Master List",
  description: "Active residents classified as senior citizens, with address and household.",
  where: (r) => r.classification.seniorCitizen,
  total: "Senior citizens",
  columns: [rc.name, rc.age, rc.gender, rc.address, rc.purok, rc.contact, rc.household],
  extra: (rows) => [{ label: "Aged 80 and over", value: rows.filter((r) => r.age >= 80).length }],
})

export const pwdList = sectoralList({
  id: "pwd",
  title: "PWD Master List",
  description: "Active residents registered as persons with disability. No medical details are included.",
  where: (r) => r.classification.pwd,
  total: "Persons with disability",
  columns: [rc.name, rc.age, rc.gender, rc.civilStatus, rc.address, rc.purok, rc.contact, rc.household],
  note: "Contains contact details only; disability type and medical records are outside this report.",
})

export const soloParents = sectoralList({
  id: "solo-parents",
  title: "Solo Parent Master List",
  description: "Active residents classified as solo parents.",
  where: (r) => r.classification.soloParent,
  total: "Solo parents",
  columns: [rc.name, rc.age, rc.gender, rc.civilStatus, rc.address, rc.purok, rc.contact, rc.household],
})

export const registeredVoters = sectoralList({
  id: "registered-voters",
  title: "Registered Voters List",
  description: "Active residents registered as voters in the barangay.",
  where: (r) => r.classification.registeredVoter,
  total: "Registered voters",
  columns: [rc.id, rc.name, rc.gender, rc.age, rc.birthDate, rc.address, rc.purok],
  extra: (rows) => [{ label: "Youth voters (18–30)", value: rows.filter((r) => isYouth(r.age)).length }],
})

/* ------------------------------------------------------------- households -- */

type HouseholdRow = Household & { head: string; members: string; size: number }

const toHouseholdRows = (items: Household[], d: ReportData): HouseholdRow[] =>
  items
    .map((h) => {
      const members = d.members.get(h.id) ?? []
      return {
        ...h,
        head: formalName(d.by.resident.get(h.headId)),
        members: members
          .filter((m) => m.id !== h.headId)
          .map((m) => `${m.firstName} ${m.lastName}`)
          .join(", "),
        size: members.length,
      }
    })
    .sort((a, b) => a.householdNumber.localeCompare(b.householdNumber))

const hf = {
  purok: { id: "purok", get: (h) => h.address.purok },
  incomeRange: { id: "incomeRange", get: (h) => h.incomeRange },
  housingType: { id: "housingType", get: (h) => h.housingType },
} satisfies Record<string, ReportFilterSpec<Household>>

export const householdMaster = defineReport<Household, HouseholdRow>({
  id: "household-master",
  title: "Household Master List",
  description: "Households with head, members, size, income range and housing type.",
  section: "residents",
  slug: "households",
  source: (d) => d.households,
  filters: [
    { id: "search", label: "Household no. or head", getText: (h, d) => `${h.householdNumber} ${formalName(d.by.resident.get(h.headId))}` },
    hf.purok,
    hf.incomeRange,
    hf.housingType,
    { id: "status", options: ["Active", "Inactive"], get: (h) => h.status, defaultValues: ["Active"] },
  ],
  rows: toHouseholdRows,
  rowId: (h) => h.id,
  columns: [
    { id: "householdNumber", header: "Household No.", format: "mono", value: (h) => h.householdNumber, total: "count" },
    { id: "head", header: "Household Head", value: (h) => h.head },
    { id: "address", header: "Address", value: (h) => formatAddress(h.address, { includePurok: false }) },
    { id: "purok", header: "Purok", value: (h) => h.address.purok },
    { id: "members", header: "Members", value: (h) => h.members || undefined },
    { id: "size", header: "Household Size", format: "number", value: (h) => h.size, total: "sum" },
    { id: "incomeRange", header: "Income Range", value: (h) => h.incomeRange },
    { id: "housingType", header: "Housing Type", value: (h) => h.housingType },
  ],
  summary: (items, rows) => [
    { label: "Households", value: items.length },
    { label: "Residents in households", value: sum(rows, (h) => h.size) },
    { label: "Average household size", value: rows.length ? sum(rows, (h) => h.size) / rows.length : 0, hint: "Active members per household" },
  ],
  rowLink: { module: "households", href: (h) => `/households/${h.id}` },
  orientation: "landscape",
  note: "Members lists active residents other than the head; household size counts the head.",
})

type HouseholdPurokRow = { purok: string; households: number; members: number; average: number; share: number }

export const householdSummary = defineReport<Household, HouseholdPurokRow>({
  id: "household-summary",
  title: "Household Population Summary",
  description: "Household counts and average size by purok, income range and housing type.",
  section: "residents",
  slug: "households",
  source: (d) => d.households.filter((h) => h.status === "Active"),
  filters: [hf.purok, hf.incomeRange, hf.housingType],
  rows: (items, d) =>
    d.settings.puroks.map((p) => {
      const list = items.filter((h) => h.address.purok === p.name)
      const members = sum(list, (h) => d.members.get(h.id)?.length ?? 0)
      return { purok: p.name, households: list.length, members, average: list.length ? members / list.length : 0, share: percent(list.length, items.length) }
    }),
  rowId: (r) => r.purok,
  tableTitle: "Households by purok",
  columns: [
    { id: "purok", header: "Purok", value: (r) => r.purok },
    { id: "households", header: "Households", format: "number", value: (r) => r.households, total: "sum" },
    { id: "members", header: "Members", format: "number", value: (r) => r.members, total: "sum" },
    {
      id: "average",
      header: "Average Size",
      format: "number",
      value: (r) => Math.round(r.average * 10) / 10,
      total: (rows) =>
        Math.round(
          (sum(rows, (r) => r.members) /
            Math.max(
              1,
              sum(rows, (r) => r.households),
            )) *
            10,
        ) / 10,
    },
    { id: "share", header: "% of Households", format: "progress", value: (r) => r.share },
  ],
  summary: (items, _rows, d) => [
    { label: "Total households", value: items.length },
    { label: "Average household size", value: averageHouseholdSize(items, d.members) },
    {
      label: "With electricity",
      value: items.filter((h) => h.hasElectricity).length,
      hint: `${percent(items.filter((h) => h.hasElectricity).length, items.length).toFixed(0)}%`,
    },
    { label: "Owned dwellings", value: items.filter((h) => h.ownershipStatus === "Owned").length },
  ],
  charts: [
    {
      type: "bar",
      title: "Households by purok",
      seriesName: "Households",
      data: ({ rows }) => rows.map((r) => ({ label: r.purok.replace("Purok ", "P-"), value: r.households })),
    },
    { type: "hbar", title: "Households by income range", seriesName: "Households", data: ({ items }) => countBy(items, (h) => h.incomeRange, INCOME_RANGES) },
    { type: "proportion", title: "Housing type distribution", wide: true, data: ({ items }) => countBy(items, (h) => h.housingType, HOUSING_TYPES) },
  ],
})

export const RESIDENT_REPORTS = [
  residentMaster,
  populationSummary,
  populationByPurok,
  ageDistribution,
  seniorCitizens,
  pwdList,
  soloParents,
  registeredVoters,
  householdMaster,
  householdSummary,
]
