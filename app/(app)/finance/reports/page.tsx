import { redirect } from "next/navigation"

/** Financial reports moved into the shared Reports module (Phase 3). */
export default function Page() {
  redirect("/reports/finance")
}
