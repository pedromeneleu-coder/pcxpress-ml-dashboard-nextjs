import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
// returns-metrics.ts só importa tipos; o Node executa TypeScript removendo os tipos.
const canRunTypeScript = Boolean(process.features?.typescript);
const metrics = canRunTypeScript ? await import("../app/returns/returns-metrics.ts") : null;
const skipTs = canRunTypeScript ? false : "Node sem suporte a TypeScript (use Node 22.18+)";

const MAPPING = {
  opened: "aberta",
  shipped: "enviada_pelo_comprador",
  delivered: "recebida",
  reviewed: "revisada",
  refunded: "reembolsada",
  cancelled: "encerrada_sem_devolucao",
};

function record(overrides = {}) {
  return {
    claimId: "C1",
    returnId: "R1",
    orderId: "O1",
    mlbId: "MLB1",
    listingTitle: "PC Gamer",
    family: "PDD",
    reasonId: "PDD1",
    rawStatus: "opened",
    stage: "aberta",
    stageSource: "config",
    saleDate: "2026-09-10",
    openedAt: "2026-09-20T12:00:00.000Z",
    buyerShippedAt: null,
    receivedAt: null,
    refundedAt: null,
    lastUpdatedAt: "2026-09-20T12:00:00.000Z",
    returnedUnits: 1,
    returnedAmount: 1000,
    returnShippingCost: 50,
    logisticType: "cross_docking",
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    status: "ready",
    message: null,
    demo: false,
    generatedAt: "2026-10-05T15:00:00.000Z",
    window: {
      currentStart: "2026-09-06",
      currentEnd: "2026-10-05",
      comparisonStart: "2026-08-07",
      comparisonEnd: "2026-09-05",
    },
    records: [],
    history: [],
    reasons: [],
    salesDaily: [],
    salesBaseAvailable: true,
    ...overrides,
  };
}

const ALL = { logistics: "all", family: "all" };

test("traduz status pela configuração, depois pela ingestão, sem esconder status desconhecido", { skip: skipTs }, () => {
  assert.deepEqual(metrics.resolveStage("Shipped", null, MAPPING), { stage: "enviada_pelo_comprador", source: "config" });
  assert.deepEqual(metrics.resolveStage("novo_status_ml", "recebida", MAPPING), { stage: "recebida", source: "ingestao" });
  assert.deepEqual(metrics.resolveStage("novo_status_ml", null, MAPPING), { stage: null, source: "nao_mapeada" });
});

test("conta dias parada a partir da entrada na etapa atual", { skip: skipTs }, () => {
  const item = record({ stage: "recebida", rawStatus: "delivered" });
  const history = [
    { claimId: "C1", rawStatus: "opened", stage: "aberta", occurredAt: "2026-09-20T12:00:00.000Z" },
    { claimId: "C1", rawStatus: "shipped", stage: "enviada_pelo_comprador", occurredAt: "2026-09-22T12:00:00.000Z" },
    { claimId: "C1", rawStatus: "delivered", stage: "recebida", occurredAt: "2026-09-25T12:00:00.000Z" },
  ];
  assert.equal(metrics.daysInStage(item, history, "2026-10-05T15:00:00.000Z"), 10);
});

test("reconstrói a etapa no fim do período de comparação", { skip: skipTs }, () => {
  const item = record({ stage: "reembolsada", openedAt: "2026-08-20T12:00:00.000Z" });
  const history = [
    { claimId: "C1", rawStatus: "opened", stage: "aberta", occurredAt: "2026-08-20T12:00:00.000Z" },
    { claimId: "C1", rawStatus: "shipped", stage: "enviada_pelo_comprador", occurredAt: "2026-09-01T12:00:00.000Z" },
    { claimId: "C1", rawStatus: "refunded", stage: "reembolsada", occurredAt: "2026-09-15T12:00:00.000Z" },
  ];
  const cutoff = metrics.endOfSaoPauloDay("2026-09-05");
  assert.equal(metrics.stageAt(item, history, cutoff), "enviada_pelo_comprador");
  assert.equal(metrics.stageAt(record({ openedAt: "2026-09-10T12:00:00.000Z" }), [], cutoff), null);
});

test("contadores mostram posição atual e posição no fim da comparação", { skip: skipTs }, () => {
  const data = payload({
    records: [
      record({ claimId: "A", stage: "aberta", openedAt: "2026-10-01T12:00:00.000Z" }),
      record({ claimId: "B", stage: "aberta", openedAt: "2026-09-01T12:00:00.000Z" }),
      record({ claimId: "C", stage: "reembolsada", openedAt: "2026-08-20T12:00:00.000Z", refundedAt: "2026-09-10T12:00:00.000Z" }),
    ],
  });
  const tracking = metrics.buildTracking(data, ALL, 7);
  assert.deepEqual(tracking.counters.open, { current: 2, comparison: 2 });
  assert.deepEqual(tracking.counters.refunded, { current: 1, comparison: 0 });
  assert.equal(tracking.comparisonCutoffDate, "2026-09-05");
  assert.equal(tracking.openRows.length, 2);
  assert.equal(tracking.stalledCount, 1);
  assert.equal(tracking.openRows[0].claimId, "B");
});

test("filtros separam Full e família do motivo", { skip: skipTs }, () => {
  const data = payload({
    records: [
      record({ claimId: "F", logisticType: "fulfillment" }),
      record({ claimId: "X", logisticType: "self_service", family: "PNR" }),
      record({ claimId: "N", logisticType: null }),
    ],
  });
  const count = (filters) => metrics.buildTracking(data, filters, 7).openRows.length;
  assert.equal(count({ logistics: "exclude_fulfillment", family: "all" }), 2);
  assert.equal(count({ logistics: "fulfillment", family: "all" }), 1);
  assert.equal(count({ logistics: "flex", family: "all" }), 1);
  assert.equal(count({ logistics: "all", family: "PNR" }), 1);
});

test("fechamento calcula pelo mês da venda e nunca grava zero falso", { skip: skipTs }, () => {
  const data = payload({
    generatedAt: "2026-10-05T15:00:00.000Z",
    window: { currentStart: "2026-06-01", currentEnd: "2026-09-30", comparisonStart: null, comparisonEnd: null },
    records: [
      record({ claimId: "1", saleDate: "2026-06-10", returnedUnits: 2, returnedAmount: 3000, stage: "reembolsada", reasonId: "ERR" }),
      record({ claimId: "2", saleDate: "2026-06-20", returnedUnits: 1, returnedAmount: 1000, stage: "encerrada_sem_devolucao", reasonId: "ERR" }),
      record({ claimId: "3", saleDate: "2026-09-02", returnedUnits: 1, returnedAmount: 500, reasonId: "SEM_CLASSE", returnShippingCost: null }),
    ],
    reasons: [
      { reasonId: "ERR", family: "PDD", name: "Faltam peças", detail: null, operationalError: true },
      { reasonId: "SEM_CLASSE", family: "PDD", name: "Defeito", detail: null, operationalError: null },
    ],
    salesDaily: [
      { saleDate: "2026-06-05", paidOrders: 10, paidUnits: 100, paidRevenue: 100000 },
      { saleDate: "2026-09-05", paidOrders: 5, paidUnits: 50, paidRevenue: 50000 },
    ],
  });
  const closing = metrics.buildClosing(data, ALL, 60);
  const june = closing.months.find((month) => month.month === "2026-06");
  const september = closing.months.find((month) => month.month === "2026-09");

  assert.equal(closing.months.length, 4);
  assert.equal(june.returnedUnits, 2);
  assert.equal(june.unitsRatePercent, 2);
  assert.equal(june.revenueRatePercent, 3);
  assert.equal(june.shippingCost, 100);
  assert.equal(june.operationalErrorPercent, 100);
  assert.equal(june.provisional, false);
  assert.equal(september.provisional, true);
  assert.equal(september.operationalErrorPercent, null);
  assert.equal(september.shippingCostUnknownCount, 1);
  assert.equal(closing.comparison, null);

  const withoutSales = metrics.buildClosing({ ...data, salesBaseAvailable: false }, ALL, 60);
  assert.equal(withoutSales.current.unitsRatePercent, null);
});

test("alertas da Visão geral ficam ocultos sem dados", { skip: skipTs }, () => {
  assert.equal(metrics.buildOverviewAlerts(payload({ status: "empty" }), 7, 5).visible, false);
  assert.equal(metrics.buildOverviewAlerts(payload({ status: "tables_missing" }), 7, 5).visible, false);
  const ready = metrics.buildOverviewAlerts(payload({ records: [record({ openedAt: "2026-09-01T12:00:00.000Z" })] }), 7, 5);
  assert.equal(ready.visible, true);
  assert.equal(ready.stalledCount, 1);
});

test("migração de devoluções só cria objetos e não guarda dados pessoais", async () => {
  const sql = await readFile(new URL("supabase/migrations/2026-10-05_devolucoes.sql", root), "utf8");
  const code = sql.replace(/--.*$/gm, "");

  for (const table of ["devolucoes", "devolucoes_status", "devolucoes_motivos"]) {
    assert.match(code, new RegExp(`create table if not exists ml_dashboards\\.${table} \\(`));
  }
  assert.match(code, /create or replace view ml_dashboards\.devolucoes_base_vendas_diaria/);
  assert.match(code, /where o\.status = 'paid'/);
  assert.doesNotMatch(code, /\bdrop\s+(table|view|schema|function)|\bdelete\s+from|\binsert\s+into|\btruncate\b|\balter\s+table\s+\S+\s+(drop|rename)/i);
  assert.doesNotMatch(code, /buyer|comprador_nome|endereco|mensage/i);
  assert.doesNotMatch(code, /percent|taxa_|media_/i);
});

test("seção Devoluções entra no menu sem alterar as demais e mantém regras isoladas", async () => {
  const [page, config, server, view] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/returns/returns-config.ts", root), "utf8"),
    readFile(new URL("lib/supabase-returns.ts", root), "utf8"),
    readFile(new URL("app/returns/ReturnsView.tsx", root), "utf8"),
  ]);

  assert.match(page, /\{ id: "returns", label: "Devoluções", icon: Undo2 \}/);
  assert.match(page, /<ReturnsOverviewAlerts payload=\{returns\} \/>/);
  assert.match(config, /export const RETURN_STATUS_TO_STAGE/);
  assert.match(config, /export const STALLED_DAYS_THRESHOLD = 7;/);
  assert.match(server, /if \(env\.VERCEL_ENV === "production"\) return false;/);
  assert.match(server, /if \(env\.VERCEL_ENV === "preview"\) return env\.RETURNS_DEMO_MODE !== "false";/);
  assert.match(server, /return env\.RETURNS_DEMO_MODE === "true";/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_/);
  assert.match(view, /Aguardando dados de devoluções/);
  assert.match(view, /Aguardando classificação dos motivos/);
  assert.doesNotMatch(view, /\bmi\b|\bmil\b/);
});
