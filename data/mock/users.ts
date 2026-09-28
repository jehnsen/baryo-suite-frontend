import type { User } from "@/types"

export const users: User[] = [
  {
    id: "usr-001",
    name: "Carlo Navarro",
    email: "carlo.navarro@brgysanroque.ph",
    role: "Administrator",
    status: "Active",
    lastLogin: "2026-09-28T07:12:00+08:00",
    createdAt: "2023-12-04T09:00:00+08:00",
  },
  {
    id: "usr-003",
    name: "Kristine Joy B. Ocampo",
    email: "secretary@brgysanroque.ph",
    role: "Secretary",
    status: "Active",
    officialId: "off-010",
    lastLogin: "2026-09-28T06:55:00+08:00",
    createdAt: "2023-12-04T09:15:00+08:00",
  },
  {
    id: "usr-004",
    name: "Emmanuel D. Sarmiento",
    email: "treasurer@brgysanroque.ph",
    role: "Treasurer",
    status: "Active",
    officialId: "off-011",
    lastLogin: "2026-09-26T10:21:00+08:00",
    createdAt: "2023-12-05T08:30:00+08:00",
  },
]
