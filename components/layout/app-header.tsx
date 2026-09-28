"use client"

import { GlobalSearch } from "./global-search"
import { MobileSidebar } from "./mobile-sidebar"
import { QuickCreate } from "./quick-create"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function AppHeader() {
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 items-center">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <QuickCreate />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
