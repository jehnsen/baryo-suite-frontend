@AGENTS.md

# BaryoSuite conventions

- Next.js 16 + TanStack Table v9 + Zod 4: check `node_modules/*/dist/docs` or package `skills/` before assuming older APIs.
- Pages in `app/` are thin; UI lives in `features/<module>/`. Reuse `components/shared`, `components/tables/data-table.tsx` and `components/forms` — do not add per-module tables, dialogs or fields.
- Read data via `hooks/use-data.ts`; mutate only via `lib/store/actions.ts` (the future API seam; actions also write audit logs).
- Open create/edit forms with `useEntityDialogs().open(...)`; register new forms in `components/providers/entity-dialogs-provider.tsx`.
- Status colours come only from `lib/status.ts`; role access from `lib/permissions.ts`.
- Mock data in `data/mock/` must stay deterministic (seeded RNG) to avoid hydration drift.
- Before finishing: `npm run typecheck && npm run lint && npm run build`. Don't reformat `components/ui/` (shadcn-generated).
