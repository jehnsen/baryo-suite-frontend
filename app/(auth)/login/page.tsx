import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginView } from "@/features/auth/login-view"

export const metadata: Metadata = { title: "Sign in" }

export default function Page() {
  // Reads ?next= and ?reason= via useSearchParams.
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  )
}
