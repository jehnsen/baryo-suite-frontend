import type { Committee, PPA, Project } from "@/types"

/**
 * Assignment scoping for roles in SCOPED_TO_ASSIGNMENTS (none today; built for Kagawad accounts): they see
 * the committees they sit on and the PPAs/projects they are responsible for or
 * whose committee they sit on. Unscoped roles see everything.
 */
export function buildAssignmentScope(input: { scoped: boolean; officialId?: string; committees: Committee[]; ppas: PPA[] }) {
  const { scoped, officialId } = input
  const myCommittees = new Set(
    input.committees
      .filter((c) => officialId && (c.chairpersonId === officialId || c.viceChairId === officialId || c.memberIds.includes(officialId)))
      .map((c) => c.id),
  )
  const ppaById = new Map(input.ppas.map((p) => [p.id, p]))
  const ppaVisible = (p: PPA) => !scoped || p.responsibleOfficialId === officialId || (p.committeeId !== undefined && myCommittees.has(p.committeeId))
  const projectVisible = (projectPpa: PPA | undefined, responsibleOfficialId: string) =>
    !scoped || responsibleOfficialId === officialId || (projectPpa ? ppaVisible(projectPpa) : false)
  return {
    scoped,
    myCommittees,
    ppaVisible,
    projectVisible,
    committeeVisible: (c: Committee) => !scoped || myCommittees.has(c.id),
    project: (p: Project) => projectVisible(ppaById.get(p.ppaId), p.responsibleOfficialId),
  }
}

export type AssignmentScope = ReturnType<typeof buildAssignmentScope>
