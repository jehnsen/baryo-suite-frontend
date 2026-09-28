import type { Attachment, AuditAction, AuditModule } from "@/types"
import { format } from "date-fns"
import { toISODate } from "@/lib/format"
import { appStore, type AppState } from "./app-store"

/** Shared plumbing for every domain action module (ids, numbering, audit log). */

let seq = 0
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`
/** ISO timestamp with the local offset (e.g. 2026-09-28T17:20:05+08:00), matching the mock data so string sorts stay chronological. */
export const now = () => format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")
export const today = () => toISODate(new Date())
export const year = () => new Date().getFullYear()

export function nextNumber(existing: string[], prefix: string, width = 4): string {
  const re = new RegExp(`^${prefix}-${year()}-(\\d+)$`)
  const max = existing.reduce((m, n) => {
    const match = n.match(re)
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return `${prefix}-${year()}-${String(max + 1).padStart(width, "0")}`
}

export const set = appStore.setState
export const get = appStore.getState
export const currentUserId = () => get().session.currentUserId

export function log(action: AuditAction, module: AuditModule, recordLabel: string, details: string, recordId?: string) {
  const entry = {
    id: newId("log"),
    timestamp: now(),
    userId: currentUserId(),
    action,
    module,
    recordId,
    recordLabel,
    details,
    ipAddress: "192.168.1.24",
  }
  set((s) => ({ ...s, auditLogs: [entry, ...s.auditLogs] }))
}

export function patchIn<K extends keyof AppState, T extends { id: string }>(key: K, id: string, patch: (item: T) => T) {
  set((s) => ({ ...s, [key]: (s[key] as unknown as T[]).map((item) => (item.id === id ? patch(item) : item)) }))
}

/** Append a workflow status change (the shape every approval history uses). */
export const statusEntry = <S extends string>(status: S, note?: string) => ({ status, at: now(), byUserId: currentUserId(), note })

/** Simulated network latency for mock mutations. */
export const simulateLatency = (ms = 550) => new Promise((resolve) => setTimeout(resolve, ms))

/** Append uploaded file metadata to any record that has an `attachments` array. */
export function appendAttachments<K extends keyof AppState>(key: K, id: string, files: { id: string; name: string; size: number; type: string }[]) {
  patchIn<K, { id: string; attachments: Attachment[] }>(key, id, (r) => ({
    ...r,
    attachments: [...r.attachments, ...files.map((f) => ({ ...f, id: newId("att"), uploadedAt: now() }))],
  }))
}
