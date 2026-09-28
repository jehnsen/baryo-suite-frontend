"use client"

import { useState } from "react"
import { Loader2, MessageSquareText } from "lucide-react"
import type { InternalNote, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import { EmptyState } from "./empty-state"
import { PersonAvatar } from "./person-avatar"

interface NotesPanelProps {
  notes: InternalNote[]
  users: Map<string, User>
  onAdd?: (body: string) => Promise<void> | void
  placeholder?: string
}

/** Staff-only notes thread with a composer. */
export function NotesPanel({ notes, users, onAdd, placeholder = "Add an internal note…" }: NotesPanelProps) {
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!onAdd || !body.trim()) return
    setPending(true)
    try {
      await onAdd(body.trim())
      setBody("")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      {notes.length === 0 ? (
        <EmptyState compact icon={MessageSquareText} title="No notes yet" description="Notes are visible to barangay staff only." />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const author = users.get(n.authorId)?.name ?? "Staff"
            return (
              <li key={n.id} className="flex gap-2.5">
                <PersonAvatar name={author} size="xs" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-xs">
                    <span className="font-medium">{author}</span> <span className="text-muted-foreground">· {formatDateTime(n.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-line">{n.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {onAdd && (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            rows={3}
            aria-label="New note"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to post</span>
            <Button size="sm" onClick={submit} disabled={!body.trim() || pending}>
              {pending && <Loader2 className="animate-spin" />}
              Add note
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
