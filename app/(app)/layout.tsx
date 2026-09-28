import { AccessGuard } from "@/components/layout/access-guard"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { EntityDialogsProvider } from "@/components/providers/entity-dialogs-provider"
import { SessionGate } from "@/components/providers/session-gate"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <EntityDialogsProvider>
        <div className="flex min-h-dvh">
          <a
            href="#main-content"
            className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground focus:not-sr-only"
          >
            Skip to content
          </a>
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main id="main-content" tabIndex={-1} className="app-content mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
              <AccessGuard>{children}</AccessGuard>
            </main>
          </div>
        </div>
      </EntityDialogsProvider>
    </SessionGate>
  )
}
