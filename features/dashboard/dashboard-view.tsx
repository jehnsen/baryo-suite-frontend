"use client"

import Link from "next/link"
import { useMemo } from "react"
import { format } from "date-fns"
import {
  Accessibility,
  ArrowRight,
  CalendarDays,
  CalendarClock,
  FileBadge,
  FileCheck,
  FileClock,
  Gavel,
  Home,
  Leaf,
  UserPlus,
  UserRound,
  Users,
  Vote,
} from "lucide-react"
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
  const { user, canAccess, can } = useCurrentUser()
  const logs = useAuditLogs()
  const { users } = useLookups()
  const activity = useMemo(
    () =>
      logs
        .filter((l) => l.action !== "Logged In")
        .slice(0, 6)
        .map((l) => auditToActivity(l, users)),
    [logs, users],
  )
  const k = stats.kpis

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A clear view of your community. A better way to serve."
        actions={
          <div className="flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            {load.isLoading ? "Barangay overview" : format(new Date(), "EEEE, MMM d, yyyy")}
          </div>
        }
      />

      <section className="welcome-panel relative isolate overflow-hidden rounded-2xl border border-primary/10 p-6 sm:p-7" aria-label="Welcome">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-12 -z-10 size-80 rounded-full border-[40px] border-primary/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-4 -bottom-32 -z-10 size-72 rounded-full border-[40px] border-primary/5" />
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              <Leaf className="size-3.5" aria-hidden="true" /> Your community, connected
            </p>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {load.isLoading ? "Welcome back" : greeting()}, {user.name.split(" ")[0]}.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Here’s what’s happening in Barangay {settings.barangayName}. Every update brings better service to your community.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canAccess("residents") && can("write") && (
              <Button asChild className="shadow-sm">
                <Link href="/residents/new">
                  <UserPlus /> Add resident
                </Link>
              </Button>
            )}
            {canAccess("requests") && (
              <Button asChild variant="outline" className="border-primary/15 bg-card/75">
                <Link href="/requests">
                  View requests <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {load.isError ? (
        <ErrorState onRetry={load.retry} className="py-24" />
      ) : load.isLoading ? (
        <>
          <StatCardsSkeleton count={4} />
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartSkeleton className="lg:col-span-2" />
            <ChartSkeleton />
          </div>
        </>
      ) : (
        <>
          <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total residents"
              value={k.residents}
              icon={Users}
              emphasis="primary"
              hint={`+${k.newThisMonth} registered this month`}
              href={canAccess("residents") ? "/residents" : undefined}
            />
            <StatCard
              label="Total households"
              value={k.households}
              icon={Home}
              hint={`${(k.residents / Math.max(1, k.households)).toFixed(1)} members per household`}
              href={canAccess("households") ? "/households" : undefined}
            />
            <StatCard
              label="Pending requests"
              value={k.pendingRequests}
              icon={FileClock}
              emphasis="secondary"
              hint={`${k.newRequestsToday} new requests today`}
              href={canAccess("requests") ? "/requests" : undefined}
            />
            <StatCard
              label="Certificates issued"
              value={k.issuedThisMonth}
              icon={FileCheck}
              trend={{ value: k.issuedTrend, label: "vs. last month" }}
              href={canAccess("certificates") ? "/certificates" : undefined}
            />
          </section>

          <section className="grid items-start gap-5 xl:grid-cols-3" aria-label="Service overview">
            <SectionCard
              className="min-w-0 xl:col-span-2"
              title="Certificate activity"
              description="Certificates prepared each month · last 9 months"
              actions={
                <span className="hidden items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-accent-foreground sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-chart-1" />
                  Certificates
                </span>
              }
            >
              <TrendChart data={stats.monthlyCertificates} seriesName="Certificates" height={240} />
            </SectionCard>
            <SectionCard
              className="min-w-0 xl:col-start-3 xl:row-span-2 xl:row-start-1"
              title="Needs your attention"
              description="Your service queue and upcoming hearings"
              actions={
                <span className="flex size-8 items-center justify-center rounded-lg bg-secondary/35">
                  <CalendarClock className="size-4 text-foreground" />
                </span>
              }
            >
              <PendingTasks tasks={stats.tasks} />
            </SectionCard>
            <SectionCard
              className="min-w-0 xl:col-span-2"
              title="Recent activity"
              description="The latest updates across your barangay"
              actions={
                canAccess("audit-logs") && (
                  <Button variant="link" size="sm" className="h-auto gap-1 p-0 text-xs" asChild>
                    <Link href="/admin/audit-logs">
                      View all <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                )
              }
            >
              <ActivityFeed items={activity} />
            </SectionCard>
          </section>

          <div className="flex items-center gap-4 pt-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your community in numbers</h2>
              <p className="mt-1 text-xs text-muted-foreground">Population, representation, and peace & order</p>
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <section aria-label="Community figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Senior citizens"
              value={k.seniors}
              icon={UserRound}
              hint={`${((k.seniors / Math.max(1, k.residents)) * 100).toFixed(1)}% of population`}
            />
            <StatCard label="PWD residents" value={k.pwd} icon={Accessibility} hint="With PWD classification" />
            <StatCard
              label="Registered voters"
              value={k.voters}
              icon={Vote}
              hint={`${((k.voters / Math.max(1, k.residents)) * 100).toFixed(0)}% of residents`}
            />
            <StatCard
              label="Open blotter cases"
              value={k.openBlotters}
              icon={Gavel}
              hint="Reported, investigating or in mediation"
              href={canAccess("blotter") ? "/blotter" : undefined}
            />
          </section>
          <section className="grid gap-5 lg:grid-cols-3" aria-label="Population demographics">
            <SectionCard title="Population by gender" description="Active residents">
              <ProportionBar
                segments={[
                  { label: "Male", value: stats.gender.male, color: "var(--chart-1)" },
                  { label: "Female", value: stats.gender.female, color: "var(--chart-2)" },
                ]}
              />
            </SectionCard>
            <SectionCard title="Population by age group" description="Active residents, in years" className="lg:col-span-2">
              <SimpleBarChart data={stats.ageGroups} seriesName="Residents" showValues height={220} />
            </SectionCard>
          </section>
          <section className="grid gap-5 lg:grid-cols-2" aria-label="Community breakdown">
            <SectionCard title="Residents by purok" description="Population distribution across your barangay">
              <SimpleBarChart data={stats.byPurok} seriesName="Residents" horizontal showValues height={250} categoryWidth={56} />
            </SectionCard>
            <SectionCard title="Blotter cases by status" description="A snapshot of peace & order">
              <SimpleBarChart data={stats.blotterByStatus} seriesName="Cases" horizontal showValues height={250} categoryWidth={124} />
            </SectionCard>
          </section>
          <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
            <FileBadge className="size-3.5 shrink-0" /> Figures are computed live from the barangay registry.
          </p>
        </>
      )}
    </div>
  )
}
