"use client"

import { GlobalSearch } from "./global-search"
import { MobileSidebar } from "./mobile-sidebar"
import { QuickCreate } from "./quick-create"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function AppHeader() {
  return (
    <header className="no-print sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur supports-backdrop-filter:bg-card/80 sm:px-6 lg:px-8">
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 items-center">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <QuickCreate />
        <ThemeToggle />
        <div className="ml-1 border-l pl-2 sm:ml-2 sm:pl-4">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
