import type { CivilStatus, Gender, Household, HouseholdRelationship, IncomeRange, Resident, ResidentStatus } from "@/types"
import {
  BIRTHPLACES,
  FEMALE_NAMES,
  LAST_NAMES,
  MALE_NAMES,
  MIDDLE_NAMES,
  MOCK_TODAY,
  OCCUPATIONS,
  PUROKS,
  SITIOS,
  STREETS,
  createRng,
  daysAgo,
  mobileNumber,
  pad,
  timestampDaysAgo,
  type Rng,
} from "./_seed"

/**
 * Generates households and their members together so surnames, addresses and
 * relationships stay coherent. Output is deterministic.
 */

interface MemberSpec {
  firstName: string
  gender: Gender
  age: number
  relationship: HouseholdRelationship
  civilStatus?: CivilStatus
  occupation?: string
  soloParent?: boolean
  pwd?: boolean
}

interface HouseholdSpec {
  lastName: string
  purok?: (typeof PUROKS)[number]
  members: MemberSpec[]
  income?: IncomeRange
}

const ANCHORS: HouseholdSpec[] = [
  {
    lastName: "Dela Cruz",
    purok: "Purok 1",
    members: [
      { firstName: "Juan", gender: "Male", age: 45, relationship: "Head", civilStatus: "Married", occupation: "Tricycle Driver" },
      { firstName: "Rosario", gender: "Female", age: 43, relationship: "Spouse", civilStatus: "Married", occupation: "Sari-sari Store Owner" },
      { firstName: "Joshua", gender: "Male", age: 19, relationship: "Son" },
      { firstName: "Princess", gender: "Female", age: 15, relationship: "Daughter" },
      { firstName: "Angelo", gender: "Male", age: 9, relationship: "Son" },
    ],
    income: "₱10,000 – ₱20,000",
  },
  {
    lastName: "Santos",
    purok: "Purok 2",
    members: [
      { firstName: "Maria", gender: "Female", age: 38, relationship: "Head", civilStatus: "Separated", occupation: "Nurse", soloParent: true },
      { firstName: "Camille", gender: "Female", age: 12, relationship: "Daughter" },
      { firstName: "Miguel", gender: "Male", age: 8, relationship: "Son" },
    ],
    income: "₱20,001 – ₱40,000",
  },
  {
    lastName: "Garcia",
    purok: "Purok 3",
    members: [
      { firstName: "Roberto", gender: "Male", age: 67, relationship: "Head", civilStatus: "Married" },
      { firstName: "Corazon", gender: "Female", age: 64, relationship: "Spouse", civilStatus: "Married", pwd: true },
      { firstName: "Nathaniel", gender: "Male", age: 12, relationship: "Grandchild" },
    ],
    income: "Below ₱10,000",
  },
  {
    lastName: "Mendoza",
    purok: "Purok 4",
    members: [
      { firstName: "Angela", gender: "Female", age: 34, relationship: "Head", civilStatus: "Married", occupation: "Teacher" },
      { firstName: "Mark Anthony", gender: "Male", age: 36, relationship: "Spouse", civilStatus: "Married", occupation: "OFW" },
      { firstName: "Althea", gender: "Female", age: 6, relationship: "Daughter" },
    ],
    income: "₱40,001 – ₱70,000",
  },
  {
    lastName: "Bautista",
    purok: "Purok 5",
    members: [
      { firstName: "Michael", gender: "Male", age: 29, relationship: "Head", civilStatus: "Married", occupation: "Call Center Agent" },
      { firstName: "Kristine", gender: "Female", age: 27, relationship: "Spouse", civilStatus: "Married", occupation: "Office Clerk" },
      { firstName: "Gabriel", gender: "Male", age: 2, relationship: "Son" },
    ],
    income: "₱20,001 – ₱40,000",
  },
  {
    lastName: "Ramos",
    purok: "Purok 6",
    members: [
      { firstName: "Rhea Mae", gender: "Female", age: 26, relationship: "Head", civilStatus: "Single", occupation: "Pharmacist" },
      { firstName: "Evelyn", gender: "Female", age: 58, relationship: "Parent", civilStatus: "Widowed" },
      { firstName: "Kenneth", gender: "Male", age: 21, relationship: "Sibling" },
    ],
    income: "₱20,001 – ₱40,000",
  },
]

const HOUSEHOLD_COUNT = 68
const PUROK_WEIGHTS = PUROKS.map((p, i) => [p, [16, 14, 19, 12, 15, 10, 9][i]] as const)

function birthDateForAge(rng: Rng, age: number): string {
  const [ty, tm, td] = MOCK_TODAY.split("-").map(Number)
  // pick a birthday that has already passed this year so `age` stays exact
  const month = rng.int(1, tm)
  const maxDay = month === tm ? td : 28
  const day = rng.int(1, maxDay)
  return `${ty - age}-${pad(month, 2)}-${pad(day, 2)}`
}

function randomSpecs(rng: Rng): HouseholdSpec {
  const lastName = rng.pick(LAST_NAMES)
  const headMale = rng.chance(0.74)
  const headAge = rng.weighted([
    [rng.int(22, 34), 3],
    [rng.int(35, 49), 4],
    [rng.int(50, 59), 3],
    [rng.int(60, 84), 3],
  ] as const)
  const members: MemberSpec[] = []
  const hasSpouse = rng.chance(headAge > 70 ? 0.45 : 0.78)
  const pickName = (g: Gender) => (g === "Male" ? rng.pick(MALE_NAMES) : rng.pick(FEMALE_NAMES))
  const headGender: Gender = headMale ? "Male" : "Female"

  members.push({
    firstName: pickName(headGender),
    gender: headGender,
    age: headAge,
    relationship: "Head",
    civilStatus: hasSpouse
      ? rng.weighted([
          ["Married", 9],
          ["Live-in", 2],
        ] as const)
      : headAge > 62
        ? "Widowed"
        : rng.pick(["Single", "Separated"] as const),
  })

  if (hasSpouse) {
    const g: Gender = headMale ? "Female" : "Male"
    members.push({
      firstName: pickName(g),
      gender: g,
      age: Math.max(20, headAge + rng.int(-6, 4)),
      relationship: "Spouse",
      civilStatus: members[0].civilStatus,
    })
  }

  const maxChildAge = headAge - 20
  if (maxChildAge > 0) {
    const kids = rng.weighted([
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 3],
      [4, 2],
      [5, 1],
    ] as const)
    for (let k = 0; k < kids; k++) {
      const g: Gender = rng.chance(0.5) ? "Male" : "Female"
      const age = rng.int(Math.max(0, maxChildAge - 16), maxChildAge)
      members.push({
        firstName: pickName(g),
        gender: g,
        age,
        relationship: g === "Male" ? "Son" : "Daughter",
        civilStatus: age > 26 && rng.chance(0.4) ? "Married" : "Single",
      })
    }
  }

  if (headAge < 50 && rng.chance(0.15)) {
    const g: Gender = rng.chance(0.6) ? "Female" : "Male"
    members.push({ firstName: pickName(g), gender: g, age: rng.int(headAge + 22, Math.min(92, headAge + 32)), relationship: "Parent", civilStatus: "Widowed" })
  }
  if (headAge > 55 && rng.chance(0.3)) {
    const g: Gender = rng.chance(0.5) ? "Male" : "Female"
    members.push({ firstName: pickName(g), gender: g, age: rng.int(1, 14), relationship: "Grandchild" })
  }

  const isSolo = !hasSpouse && members.some((m) => m.relationship === "Son" || m.relationship === "Daughter") && headAge < 60
  if (isSolo) members[0].soloParent = rng.chance(0.8)

  return { lastName, members }
}

function build() {
  const rng = createRng(20260928)
  const households: Household[] = []
  const residents: Resident[] = []
  let residentSeq = 1

  const specs: HouseholdSpec[] = [...ANCHORS]
  while (specs.length < HOUSEHOLD_COUNT) specs.push(randomSpecs(rng))

  const purokCounters: Record<string, number> = {}

  specs.forEach((spec, hIndex) => {
    const purok = spec.purok ?? rng.weighted(PUROK_WEIGHTS)
    const purokNo = purok.replace("Purok ", "")
    purokCounters[purok] = (purokCounters[purok] ?? 0) + 1
    const hhId = `hh-${pad(hIndex + 1, 3)}`
    const address = {
      houseNumber: `${rng.int(1, 250)}${rng.chance(0.15) ? "-" + rng.pick(["A", "B", "C"]) : ""}`,
      street: rng.pick(STREETS[purok]),
      sitio: rng.chance(0.55) ? rng.pick(SITIOS[purok]) : undefined,
      purok,
    }
    const householdCreatedDaysAgo = hIndex < ANCHORS.length ? 700 + hIndex * 20 : rng.int(20, 1000)
    const income =
      spec.income ??
      rng.weighted([
        ["Below ₱10,000", 3],
        ["₱10,000 – ₱20,000", 5],
        ["₱20,001 – ₱40,000", 4],
        ["₱40,001 – ₱70,000", 2],
        ["Above ₱70,000", 1],
      ] as const)

    const motherMaiden = rng.pick(MIDDLE_NAMES)
    let headId = ""

    spec.members.forEach((m, mIndex) => {
      const id = `res-${pad(residentSeq, 4)}`
      const createdDays = mIndex === 0 ? householdCreatedDaysAgo : Math.max(0, householdCreatedDaysAgo - rng.int(0, 30))
      const regYear = Number(daysAgo(createdDays).slice(0, 4))
      const isChild = m.relationship === "Son" || m.relationship === "Daughter" || m.relationship === "Grandchild"
      const lastName = m.relationship === "Parent" ? rng.pick(LAST_NAMES) : spec.lastName
      const adult = m.age >= 18
      const occupation = m.occupation ?? (adult && m.age < 65 && rng.chance(0.68) ? rng.pick(OCCUPATIONS) : undefined)
      const student = m.age >= 5 && m.age <= 22 && !m.occupation && rng.chance(0.9)
      const status: ResidentStatus = hIndex >= ANCHORS.length && rng.chance(0.03) ? rng.pick(["Moved Out", "Deceased"] as const) : "Active"

      if (mIndex === 0) headId = id

      residents.push({
        id,
        residentNumber: `SRQ-${regYear}-${pad(residentSeq, 5)}`,
        firstName: m.firstName,
        middleName: isChild ? motherMaiden : rng.pick(MIDDLE_NAMES),
        lastName,
        birthDate: birthDateForAge(rng, m.age),
        birthplace: rng.pick(BIRTHPLACES),
        gender: m.gender,
        civilStatus: m.civilStatus ?? "Single",
        nationality: "Filipino",
        occupation,
        contactNumber: m.age >= 15 && rng.chance(0.85) ? mobileNumber(rng) : undefined,
        email:
          adult && m.age < 55 && rng.chance(0.35)
            ? `${m.firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`
            : undefined,
        address,
        yearsOfResidency: Math.max(1, Math.min(m.age, rng.int(2, 35))),
        householdId: hhId,
        relationshipToHead: m.relationship,
        classification: {
          seniorCitizen: m.age >= 60,
          pwd: m.pwd ?? rng.chance(0.035),
          soloParent: m.soloParent ?? false,
          registeredVoter: m.age >= 18 && rng.chance(0.86),
          indigent: income === "Below ₱10,000" ? rng.chance(0.75) : false,
          student,
          unemployed: adult && m.age < 60 && !occupation && !student,
        },
        status,
        createdAt: timestampDaysAgo(createdDays, rng.int(8, 16), rng.int(0, 59)),
        updatedAt: timestampDaysAgo(Math.max(0, createdDays - rng.int(0, 120)), rng.int(8, 16), rng.int(0, 59)),
      })
      residentSeq++
    })

    households.push({
      id: hhId,
      householdNumber: `HH-${pad(Number(purokNo), 2)}-${pad(purokCounters[purok], 3)}`,
      headId,
      address,
      housingType: rng.weighted([
        ["Concrete", 5],
        ["Semi-Concrete", 4],
        ["Light Materials", 2],
        ["Apartment", 1],
      ] as const),
      ownershipStatus: rng.weighted([
        ["Owned", 6],
        ["Rented", 3],
        ["Rent-Free with Consent", 1],
        ["Informal Settler", 1],
      ] as const),
      waterSource: rng.weighted([
        ["Level III (Piped)", 6],
        ["Level II (Communal)", 2],
        ["Level I (Deep Well)", 1],
        ["Purchased/Refilling", 2],
      ] as const),
      hasElectricity: rng.chance(0.95),
      toiletFacility: rng.weighted([
        ["Water-Sealed (Own)", 7],
        ["Water-Sealed (Shared)", 2],
        ["Pit Latrine", 1],
      ] as const),
      incomeRange: income,
      status: hIndex >= ANCHORS.length && rng.chance(0.04) ? "Inactive" : "Active",
      createdAt: timestampDaysAgo(householdCreatedDaysAgo, 9, 0),
    })
  })

  // Newly registered residents not yet assigned to a household (demonstrates assignment workflow).
  const unassigned: Array<[string, string, Gender, number, (typeof PUROKS)[number]]> = [
    ["Jerome", "Sison", "Male", 24, "Purok 3"],
    ["Janine", "Lacson", "Female", 22, "Purok 2"],
    ["Ernesto", "Carpio", "Male", 31, "Purok 6"],
    ["Hazel", "Manalo", "Female", 28, "Purok 1"],
  ]
  unassigned.forEach(([firstName, lastName, gender, age, purok], i) => {
    residents.push({
      id: `res-${pad(residentSeq, 4)}`,
      residentNumber: `SRQ-2026-${pad(residentSeq, 5)}`,
      firstName,
      middleName: rng.pick(MIDDLE_NAMES),
      lastName,
      birthDate: birthDateForAge(rng, age),
      birthplace: rng.pick(BIRTHPLACES),
      gender,
      civilStatus: "Single",
      nationality: "Filipino",
      occupation: rng.pick(OCCUPATIONS),
      contactNumber: mobileNumber(rng),
      address: { houseNumber: String(rng.int(1, 200)), street: rng.pick(STREETS[purok]), purok },
      yearsOfResidency: 1,
      classification: {
        seniorCitizen: false,
        pwd: false,
        soloParent: false,
        registeredVoter: false,
        indigent: false,
        student: false,
        unemployed: false,
      },
      status: "Active",
      createdAt: timestampDaysAgo(i, 9 + i, 15),
      updatedAt: timestampDaysAgo(i, 9 + i, 15),
    })
    residentSeq++
  })

  return { households, residents }
}

export const population = build()
