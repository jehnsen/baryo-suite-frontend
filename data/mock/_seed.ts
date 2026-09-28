/**
 * Deterministic helpers for generating mock data.
 * A seeded PRNG keeps server and client renders identical (no hydration drift).
 */

export const MOCK_TODAY = "2026-09-28"

export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((s, [, w]) => s + w, 0)
      let r = next() * total
      for (const [item, w] of items) {
        r -= w
        if (r <= 0) return item
      }
      return items[items.length - 1][0]
    },
  }
}

export type Rng = ReturnType<typeof createRng>

export const pad = (n: number, width = 4) => String(n).padStart(width, "0")

/** Returns yyyy-MM-dd for a date offset (in days) from MOCK_TODAY. */
export function daysAgo(days: number): string {
  const d = new Date(`${MOCK_TODAY}T00:00:00`)
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`
}

/** Full ISO timestamp (local, +08:00) for a day offset and time. */
export function timestampDaysAgo(days: number, hour: number, minute: number): string {
  // Same-day records are kept to early morning so they never appear to be in the future.
  const h = days <= 0 ? Math.min(hour, 7) : hour
  return `${daysAgo(days)}T${pad(h, 2)}:${pad(minute, 2)}:00+08:00`
}

export function mobileNumber(rng: Rng): string {
  const prefix = rng.pick(["0917", "0918", "0920", "0927", "0935", "0945", "0955", "0961", "0977", "0998", "0906", "0915"])
  return `${prefix} ${rng.int(100, 999)} ${pad(rng.int(0, 9999), 4)}`
}

export const MALE_NAMES = [
  "Juan",
  "Jose",
  "Roberto",
  "Michael",
  "Mark Anthony",
  "John Paul",
  "Christian",
  "Rommel",
  "Eduardo",
  "Ramon",
  "Jerome",
  "Paolo",
  "Carlo",
  "Rodel",
  "Arnel",
  "Noel",
  "Danilo",
  "Ernesto",
  "Joshua",
  "Kenneth",
  "Angelo",
  "Rafael",
  "Miguel",
  "Gabriel",
  "Nathaniel",
  "Jericho",
  "Reynaldo",
  "Alfredo",
  "Renato",
  "Benjamin",
  "Francis",
  "Dennis",
  "Marvin",
  "Jayson",
  "Ryan",
  "Vincent",
  "Emmanuel",
  "Crisanto",
  "Leonardo",
  "Andres",
] as const

export const FEMALE_NAMES = [
  "Maria",
  "Angela",
  "Rhea Mae",
  "Kristine",
  "Jennifer",
  "Ma. Theresa",
  "Rosario",
  "Liza",
  "Cristina",
  "Marites",
  "Jocelyn",
  "Analyn",
  "Lorna",
  "Divina",
  "Erlinda",
  "Sheila",
  "Janine",
  "Patricia",
  "Camille",
  "Princess",
  "Nicole",
  "Andrea",
  "Bea",
  "Katrina",
  "Joy",
  "Mary Grace",
  "Rowena",
  "Evelyn",
  "Aurora",
  "Corazon",
  "Leonora",
  "Imelda",
  "Gemma",
  "Glaiza",
  "Hazel",
  "Jasmine",
  "Aileen",
  "Charmaine",
  "Frances",
  "Althea",
] as const

export const LAST_NAMES = [
  "Dela Cruz",
  "Santos",
  "Garcia",
  "Mendoza",
  "Bautista",
  "Ramos",
  "Reyes",
  "Cruz",
  "Villanueva",
  "Aquino",
  "Gonzales",
  "Fernandez",
  "Lopez",
  "Castillo",
  "Navarro",
  "Pascual",
  "Salazar",
  "Mercado",
  "Aguilar",
  "Tolentino",
  "De Guzman",
  "Manalo",
  "Soriano",
  "Dizon",
  "Enriquez",
  "Valdez",
  "Samonte",
  "Galang",
  "Sison",
  "Lacson",
  "Mangahas",
  "Cunanan",
  "Pangilinan",
  "Del Rosario",
  "Carpio",
  "Ocampo",
  "Estrella",
  "Mallari",
  "Lingad",
  "Sarmiento",
] as const

export const MIDDLE_NAMES = LAST_NAMES

export const PUROKS = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"] as const

export const SITIOS: Record<(typeof PUROKS)[number], string[]> = {
  "Purok 1": ["Sitio Maligaya"],
  "Purok 2": ["Sitio Bagong Silang"],
  "Purok 3": ["Sitio Riverside", "Sitio Ilog"],
  "Purok 4": ["Sitio Mabini"],
  "Purok 5": ["Sitio Sampaguita"],
  "Purok 6": ["Sitio Pulo"],
  "Purok 7": ["Sitio Kawayanan"],
}

export const STREETS: Record<(typeof PUROKS)[number], string[]> = {
  "Purok 1": ["Rizal St.", "Burgos St."],
  "Purok 2": ["Mabini St.", "Del Pilar St."],
  "Purok 3": ["Bonifacio St.", "Riverside Rd."],
  "Purok 4": ["Luna St.", "Jacinto St."],
  "Purok 5": ["Sampaguita St.", "Camia St."],
  "Purok 6": ["DRT Highway", "Gumamela St."],
  "Purok 7": ["Kawayan St.", "San Roque Rd."],
}

export const OCCUPATIONS = [
  "Tricycle Driver",
  "Sari-sari Store Owner",
  "Teacher",
  "Nurse",
  "Construction Worker",
  "Farmer",
  "Vendor",
  "Office Clerk",
  "Call Center Agent",
  "Factory Worker",
  "Jeepney Driver",
  "Security Guard",
  "Housekeeper",
  "Electrician",
  "Carpenter",
  "Government Employee",
  "OFW",
  "Barber",
  "Seamstress",
  "Mechanic",
  "Engineer",
  "Accountant",
  "Pharmacist",
  "Welder",
  "Baker",
] as const

export const BIRTHPLACES = [
  "Baliwag, Bulacan",
  "Baliwag, Bulacan",
  "Baliwag, Bulacan",
  "Malolos, Bulacan",
  "San Rafael, Bulacan",
  "Pulilan, Bulacan",
  "Plaridel, Bulacan",
  "Manila",
  "Quezon City",
  "Cabanatuan, Nueva Ecija",
  "San Miguel, Bulacan",
  "Tarlac City, Tarlac",
  "Iloilo City",
  "Tacloban, Leyte",
] as const
