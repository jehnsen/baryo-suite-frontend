import { clearSessionCookie, writeSessionCookie } from "@/lib/auth"
import { get, log, now, set } from "./helpers"

/* Sign-in state lives in the store (current user) and a cookie (read by proxy.ts on the server). */

export const authActions = {
  signIn(userId: string) {
    writeSessionCookie(userId)
    set((s) => ({ ...s, session: { ...s.session, currentUserId: userId } }))
    const user = get().users.find((u) => u.id === userId)
    set((s) => ({ ...s, users: s.users.map((u) => (u.id === userId ? { ...u, lastLogin: now() } : u)) }))
    log("Logged In", "Auth", user?.email ?? userId, "Successful sign-in.", userId)
  },
  signOut() {
    const userId = get().session.currentUserId
    log("Logged Out", "Auth", get().users.find((u) => u.id === userId)?.email ?? userId, "Signed out.", userId)
    clearSessionCookie()
    set((s) => ({ ...s, session: { ...s.session, currentUserId: "" } }))
  },
}
