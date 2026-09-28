"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecordNotFound } from "@/components/shared/load-state"
import { useCollections, useLookups, useSettings } from "@/hooks/use-data"
import { CollectionReceipt } from "./collection-receipt"

export function CollectionReceiptPrint({ id }: { id: string }) {
  const collection = useCollections().find((c) => c.id === id)
  const settings = useSettings()
  const { users } = useLookups()
  if (!collection) return <RecordNotFound entity="Collection" backHref="/finance/collections" backLabel="Back to collections" />
  return (
    <div className="min-h-dvh bg-muted/50 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/finance/collections?open=${collection.id}`}>
            <ArrowLeft /> Back
          </Link>
        </Button>
        <span className="font-mono text-sm">{collection.orNumber}</span>
        <Button size="sm" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <div className="p-4 sm:p-8 print:p-0">
        <CollectionReceipt collection={collection} settings={settings} collector={users.get(collection.collectorId)} />
      </div>
    </div>
  )
}
