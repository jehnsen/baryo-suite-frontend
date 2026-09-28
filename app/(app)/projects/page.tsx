import type { Metadata } from "next"
import { ProjectsView } from "@/features/operations/projects-view"

export const metadata: Metadata = { title: "Programs & Projects" }

export default function Page() {
  return <ProjectsView />
}
