import type { Role, User } from "@/types"

/**
 * MOCK AUTHENTICATION — hardcoded demo accounts and a plain session cookie.
 * Not secure: the cookie only holds the user id. Replace with the real auth
 * provider (hashed passwords, signed httpOnly session) when the API exists.
 */

export const SESSION_COOKIE = "baryosuite_session"
const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours

export interface DemoAccount {
  username: string
  password: string
  userId: string
  role: Role
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "admin", password: "admin123", userId: "usr-001", role: "Administrator" },
  { username: "secretary", password: "secretary123", userId: "usr-003", role: "Secretary" },
  { username: "treasurer", password: "treasurer123", userId: "usr-004", role: "Treasurer" },
]

export const isSessionUserId = (value: string | undefined): value is string => DEMO_ACCOUNTS.some((a) => a.userId === value)

/** Username or the account's email, plus password. Suspended or invited accounts cannot sign in. */
export function authenticate(identifier: string, password: string, users: User[]): { ok: true; user: User } | { ok: false; error: string } {
  const id = identifier.trim().toLowerCase()
  const account = DEMO_ACCOUNTS.find((a) => a.username === id || users.find((u) => u.id === a.userId)?.email.toLowerCase() === id)
  if (!account || account.password !== password) return { ok: false, error: "Incorrect username or password." }
  const user = users.find((u) => u.id === account.userId)
  if (!user || user.status !== "Active") return { ok: false, error: "This account is not active. Contact the barangay administrator." }
  return { ok: true, user }
}

/* ----------------------------------------------------- browser session cookie -- */

export function readSessionCookie(): string | undefined {
  if (typeof document === "undefined") return undefined
  const value = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1]
  return isSessionUserId(value) ? value : undefined
}

export function writeSessionCookie(userId: string) {
  document.cookie = `${SESSION_COOKIE}=${userId}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax`
}

export function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`
}

/** Only same-app paths are allowed as post-login destinations. */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard"
