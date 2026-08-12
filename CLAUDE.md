# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PCXpress Mercado Livre Analytics — a Next.js (App Router) dashboard that reads pre-aggregated
seller/sales data from Supabase (Postgres) server-side and renders it in a single-page client
dashboard. The whole product is essentially two files: `lib/supabase-dashboard.ts` (data layer)
and `app/page.tsx` (the entire UI).

## Commands

```bash
pnpm install --frozen-lockfile   # install deps (pnpm 11.9.0, Node 22.13–24)
pnpm run dev                     # dev server, http://localhost:3000 (webpack, not turbopack)
pnpm run build                   # production build (webpack)
pnpm run start                   # run the production build
pnpm run lint                    # eslint . (flat config, eslint-config-next core-web-vitals + typescript)
pnpm run test                    # node --test tests/*.test.mjs
pnpm run check                   # lint && test && build — run this before considering work done
```

There's no test runner flag for a single file/case since there's only one test file
(`tests/project.test.mjs`); use `node --test tests/project.test.mjs` directly, optionally with
`--test-name-pattern="<substring>"` to run a single `test(...)` block.

Local env vars go in `.env.local` (not committed):

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE
SUPABASE_SCHEMA=ml_dashboards
SUPABASE_ACCOUNT_NAME=PC Express
```

Without these set, the API route falls back to `FALLBACK_DASHBOARD_DATA` (see below) instead of
failing — the app is always renderable.

## Architecture

**Data flow:** `app/page.tsx` (client component) fetches `GET /api/dashboard` →
`app/api/dashboard/route.ts` (Next Route Handler, `runtime = "nodejs"`, `dynamic = "force-dynamic"`)
parses/validates query params → `lib/supabase-dashboard.ts#getDashboardData()` queries Supabase's
PostgREST API directly over `fetch` (no `@supabase/supabase-js` client) using the service-role key
→ returns a single `DashboardData` object (shape defined in `app/dashboard-types.ts`) that the
client renders. The service-role key never reaches the browser — it's read only in
`lib/supabase-dashboard.ts`, which is server-only code.

**No ORM/SDK for Supabase.** `supabaseFetch()` hits `${SUPABASE_URL}/rest/v1/<path>` with
`apikey`/`authorization` headers and `accept-profile`/`content-profile: SUPABASE_SCHEMA` headers
(defaults to schema `ml_dashboards`) to select the exposed Postgres schema. `fetchAll()` paginates
with the PostgREST `range` header in pages of 1000. `optionalFetchAll()` swallows errors for views
that may not exist yet in a given environment (e.g. Seller-health views), returning `[]` instead of
failing the whole request — new views should probably follow this pattern until they're guaranteed
present in production.

**Views consumed from Supabase** (all under the `ml_dashboards` schema): `accounts`,
`dashboard_item_catalog`, `dashboard_daily_account_summary`, `dashboard_daily_item_performance`,
`sellers_current`, `seller_daily_snapshots`, `dashboard_daily_order_impact`. Row shapes (snake_case,
matching Postgres) are declared as private `*Record` types in `lib/supabase-dashboard.ts` and mapped
into camelCase domain types exported from `app/dashboard-types.ts`.

**Date-range/comparison model:** all metrics are computed for a "current" window and, optionally, a
"comparison" window, resolved by `resolveDateSelection()`. Comparison mode is one of
`previousPeriod` | `previousMonthEquivalent` | `previousMonthFull` | `custom` | `none`
(`ComparisonMode` type). The route handler validates raw date query params (`isIsoDate`,
`validateRange`, max 366-day range) before calling into the data layer, which computes the actual
start/end dates and issues a single combined Supabase query (`or: (and(...),and(...))`) covering
both windows, then splits results in-memory by date range (`inRange` filter) rather than issuing two
round trips.

**Fallback data:** `FALLBACK_DASHBOARD_DATA` in `app/dashboard-types.ts` is the canonical shape used
both when Supabase env vars are missing/invalid (`readConfig()` returns `null`) and as the client's
initial `useState` before the first fetch resolves. Any change to `DashboardData`'s shape should be
mirrored in this fallback object or the client will break on first paint.

**Metric formulas** (also enforced by tests, see below): conversion = `pedidos / visitas * 100`
(orders/visits, **not** units/visits); ticket médio = `valor bruto / pedidos`; unidades por pedido =
`unidades vendidas / pedidos`. Monetary values are always rendered in full (`Intl.NumberFormat`
currency `BRL`) — no abbreviated "mi"/"mil" formatting.

**`app/page.tsx`** is one large client component containing every dashboard view (Overview, Sales,
Products, Performance, Traffic, Seller — see `ViewId`/`navItems`), plus shared chart/table/formatting
helpers (`PeriodComparisonChart`, `ComparisonIndicator`, `KpiCard`, `TopProductsTable`,
`ProductComparisonTable`, `CancellationTrend`, etc.). The SVG line chart in
`PeriodComparisonChart`/`buildChartPath` is hand-rolled (no charting library). All UI copy is in
Brazilian Portuguese (pt-BR) — match that when adding UI strings.

**Deployment:** targets Vercel with zero custom config (no `vercel.json`) — Next.js's native App
Router detection turns `app/api/dashboard/route.ts` into a serverless function automatically. Root
directory must contain `package.json` directly (don't nest it).

## Known repo gap

`tests/project.test.mjs` and `README.md` reference `.env.example`, `supabase-seller-health-cancellations.sql`,
and a `docs/` folder that are **not present** in this repository (not in `git ls-files`). As a
result, `pnpm run test` currently fails at runtime (`ENOENT`) on the tests that `readFile` those
paths. Be aware of this when running `pnpm run check` — a failure there may be this pre-existing gap
rather than something introduced by your change. If you're asked to fix the test suite itself, either
recreate those files (matching what the tests assert about their contents) or adjust the tests.
