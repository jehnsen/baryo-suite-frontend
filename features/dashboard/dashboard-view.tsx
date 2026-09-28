"use client"

import Link from "next/link"
import { useMemo } from "react"
import { format } from "date-fns"
import { Accessibility, CalendarClock, FileBadge, FileCheck, FileClock, Gavel, Home, UserRound, Users, Vote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SimpleBarChart } from "@/components/charts/bar-chart"
import { ProportionBar } from "@/components/charts/proportion-bar"
import { TrendChart } from "@/components/charts/trend-chart"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { ErrorState } from "@/components/shared/error-state"
import { ChartSkeleton, StatCardsSkeleton } from "@/components/shared/loading-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { useAuditLogs, useCurrentUser, useLookups, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { auditToActivity } from "@/lib/activity"
import { PendingTasks } from "./pending-tasks"
import { useDashboardStats } from "./use-dashboard-stats"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Magandang umaga" : h < 18 ? "Magandang hapon" : "Magandang gabi"
}

export function DashboardView() {
  const load = usePageLoad()
  const stats = useDashboardStats()
  const settings = useSettings()
  const { user, canAccess } = useCurrentUser()
  const logs = useAuditLogs()
  const { users } = useLookups()
  const activity = useMemo(
    () =>
      logs
        .filter((l) => l.action !== "Logged In")
        .slice(0, 8)
        .map((l) => auditToActivity(l, users)),
    [logs, users],
  )
  const k = stats.kpis

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={`Barangay ${settings.barangayName}, ${settings.municipality} · ${format(new Date(), "EEEE, MMMM d, yyyy")}`}
        actions={
          canAccess("residents") && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/residents">View registry</Link>
            </Button>
          )
        }
      />

      {load.isError ? (
        <ErrorState onRetry={load.retry} className="py-24" />
      ) : load.isLoading ? (
        <>
          <StatCardsSkeleton count={8} />
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton />
            <ChartSkeleton className="lg:col-span-2" />
          </div>
        </>
      ) : (
        <>
          <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Residents"
              value={k.residents}
              icon={Users}
              hint={`+${k.newThisMonth} registered this month`}
              href={canAccess("residents") ? "/residents" : undefined}
            />
            <StatCard
              label="Total Households"
              value={k.households}
              icon={Home}
              hint={`${(k.residents / Math.max(1, k.households)).toFixed(1)} avg. members`}
              href={canAccess("households") ? "/households" : undefined}
            />
            <StatCard
              label="Senior Citizens"
              value={k.seniors}
              icon={UserRound}
              hint={`${((k.seniors / Math.max(1, k.residents)) * 100).toFixed(1)}% of population`}
            />
            <StatCard label="PWD Residents" value={k.pwd} icon={Accessibility} hint="With PWD classification" />
            <StatCard
              label="Registered Voters"
              value={k.voters}
              icon={Vote}
              hint={`${((k.voters / Math.max(1, k.residents)) * 100).toFixed(0)}% of residents`}
            />
            <StatCard
              label="Pending Requests"
              value={k.pendingRequests}
              icon={FileClock}
              hint={`${k.newRequestsToday} filed today`}
              href={canAccess("requests") ? "/requests" : undefined}
            />
            <StatCard
              label="Open Blotter Cases"
              value={k.openBlotters}
              icon={Gavel}
              hint="Reported, investigating or in mediation"
              href={canAccess("blotter") ? "/blotter" : undefined}
            />
            <StatCard
              label="Certificates Issued"
              value={k.issuedThisMonth}
              icon={FileCheck}
              trend={{ value: k.issuedTrend, label: "vs. last month" }}
              href={canAccess("certificates") ? "/certificates" : undefined}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Population by Gender" description="Active residents">
              <ProportionBar
                segments={[
                  { label: "Male", value: stats.gender.male, color: "var(--chart-1)" },
                  { label: "Female", value: stats.gender.female, color: "var(--chart-2)" },
                ]}
              />
            </SectionCard>
            <SectionCard title="Population by Age Group" description="Active residents, in years" className="lg:col-span-2">
              <SimpleBarChart data={stats.ageGroups} seriesName="Residents" showValues height={220} />
            </SectionCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Residents by Purok">
              <SimpleBarChart data={stats.byPurok} seriesName="Residents" horizontal showValues height={250} categoryWidth={56} />
            </SectionCard>
            <SectionCard title="Monthly Certificate Requests" description="Certificates prepared per month, last 9 months" className="lg:col-span-2">
              <TrendChart data={stats.monthlyCertificates} seriesName="Certificates" height={250} />
            </SectionCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Blotter Cases by Status">
              <SimpleBarChart data={stats.blotterByStatus} seriesName="Cases" horizontal showValues height={250} categoryWidth={124} />
            </SectionCard>
            <SectionCard title="Pending Tasks" actions={<CalendarClock className="size-4 text-muted-foreground" />}>
              <PendingTasks tasks={stats.tasks} />
            </SectionCard>
            <SectionCard
              title="Recent Activity"
              actions={
                canAccess("audit-logs") && (
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link href="/admin/audit-logs">View all</Link>
                  </Button>
                )
              }
            >
              <ActivityFeed items={activity} />
            </SectionCard>
          </section>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileBadge className="size-3.5" /> Figures are computed live from the barangay registry.
          </p>
        </>
      )}
    </div>
  )
}
