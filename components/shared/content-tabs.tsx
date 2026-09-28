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

/** Contained tabs with optional counts; scrolls horizontally on small screens. */
export function ContentTabs({ tabs, defaultValue, value, onValueChange, className }: ContentTabsProps) {
  const visible = tabs.filter((t) => !t.hidden)
  return (
    <Tabs defaultValue={defaultValue ?? visible[0]?.value} value={value} onValueChange={onValueChange} className={cn("min-w-0 gap-5", className)}>
      <div className="max-w-full overflow-x-auto rounded-xl border border-border/80 bg-card p-1.5 shadow-xs">
        <TabsList className="gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-10">
          {visible.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="group/tab flex-none rounded-lg px-4 data-active:bg-accent data-active:text-accent-foreground dark:data-active:bg-accent dark:data-active:text-accent-foreground"
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums group-data-active/tab:bg-primary/10 group-data-active/tab:text-primary">
                  {t.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {visible.map((t) => (
        <TabsContent key={t.value} value={t.value} className="min-w-0">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
