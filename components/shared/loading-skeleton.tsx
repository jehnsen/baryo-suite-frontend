import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function TableSkeleton({ rows = 8, columns = 6, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading table">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-3.5 flex-1", c === 0 && "max-w-24")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-3 py-4">
          <CardContent className="space-y-3 px-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-52 w-full" />
      </CardContent>
    </Card>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading details">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>
      <Skeleton className="h-8 w-96 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <TableSkeleton />
    </div>
  )
}
