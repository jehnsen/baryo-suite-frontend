"use client"

import Link from "next/link"
import { UserMinus } from "lucide-react"
import type { Resident } from "@/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PersonAvatar } from "@/components/shared/person-avatar"
import { TagBadge } from "@/components/shared/status-badge"
import { computeAge, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ResidentBadges } from "@/features/residents/resident-badges"

/** Compact member list — small, fixed-size data, so a plain table (no paging). */
export function HouseholdMembersTable({ members, highlightId, onRemove }: { members: Resident[]; highlightId?: string; onRemove?: (r: Resident) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs">Name</TableHead>
            <TableHead className="text-xs">Relationship</TableHead>
            <TableHead className="text-xs">Age</TableHead>
            <TableHead className="text-xs">Sex</TableHead>
            <TableHead className="text-xs">Occupation</TableHead>
            {onRemove && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id} className={cn(m.id === highlightId && "bg-accent/40")}>
              <TableCell className="pl-4">
                <div className="flex items-center gap-2.5">
                  <PersonAvatar name={fullName(m)} size="sm" />
                  <div className="min-w-0">
                    <Link href={`/residents/${m.id}`} className="block truncate font-medium hover:underline">
                      {fullName(m)}
                    </Link>
                    <ResidentBadges classification={m.classification} />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {m.relationshipToHead === "Head" ? <TagBadge className="border-primary/30 text-primary">Head</TagBadge> : (m.relationshipToHead ?? "—")}
              </TableCell>
              <TableCell className="tabular-nums">{computeAge(m.birthDate)}</TableCell>
              <TableCell>{m.gender}</TableCell>
              <TableCell className="text-muted-foreground">{m.occupation ?? (m.classification.student ? "Student" : "—")}</TableCell>
              {onRemove && (
                <TableCell>
                  {m.relationshipToHead !== "Head" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={() => onRemove(m)} aria-label={`Remove ${fullName(m)}`}>
                          <UserMinus />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from household</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
