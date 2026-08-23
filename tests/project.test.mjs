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

test("supports automatic and custom date comparisons", async () => {
  const [dataSource, page] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(dataSource, /comparisonMode === "previousPeriod"/);
  assert.match(dataSource, /comparisonMode === "previousMonthEquivalent"/);
  assert.match(dataSource, /comparisonMode === "previousMonthFull"/);
  assert.match(dataSource, /comparisonMode === "custom"/);
  assert.match(dataSource, /or: `\(and\(performance_date\.gte\./);
  assert.match(page, /Outro período, escolhido manualmente/);
  assert.match(page, /Sem comparação/);
  assert.match(page, /em relação ao período anterior/);
});

test("validates date ranges before querying Supabase", async () => {
  const route = await readFile(new URL("app/api/dashboard/route.ts", root), "utf8");

  assert.match(route, /const MAX_RANGE_DAYS = 366/);
  assert.match(route, /validateRange\("Período principal"/);
  assert.match(route, /validateRange\("Período de comparação"/);
  assert.match(route, /comparisonMode === "custom"/);
  assert.match(route, /status: 400/);
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
  assert.match(page, /Evolução diária: período atual e anterior/);
  assert.match(readme, /Conversão:\*\* `pedidos \/ visitas \* 100`/);
});

test("compares listings across both windows and renders interactive chart details", async () => {
  const [dataSource, types, page] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(dataSource, /performance_date,item_id,title/);
  assert.match(dataSource, /\.\.\.periodFilter/);
  assert.match(dataSource, /productComparisons: buildProductComparisons/);
  assert.match(types, /export type ProductComparison/);
  assert.match(page, /Comparação por anúncio/);
  assert.match(page, /Em relação ao período anterior/);
  assert.match(page, /Em relação ao dia anterior/);
});

test("prioritizes the current commercial engine without inventing future metrics", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  const overviewStart = page.indexOf("function OverviewView");
  const salesStart = page.indexOf("function SalesView");
  const overview = page.slice(overviewStart, salesStart);

  assert.ok(overviewStart >= 0 && salesStart > overviewStart);
  assert.ok(overview.indexOf('label="Valor bruto"') < overview.indexOf('label="Pedidos"'));
  assert.match(overview, /Resumo comercial/);
  assert.match(overview, /Visitas aos anúncios/);
  assert.match(overview, /Pedidos por visita/);
  assert.doesNotMatch(overview, /ACOS|ROAS|Buy-box|Faturamento líquido|Devoluções/);
  assert.doesNotMatch(page, /Qualidade da base|QualityView|case "quality"/);
});

test("renders monetary values without abbreviated thousands or millions", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /style: "currency"/);
  assert.match(page, /currency: "BRL"/);
  assert.doesNotMatch(page, /formatShortCurrency/);
  assert.doesNotMatch(page, /\} mi`|\} mil`/);
  assert.match(page, /metric === "grossAmount" \? formatCurrency\(value\)/);
});

test("renders the account history and calculates cancellations from order-level data", async () => {
  const [dataSource, types, page, cancellationView] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("../supabase-seller-health-cancellations.sql", root), "utf8"),
  ]);

  assert.match(dataSource, /dashboard_daily_order_impact/);
  assert.match(dataSource, /seller_daily_snapshots/);
  assert.match(types, /export type SellerSnapshot/);
  assert.match(types, /export type CancellationSummary/);
  assert.match(page, /Cancelamentos por dia/);
  assert.match(page, /Histórico da conta/);
  assert.match(cancellationView, /create or replace view ml_dashboards\.dashboard_daily_order_impact/);
  assert.match(cancellationView, /count\(\*\) filter \(where o\.status in \('cancelled', 'canceled'\)\)/);
});

test("prioritizes PCXpress actions before the monitored chain and keeps diagnostics collapsed", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  const logisticsStart = page.indexOf("function LogisticsView");
  const logisticsEnd = page.indexOf("function CancellationTrend", logisticsStart);
  const logisticsView = page.slice(logisticsStart, logisticsEnd);
  const prioritiesIndex = logisticsView.indexOf('<span className="eyebrow">Prioridades de hoje</span>');
  const actionIndex = logisticsView.indexOf('<h2 id="logistics-action-title">Ação PCXpress</h2>');
  const chainIndex = logisticsView.indexOf('<h2 id="logistics-chain-title">Cadeia monitorada</h2>');
  const diagnosticsIndex = logisticsView.indexOf('<details className="panel logistics-diagnostics">');
  const diagnosticsEnd = logisticsView.indexOf("</details>", diagnosticsIndex);
  const diagnostics = logisticsView.slice(diagnosticsIndex, diagnosticsEnd);

  assert.ok(logisticsStart >= 0 && logisticsEnd > logisticsStart);
  assert.ok(prioritiesIndex >= 0 && prioritiesIndex < chainIndex);
  assert.ok(actionIndex >= 0 && actionIndex < chainIndex);
  assert.match(logisticsView, /Posição operacional completa dos envios abertos/);
  assert.doesNotMatch(logisticsView, /Tempo médio até a entrega/);
  assert.match(logisticsView, />Inventários no Full</);
  assert.doesNotMatch(logisticsView, />\s*SKUs\s*</);

  assert.ok(diagnosticsIndex >= 0 && diagnosticsEnd > diagnosticsIndex);
  assert.match(diagnostics, /Ver bases, reconciliação e diagnóstico técnico/);
  assert.match(diagnostics, /Reconciliação da base de despacho/);
  assert.match(diagnostics, /Tempos entre eventos/);
  assert.match(diagnostics, /Metas internas/);
  assert.match(diagnostics, /Base de prazos por modalidade/);
  assert.match(diagnostics, /<table className="logistics-sla-table">/);
  assert.match(diagnostics, /<ol className="logistics-stage-flow">/);
  assert.match(diagnostics, /logisticsStageLabel\(stage\.stageCode, stage\.stageName\)/);
  assert.match(diagnostics, /não formam um funil sequencial/);

  assert.match(styles, /\.logistics-diagnostics\s*\{/);
  assert.match(styles, /\.logistics-stage-flow \{[^}]*grid-template-columns: repeat\(3,/s);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.logistics-stage-flow \{ grid-template-columns: 1fr; \}/);
});

test("separates logistics modalities, punctuality, backlog and reconciliation", async () => {
  const [route, dataSource, types, page, migration, check] = await Promise.all([
    readFile(new URL("app/api/dashboard/route.ts", root), "utf8"),
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("../supabase-logistics-shipment-reconciliation-v5.sql", root), "utf8"),
    readFile(new URL("../supabase-check-logistics-shipment-reconciliation-v5.sql", root), "utf8"),
  ]);

  assert.match(route, /"all",\s*"fulfillment",\s*"cross_docking",\s*"flex"/s);
  assert.match(route, /Modalidade inválida/);
  assert.match(dataSource, /BACKLOG_MEASUREMENT_QUALITIES = \["pending", "not_applicable"\]/);
  assert.match(dataSource, /optionalFetchAllWithAvailability<LogisticsReconciliationRecord>/);
  assert.match(dataSource, /dashboard_daily_logistics_reconciliation_waterfall/);
  assert.match(dataSource, /direction: "eq\.outbound"/);
  assert.match(dataSource, /sla_event: "eq\.dispatch"/);
  assert.match(types, /operationalBacklog:/);
  assert.match(types, /reconciliation: LogisticsReconciliation/);
  assert.match(page, /params\.set\("logisticsType", logisticsType\)/);
  assert.match(page, /Reconciliação da base de despacho/);
  assert.match(page, /Ação PCXpress/);
  assert.match(page, /sem limitar pela data em que o pedido foi vendido/);
  assert.match(migration, /create or replace view ml_dashboards\.dashboard_logistics_shipment_reconciliation/);
  assert.match(migration, /create or replace view ml_dashboards\.dashboard_daily_logistics_reconciliation_waterfall/);
  assert.match(check, /duplicate_rows/);
  assert.match(check, /source_shipments[\s\S]*as difference/);
  assert.match(check, /flags são mutuamente exclusivas/);
});

test("exposes logistics availability and data health for every optional source", async () => {
  const [dataSource, types, page] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/dashboard-types.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  const availabilityAwareDomainFetches = dataSource.match(
    /optionalFetchAllWithAvailability<(?:LogisticsSlaRecord|LogisticsReconciliationRecord|LogisticsEconomicsRecord|FulfillmentInventoryRecord|LogisticsSlaPolicyRecord|LogisticsStageRecord)>/g,
  ) ?? [];
  assert.equal(availabilityAwareDomainFetches.length, 7);
  assert.match(dataSource, /optionalFetchAllWithAvailability<LogisticsSyncRunRecord>/);
  assert.match(dataSource, /appendQuery\("sync_runs", \{/);
  assert.match(dataSource, /workflow_name: `in\.\(\$\{Object\.values\(LOGISTICS_WORKFLOW_NAMES\)\.join\(","\)\}\)`/);

  const availabilityHelperStart = dataSource.indexOf("async function optionalFetchAllWithAvailability");
  const availabilityHelperEnd = dataSource.indexOf("function appendQuery", availabilityHelperStart);
  const availabilityHelper = dataSource.slice(availabilityHelperStart, availabilityHelperEnd);
  assert.match(availabilityHelper, /return \{ available: true, rows: await fetchAll<T>\(config, path\) \}/);
  assert.match(availabilityHelper, /return \{ available: false, rows: \[\] \}/);

  assert.match(types, /export type LogisticsMetadata = \{[\s\S]*availability: \{[\s\S]*dataHealth: LogisticsDataHealth;/);
  assert.match(dataSource, /availability: \{[\s\S]*sla: logisticsSlaResult\.available[\s\S]*reconciliation: logisticsReconciliationResult\.available/);
  assert.match(dataSource, /dataHealth: buildLogisticsDataHealth\(checkedAt, dataHealthSources\)/);
  assert.match(page, /Saúde dos dados/);
  assert.match(page, /Situação das fontes logísticas/);
});

test("keeps the operational backlog independent of sale date and Full outside seller dispatch", async () => {
  const [dataSource, page, migration, check] = await Promise.all([
    readFile(new URL("lib/supabase-dashboard.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("../supabase-logistics-shipment-reconciliation-v5.sql", root), "utf8"),
    readFile(new URL("../supabase-check-logistics-shipment-reconciliation-v5.sql", root), "utf8"),
  ]);

  const slaFetches = [...dataSource.matchAll(/optionalFetchAllWithAvailability<LogisticsSlaRecord>/g)];
  assert.equal(slaFetches.length, 2);
  const operationalStart = slaFetches[1].index;
  const operationalEnd = dataSource.indexOf(
    "optionalFetchAllWithAvailability<LogisticsEconomicsRecord>",
    operationalStart,
  );
  const operationalBacklogQuery = dataSource.slice(operationalStart, operationalEnd);

  assert.match(operationalBacklogQuery, /measurement_quality: "in\.\(pending,not_applicable\)"/);
  assert.doesNotMatch(operationalBacklogQuery, /\.\.\.logisticsPeriodFilter|\.\.\.reconciliationPeriodFilter/);
  assert.match(page, /const dispatchApplies = logisticsType !== "fulfillment"/);
  assert.match(page, /Na modalidade Full, despacho do seller não se aplica à PCXpress/);
  assert.match(migration, /when b\.modality_code = 'full'[\s\S]*then 'excluded_not_applicable_full'/);
  assert.match(check, /where modality_code = 'full'/);
});
