# BaryoSuite

**One Platform. Smarter Barangay Service.**

Phase 1 frontend of BaryoSuite, a barangay management system for Philippine barangays. It covers residents, households, certificates, service requests, blotter, incidents, officials, announcements and administration. All data is mock data for Barangay San Roque, Baliwag City, Bulacan. There is no backend yet.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 (redirects to /dashboard)
```

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run build`     | Production build                 |
| `npm run lint`      | ESLint (includes React Compiler rules) |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run format`    | Prettier + Tailwind class sorting |

## Stack

- Next.js 16 (App Router, Turbopack), React 19 and TypeScript
- Tailwind CSS v4 and shadcn/ui (Radix base, Nova preset), Lucide icons
- TanStack Table **v9** (`useTable` + `tableFeatures`, not the v8 `useReactTable` API)
- React Hook Form, Zod 4 and `@hookform/resolvers`
- Recharts 3, date-fns 4, sonner (toasts), next-themes (dark mode)

## Trying it out

- **Core workflow:** open `/requests/req-0000` (Juan Dela Cruz, Barangay Clearance) and click **Approve**, then **Mark ready for release**, then **Release & complete**. Approving creates the certificate automatically, and each later step also updates the certificate's status. Releasing a paid certificate requires an O.R. number.
- **Blotter workflow:** on any case you can click **Schedule hearing** or **Update status**. A case moves Reported → Investigation → Mediation → Settlement → Closed, or it can be Referred. You can also escalate an incident to a blotter case from `/incidents`.
- **Role-based access:** open the user menu (top right) and choose **View as role**. Switching to Tanod or Treasurer changes the sidebar, the Quick Create options and which routes you can open.
- **Global search:** press `Ctrl/Cmd + K`.
- **UX states:** add `?state=loading`, `?state=empty` or `?state=error` to any list or detail URL. For example, `/residents?state=error` shows the error state, and **Try again** loads the page normally.
- Data changes last until you reload the page (the store is in memory).

## Project structure

```text
app/
  (app)/            Pages inside the app shell (sidebar + header), plus loading/error/not-found
  (print)/          Print pages without the app shell (certificate print view)
components/
  layout/           AppSidebar, AppHeader, MobileSidebar, ThemeToggle, GlobalSearch, QuickCreate, AccessGuard
  shared/           StatCard, StatusBadge, EmptyState, ErrorState, skeletons, ConfirmDialog, FormDialog,
                    FormDrawer, DetailDrawer, ContentTabs, Timeline, ActivityFeed, FileUpload, Pagination,
                    FilterBar, DateRangeFilter, SearchInput, NotesPanel, DetailList, …
  tables/           DataTable (the only table implementation), column header, row actions, feature set
  forms/            RHF-bound fields: text, textarea, select, multi-select, date, phone, money, address,
                    file, resident/household/official/user pickers; FormRoot, FormSection
  charts/           SimpleBarChart, TrendChart, ProportionBar, ChartTooltip
  providers/        ThemeProvider, EntityDialogsProvider (mounts every create/edit form in one place)
  ui/               shadcn/ui primitives (generated; formatting excluded from Prettier)
features/<module>/  Module-specific views, forms and columns (residents, certificates, blotter, …)
data/mock/          Seeded, deterministic mock datasets
types/              All domain models
lib/                constants, formatting, status tones, permissions, navigation, validation, store
hooks/              Data hooks, simulated page loading, hotkeys
```

Route files in `app/` stay thin. Each one renders a view from `features/`.

## Architecture notes

**Data layer.** Components read data only through `hooks/use-data.ts` and change it only through `lib/store/actions.ts`. These two files are where the backend will plug in: keep the function signatures and replace the bodies with API calls (for example TanStack Query plus server actions). Every action also writes an audit log entry. The actions also keep related records in sync: approving a request creates its certificate, and releasing the certificate completes the request.

**Loading, empty and error states.** `usePageLoad()` adds simulated network delay, so every page runs through the same states it will have against a real API. `DataTable` and `LoadState` render these states the same way on every page.

**Tables.** Every list uses `DataTable`. Each module passes in its columns, `search.getText`, faceted `filters` (with a `getValue` per row) and an optional `dateFilter`. Sorting, pagination, column visibility, row actions, export (placeholder) and the empty, loading and error states are built in.

**Forms.** Each form is a Zod schema plus fields from `@/components/forms` inside a `FormRoot`, placed in a `FormDialog` or `FormDrawer`. Shared validators such as `phMobile`, `isoDate` and `addressSchema` live in `lib/validation.ts`. To open a create or edit form, call `useEntityDialogs().open({ type, record?, defaults? })` rather than mounting the form yourself.

**Status colours.** `lib/status.ts` is the single map from status to tone. `StatusBadge` uses it, so a given status has the same colour in every module.

**Permissions.** `lib/permissions.ts` defines which modules each role can see, plus its capabilities (`write`, `approve`, `admin`). The sidebar, Quick Create, global search, row actions and `AccessGuard` all read from it. This is a mock implementation and can be replaced by claims from real authentication.

## Adding a module (e.g. Health, DRRM)

1. Add the model to `types/index.ts` and the key to `ModuleKey`.
2. Add mock data in `data/mock/`, a slice to `lib/store/app-store.ts`, and actions and a hook for it.
3. Add a nav entry in `lib/navigation.ts` and role access in `lib/permissions.ts`.
4. Build the view in `features/<module>/` using `DataTable`, the shared form fields and `PageHeader`.
5. Add `app/(app)/<module>/page.tsx` that renders the view.

## Out of scope for Phase 1

Backend APIs, database, authentication, payments, SMS, GIS, government integrations (DILG, PSA, PhilSys), AI features, and the Health, DRRM, Finance and Inventory modules. The structure above is designed so these can be added later.
