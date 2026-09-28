@AGENTS.md

# BaryoSuite conventions

- Next.js 16 + TanStack Table v9 + Zod 4: check `node_modules/*/dist/docs` or package `skills/` before assuming older APIs.
- Pages in `app/` are thin; UI lives in `features/<module>/`. Reuse `components/shared`, `components/tables/data-table.tsx` and `components/forms` — do not add per-module tables, dialogs or fields.
- Read data via `hooks/use-data.ts`; mutate only via `lib/store/*-actions.ts` (the future API seam; actions also write audit logs). Shared plumbing lives in `lib/store/helpers.ts`.
- Never store derived finance totals: obligated/disbursed/available/utilization come from `lib/finance.ts` (`useLedger()`); inventory on-hand is summed from transactions.
- Approval flows are declared in `lib/workflows.ts` and rendered with `ApprovalTimeline` + `WorkflowActions` — don't build per-module workflow UI.
- Open create/edit forms with `useEntityDialogs().open(...)`; register new forms in `components/providers/entity-dialogs-provider.tsx`. Long forms are full pages using `FormActionBar`.
- Reports are definitions in `features/reports/definitions/` rendered by `<ReportPage>`; never build a per-report page. Run them through `runReport` (lib/reports/engine), put calculations in `lib/reports/metrics.ts`, and export only via `exportReport` (lib/reports/export).
- Currency only via `formatPeso`/`formatPesoCompact`/`<Money>`. Status colours come only from `lib/status.ts`; role access and capabilities from `lib/permissions.ts`.
- Mock data in `data/mock/` must stay deterministic (seeded RNG) to avoid hydration drift.
- Before finishing: `npm run typecheck && npm run lint && npm run build`. Don't reformat `components/ui/` (shadcn-generated).
