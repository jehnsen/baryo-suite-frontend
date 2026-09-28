"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface TabDef {
  value: string
  label: string
  count?: number
  content: React.ReactNode
  hidden?: boolean
}

interface ContentTabsProps {
  tabs: TabDef[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

/** Underline tabs with optional counts; scrolls horizontally on small screens. */
export function ContentTabs({ tabs, defaultValue, value, onValueChange, className }: ContentTabsProps) {
  const visible = tabs.filter((t) => !t.hidden)
  return (
    <Tabs defaultValue={defaultValue ?? visible[0]?.value} value={value} onValueChange={onValueChange} className={cn("gap-4", className)}>
      <div className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        <TabsList variant="line" className="h-9 gap-2 p-0">
          {visible.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none px-2.5 group-data-horizontal/tabs:after:bottom-[-1px]">
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">{t.count}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {visible.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
