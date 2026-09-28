import type { ResidentClassification } from "@/types"
import { TagBadge } from "@/components/shared/status-badge"
import { CLASSIFICATION_LABELS } from "@/lib/constants"

const SHORT: Partial<Record<keyof ResidentClassification, string>> = {
  seniorCitizen: "Senior",
  pwd: "PWD",
  soloParent: "Solo Parent",
  indigent: "Indigent",
}

/** Compact classification tags shown in tables and profile headers. */
export function ResidentBadges({ classification, full }: { classification: ResidentClassification; full?: boolean }) {
  const keys = (Object.keys(classification) as (keyof ResidentClassification)[]).filter((k) => classification[k] && (full || SHORT[k]))
  if (keys.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <TagBadge key={k}>{full ? CLASSIFICATION_LABELS[k] : SHORT[k]}</TagBadge>
      ))}
    </span>
  )
}
