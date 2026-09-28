"use client"

import { useState } from "react"
import { Paperclip, Plus } from "lucide-react"
import { toast } from "sonner"
import type { Attachment } from "@/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "./empty-state"
import { FileList, FileUpload, type UploadedFile } from "./file-upload"

interface AttachmentsPanelProps {
  attachments: Attachment[]
  /** Omit to render read-only. */
  onAdd?: (files: UploadedFile[]) => void
  emptyLabel?: string
  /** Shown as a warning when there are no attachments (e.g. supporting documents required). */
  required?: boolean
}

/** Supporting-document list with an "Add files" dialog. Used by every Phase 2 record. */
export function AttachmentsPanel({ attachments, onAdd, emptyLabel = "No attachments", required }: AttachmentsPanelProps) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  return (
    <div className="space-y-3">
      {attachments.length ? (
        <FileList files={attachments} />
      ) : (
        <EmptyState
          compact
          icon={Paperclip}
          title={emptyLabel}
          description={required ? "Supporting documents are required before this record can be approved." : undefined}
        />
      )}
      {onAdd && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus /> Add files
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setFiles([])
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add attachments</DialogTitle>
            <DialogDescription>Files are kept as metadata until the document service is connected.</DialogDescription>
          </DialogHeader>
          <FileUpload value={files} onChange={setFiles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={files.length === 0}
              onClick={() => {
                onAdd?.(files)
                toast.success(`${files.length} file${files.length === 1 ? "" : "s"} attached`)
                setFiles([])
                setOpen(false)
              }}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
