# BaryoSuite

**One Platform. Smarter Barangay Service.**

Frontend of BaryoSuite, a barangay operations platform for Philippine barangays. All data is mock data for Barangay San Roque, Baliwag City, Bulacan. There is no backend yet.

- **Phase 1 (resident services):** residents, households, certificates, service requests, blotter, incidents, officials, announcements, users, audit logs and settings.
- **Phase 2 (operations):** finance and treasury (budget, allocations, PPAs, fund sources, collections, obligations, disbursements, expenses, reports), governance (sessions, minutes, ordinances, resolutions, committees, assemblies) and operations (programs and projects, assets, inventory).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 (redirects to /dashboard)
```

| Script              | Purpose                                |
| ------------------- | -------------------------------------- |
| `npm run build`     | Production build                       |
| `npm run lint`      | ESLint (includes React Compiler rules) |
| `npm run typecheck` | `tsc --noEmit`                         |
| `npm run format`    | Prettier + Tailwind class sorting      |

## Stack

- Next.js 16 (App Router, Turbopack), React 19 and TypeScript
- Tailwind CSS v4 and shadcn/ui (Radix base, Nova preset), Lucide icons
- TanStack Table **v9** (`useTable` + `tableFeatures`, not the v8 `useReactTable` API)
- React Hook Form, Zod 4 and `@hookform/resolvers`
- Recharts 3, date-fns 4, sonner (toasts), next-themes (dark mode)

## Trying it out

**Phase 1**

- **Certificate workflow:** open `/requests/req-0000` (Juan Dela Cruz, Barangay Clearance), then click **Approve**, **Mark ready for release** and **Release & complete**. Approving creates the certificate. Releasing a paid certificate asks for an O.R. number and also records a treasury collection under that number.
- **Blotter workflow:** a case moves Reported → Investigation → Mediation → Settlement → Closed. You can schedule hearings from the case, and escalate an incident to a blotter case from `/incidents`.

**Phase 2**

- **Budget chain:** `/finance/allocations`, then the **PPA breakdown** tab, then **Drainage Improvement** (`/ppas/…`). From there, go to an obligation, then a disbursement, then its expense. The Infrastructure allocation reproduces the spec's example: ₱2,000,000 allocated, ₱1,350,000 obligated, ₱1,120,000 disbursed, 67.5% utilized.
- **Approvals:** `/finance/disbursements` lists vouchers that are **For Review** or **For Approval**. Approving and releasing one asks for a check number, creates the expense, and rolls the obligation to *Partially* or *Fully Disbursed*. Approval is blocked when supporting documents are missing or the amount exceeds the PPA's available balance.
- **Alerts:** the Finance Dashboard flags categories nearing their limit (thresholds are set in **Settings → Finance**), pending approvals, missing documents, overdue liquidation and unreconciled collections.
- **Governance chain:** open a session, then its **Legislation** and **Minutes**. For a live run-through: **Schedule session**, **Start session** (roll call and quorum), **Record motion**, **Adjourn**, then **Draft minutes**.
- **Roles:** use **View as role** in the user menu. The Treasurer sees Finance, Assets and Inventory. The Secretary sees Governance. A Kagawad sees only the committees, PPAs and projects assigned to them.
- **Other:** press `Ctrl/Cmd + K` for global search. Add `?state=loading|empty|error` to any URL to see those states. Data resets on reload (the store is in memory).

## Project structure

```text
app/
  (app)/              Pages inside the app shell; finance/, governance/, projects/, assets/, inventory/, ppas/
  (print)/            Print pages without the shell (certificate, official receipt)
components/
  layout/             Sidebar, header, global search, quick create, access guard
  shared/             StatCard, StatusBadge, dialogs/drawers, Timeline, FileUpload, FilterBar, …
                      Phase 2: Money, UtilizationBar/ProgressMetric/DualProgress, ApprovalTimeline,
                      WorkflowActions, AttachmentsPanel, FiscalYearSelector, ProgressUpdateDialog, FormActionBar
  tables/             DataTable (the only table implementation), BreakdownTable, row actions
  forms/              RHF-bound fields + pickers (resident, household, official, user, PPA, fund source,
                      committee, obligation, session, multi-official)
  charts/             SimpleBarChart, GroupedBarChart, TrendChart, ProportionBar
  providers/          ThemeProvider, EntityDialogsProvider (every create/edit dialog is mounted here)
features/<module>/    Module views and forms (finance/, governance/, operations/ for Phase 2)
data/mock/            Seeded, deterministic, relational mock data (budgets.ts, ppas.ts, obligations.ts, …)
types/                index.ts + finance.ts, governance.ts, operations.ts (re-exported from index)
lib/                  constants, format, status, permissions, navigation, validation, finance, workflows, store/
hooks/                use-data (collections), use-finance (ledger, fiscal year, assignment scope), use-page-load
```

## Architecture notes

**Data layer.** Components read data through `hooks/use-data.ts` and change it only through the action modules in `lib/store/` (`actions.ts` for Phase 1; `finance-actions.ts`, `governance-actions.ts` and `operations-actions.ts` for Phase 2). All of them share `helpers.ts`, which handles ids, numbering and the audit log. These modules are where the backend will plug in: keep the signatures and replace the bodies with API calls. Every significant action writes an audit entry.

**Finance is derived, never duplicated.** Allocations and PPAs store only approved (and revised) amounts. Obligated, disbursed, available and utilization are calculated from obligation and disbursement records by `lib/finance.ts` (`useLedger()`):

- Available = Approved − Obligated
- Utilization = Obligated ÷ Approved
- Disbursement utilization = Disbursed ÷ Approved

Projects read their budget and financial progress from their PPA. Disbursements read their PPA through the obligation. Inventory quantity on hand is summed from stock transactions.

**Workflows.** `lib/workflows.ts` declares the steps, transitions, required capability, remarks and extra fields (such as a check number) for budgets, obligations, disbursements, projects, ordinances and resolutions. `ApprovalTimeline` and `WorkflowActions` render any of these definitions, so no module has its own approval UI.

**Relationships in the mock data.**

- Budget → allocation → PPA → obligation → disbursement → expense.
- Session → agenda and motions → ordinance or resolution (each stores its `sessionId`) → minutes.
- Project ↔ PPA.
- Asset → the disbursement that paid for it.
- Certificate → collection.
- The FY 2026 budget → its appropriation ordinance.

**Permissions.** `lib/permissions.ts` maps each role to its modules and capabilities (`write`, `approve`, `admin`, `finance`, `financeApprove`, `governance`, `operations`). Kagawads are scoped to their assignments via `useAssignmentScope()`. `/ppas/*` is reachable from either the allocations module or the projects module.

**Forms.** Each form is a Zod schema plus fields from `@/components/forms` inside a `FormRoot`, placed in a `FormDialog` or `FormDrawer`. Open one with `useEntityDialogs().open(...)`. Long forms (residents, incidents, sessions, minutes) are full pages with the shared `FormActionBar`.

**Currency.** Use `formatPeso`/`formatPesoCompact` or the `<Money>` component. Never format pesos inline.

## Adding a module

1. Add the model under `types/` and the key to `ModuleKey`.
2. Add mock data in `data/mock/`, a slice in `lib/store/app-store.ts`, actions in `lib/store/<domain>-actions.ts` and a hook in `hooks/use-data.ts`.
3. Add a nav entry in `lib/navigation.ts` and role access in `lib/permissions.ts`.
4. Build the view in `features/<module>/` with `DataTable`, the shared fields and `PageHeader`. If it has an approval flow, add a definition to `lib/workflows.ts`.
5. Add `app/(app)/<route>/page.tsx` that renders the view.

## Not yet in scope

General ledger, double-entry accounting, payroll, procurement bidding and purchase orders, supplier portal, health records, social assistance, DRRM and relief distribution, resident portal, online payments (GCash and Maya are labels only), SMS, GIS, AI and government API integrations.
