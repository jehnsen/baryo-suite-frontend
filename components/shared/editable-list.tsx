"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EditableListProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  addLabel?: string
  disabled?: boolean
  /** Items that cannot be removed (e.g. still referenced by records). */
  locked?: string[]
}

/** Chip list with inline add/remove — used for master data (sitios, incident types…). */
export function EditableList({ items, onChange, placeholder = "Add item", addLabel = "Add", disabled, locked = [] }: EditableListProps) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setError(`“${v}” already exists`)
      return
    }
    onChange([...items, v])
    setDraft("")
    setError(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-sm text-muted-foreground">None yet.</span>}
        {items.map((item) => (
          <span key={item} className="inline-flex h-7 items-center gap-1 rounded-md border bg-muted/40 pr-1 pl-2.5 text-sm">
            {item}
            {!disabled && !locked.includes(item) && (
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${item}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex max-w-sm gap-2">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
            }}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
          />
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus /> {addLabel}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
