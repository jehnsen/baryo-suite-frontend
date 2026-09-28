"use client"

import { useRef, useState } from "react"
import { FileText, ImageIcon, Paperclip, CloudUpload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
}

interface FileUploadProps {
  value: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  accept?: string
  multiple?: boolean
  maxSizeMb?: number
  hint?: string
  disabled?: boolean
  id?: string
}

/**
 * Drag-and-drop picker. Files stay client-side (metadata only) until an upload
 * endpoint exists; `onChange` receives the metadata list.
 */
export function FileUpload({ value, onChange, accept, multiple = true, maxSizeMb = 10, hint, disabled, id }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setError(null)
    const next: UploadedFile[] = []
    for (const f of Array.from(list)) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`${f.name} exceeds ${maxSizeMb} MB.`)
        continue
      }
      next.push({ id: `${f.name}-${f.size}-${f.lastModified}`, name: f.name, size: f.size, type: f.type })
    }
    onChange(multiple ? [...value, ...next.filter((n) => !value.some((v) => v.id === n.id))] : next.slice(0, 1))
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-primary bg-accent" : "bg-muted/30",
          disabled && "opacity-50",
        )}
      >
        <CloudUpload className="size-6 text-muted-foreground" />
        <div className="text-sm">
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Click to upload
          </Button>{" "}
          <span className="text-muted-foreground">or drag and drop</span>
        </div>
        <p className="text-xs text-muted-foreground">{hint ?? `PDF, JPG or PNG up to ${maxSizeMb} MB`}</p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.length > 0 && <FileList files={value} onRemove={(fid) => onChange(value.filter((f) => f.id !== fid))} />}
    </div>
  )
}

export function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove?: (id: string) => void }) {
  return (
    <ul className="divide-y rounded-lg border">
      {files.map((f) => {
        const Icon = f.type.startsWith("image/") ? ImageIcon : f.type === "application/pdf" ? FileText : Paperclip
        return (
          <li key={f.id} className="flex items-center gap-3 px-3 py-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{formatFileSize(f.size)}</span>
            {onRemove && (
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
                <X />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
