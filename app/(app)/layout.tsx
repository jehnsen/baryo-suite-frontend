import { AccessGuard } from "@/components/layout/access-guard"
import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { EntityDialogsProvider } from "@/components/providers/entity-dialogs-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <EntityDialogsProvider>
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
            <AccessGuard>{children}</AccessGuard>
          </main>
        </div>
      </div>
    </EntityDialogsProvider>
  )
}
