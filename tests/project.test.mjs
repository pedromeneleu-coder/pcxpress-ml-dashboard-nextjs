import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses the native Next.js build and App Router API", async () => {
  const [packageJson, route] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/api/dashboard/route.ts", root), "utf8"),
  ]);

  assert.match(packageJson, /"build": "next build --webpack"/);
  assert.match(route, /export async function GET/);
  assert.match(route, /runtime = "nodejs"/);
});

test("keeps the Supabase service role key server-only", async () => {
  const [envExample, page] = await Promise.all([
    readFile(new URL(".env.example", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=/m);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(page, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("does not require legacy Vercel function routing", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  assert.doesNotMatch(packageJson, /vinext|vite|wrangler|@vercel\/node/);
});

test("compares each selected window with the immediately previous window", async () => {
  const [dataSource, page] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(dataSource, /const previousLastDate = shiftDate\(fromDate, -1\)/);
  assert.match(dataSource, /const previousFirstDate = startDateForPeriod\(previousLastDate, periodDays\)/);
  assert.match(dataSource, /and: combinedPeriodFilter/);
  assert.match(page, /vs\. período anterior/);
});

test("uses commercial formulas consistently and exposes both daily series", async () => {
  const [dataSource, types, page, readme] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);

  assert.match(dataSource, /totals\.ordersCount \/ totals\.visits/);
  assert.doesNotMatch(dataSource, /totals\.unitsSold \/ totals\.visits/);
  assert.match(dataSource, /current: buildDailyPerformance\(currentSummaryRecords\)/);
  assert.match(dataSource, /previous: buildDailyPerformance\(previousSummaryRecords\)/);
  assert.match(types, /export type DailyPerformancePoint/);
  assert.match(page, /Evolução diária: atual vs\. anterior/);
  assert.match(readme, /Conversão:\*\* `pedidos \/ visitas \* 100`/);
});

test("compares products across both windows and renders interactive chart details", async () => {
  const [dataSource, types, page] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(dataSource, /performance_date,item_id,title/);
  assert.match(dataSource, /and: combinedPeriodFilter/);
  assert.match(dataSource, /productComparisons: buildProductComparisons/);
  assert.match(types, /export type ProductComparison/);
  assert.match(page, /Comparação por produto/);
  assert.match(page, /Vs\. período anterior/);
  assert.match(page, /Vs\. dia anterior/);
});
