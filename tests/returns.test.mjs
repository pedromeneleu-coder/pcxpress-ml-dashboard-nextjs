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
    sku: "SKU1",
    quantity: 1,
    saleAmount: 1000,
    refundedAmount: null,
    buyerNickname: null,
    reasonText: null,
    caseType: "Devolução",
    claimStatus: "opened",
    returnStatusText: "Em análise pelo ML",
    statusDescription: null,
    expectedAt: null,
    returnDestination: null,
    trackingNumber: null,
    sellerActionDueAt: null,
    pendingAction: null,
    result: null,
    syncedAt: null,
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
// Mesmas regras da planilha de fila: parado com 3+ dias sem atualização; aviso de prazo em até 2 dias.
const RULES = { stalledDaysWithoutUpdate: 3, deadlineWarningDays: 2 };

test("traduz status pela configuração, depois pela ingestão, sem esconder status desconhecido", { skip: skipTs }, () => {
  assert.deepEqual(metrics.resolveStage("Shipped", null, MAPPING), { stage: "enviada_pelo_comprador", source: "config" });
  assert.deepEqual(metrics.resolveStage("novo_status_ml", "recebida", MAPPING), { stage: "recebida", source: "ingestao" });
  assert.deepEqual(metrics.resolveStage("novo_status_ml", null, MAPPING), { stage: null, source: "nao_mapeada" });
});

test("regras da fila iguais às da planilha: prazo, ação do vendedor e parado", { skip: skipTs }, () => {
  const today = "2026-10-05";
  const row = (overrides) => metrics.buildQueueRow(record(overrides), today, RULES);

  assert.equal(row({ sellerActionDueAt: "2026-10-04" }).deadline, "vencido");
  assert.equal(row({ sellerActionDueAt: "2026-10-05" }).deadline, "hoje");
  assert.equal(row({ sellerActionDueAt: "2026-10-07" }).deadline, "proximo");
  assert.equal(row({ sellerActionDueAt: "2026-10-09" }).deadline, "ok");
  assert.equal(row({ sellerActionDueAt: "2026-10-04", claimStatus: "closed" }).deadline, null);

  assert.equal(row({ pendingAction: "Solicitar a retirada do produto no CD" }).awaitingSellerAction, true);
  assert.equal(row({ pendingAction: "Nenhuma — aguardar comprador" }).awaitingSellerAction, false);

  assert.equal(row({ lastUpdatedAt: "2026-10-02T12:00:00.000Z" }).stalled, true);
  assert.equal(row({ lastUpdatedAt: "2026-10-03T12:00:00.000Z" }).stalled, false);
  assert.equal(row({ lastUpdatedAt: "2026-10-04T12:00:00.000Z", expectedAt: "2026-10-04" }).stalled, true);
  assert.equal(row({ lastUpdatedAt: null, expectedAt: null }).stalled, false);
  assert.equal(row({ lastUpdatedAt: "2026-09-01T12:00:00.000Z", claimStatus: "closed" }).stalled, false);
  assert.equal(metrics.saoPauloDate("2026-10-04"), "2026-10-04");
});

test("acompanhamento segue o Resumo da planilha e a ordem de prioridade", { skip: skipTs }, () => {
  const data = payload({
    records: [
      record({ claimId: "REST", lastUpdatedAt: "2026-10-04T12:00:00.000Z", saleAmount: 100 }),
      record({ claimId: "STALLED", lastUpdatedAt: "2026-09-20T12:00:00.000Z", saleAmount: 200, returnStatusText: "Revisado — produto parado no CD do ML" }),
      record({ claimId: "ACTION", lastUpdatedAt: "2026-10-04T12:00:00.000Z", pendingAction: "Receber e reestocar", saleAmount: 300 }),
      record({ claimId: "DUE", lastUpdatedAt: "2026-10-04T12:00:00.000Z", sellerActionDueAt: "2026-10-05", pendingAction: "Revisar o produto", saleAmount: 400 }),
      record({ claimId: "CLOSED", claimStatus: "closed", stage: "reembolsada", saleAmount: 999 }),
    ],
  });
  const tracking = metrics.buildTracking(data, ALL, RULES);

  assert.deepEqual(tracking.rows.map((row) => row.record.claimId), ["DUE", "ACTION", "STALLED", "REST"]);
  assert.equal(tracking.openCount, 4);
  assert.equal(tracking.openSaleAmount, 1000);
  assert.equal(tracking.deadlineDueCount, 1);
  assert.equal(tracking.awaitingActionCount, 2);
  assert.equal(tracking.stalledCount, 1);
  assert.equal(tracking.stalledSaleAmount, 200);
  assert.deepEqual(tracking.byReturnStatus, [
    { label: "Em análise pelo ML", count: 3, saleAmount: 800 },
    { label: "Revisado — produto parado no CD do ML", count: 1, saleAmount: 200 },
  ]);
});

test("acompanhamento não muda com o filtro de datas", { skip: skipTs }, () => {
  const records = [
    record({ claimId: "OLD", openedAt: "2025-12-01T12:00:00.000Z", saleDate: "2025-11-20" }),
    record({ claimId: "NEW", openedAt: "2026-10-03T12:00:00.000Z" }),
  ];
  const septemberWindow = payload({ records });
  const januaryWindow = payload({
    records,
    window: { currentStart: "2026-01-01", currentEnd: "2026-01-31", comparisonStart: null, comparisonEnd: null },
  });

  assert.deepEqual(
    metrics.buildTracking(januaryWindow, ALL, RULES),
    metrics.buildTracking(septemberWindow, ALL, RULES),
  );
  assert.equal(metrics.buildTracking(septemberWindow, ALL, RULES).openCount, 2);
});

test("motivos e anúncios do Fechamento seguem a data da venda", { skip: skipTs }, () => {
  const data = payload({
    records: [
      record({ claimId: "1", saleDate: "2026-09-10", reasonId: "P1", mlbId: "MLB1", returnedAmount: 1000 }),
      record({ claimId: "2", saleDate: "2026-09-20", reasonId: "P1", mlbId: "MLB1", returnedAmount: 500 }),
      record({ claimId: "3", saleDate: "2026-08-20", reasonId: "P1", mlbId: "MLB1" }),
      record({ claimId: "4", saleDate: "2026-09-21", reasonId: "P2", stage: "encerrada_sem_devolucao" }),
      record({ claimId: "5", saleDate: "2026-07-01", reasonId: "P2" }),
    ],
    reasons: [{ reasonId: "P1", family: "PDD", name: "Faltam peças", detail: null, operationalError: true }],
  });
  const breakdown = metrics.buildPeriodBreakdown(data, ALL);
  const pdd = breakdown.reasonsByFamily.find((group) => group.family === "PDD");

  assert.deepEqual(pdd.rows, [
    { reasonId: "P1", name: "Faltam peças", family: "PDD", current: 2, comparison: 1, sharePercent: 100 },
  ]);
  assert.deepEqual(breakdown.listings[0], { mlbId: "MLB1", title: "PC Gamer", current: 2, comparison: 1, units: 2, amount: 1500 });
});

test("filtros separam Full e família do motivo", { skip: skipTs }, () => {
  const data = payload({
    records: [
      record({ claimId: "F", logisticType: "fulfillment" }),
      record({ claimId: "X", logisticType: "self_service", family: "PNR" }),
      record({ claimId: "N", logisticType: null }),
    ],
  });
  const count = (filters) => metrics.buildTracking(data, filters, RULES).rows.length;
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
  assert.equal(metrics.buildOverviewAlerts(payload({ status: "empty" }), RULES, 5).visible, false);
  assert.equal(metrics.buildOverviewAlerts(payload({ status: "tables_missing" }), RULES, 5).visible, false);
  const ready = metrics.buildOverviewAlerts(payload({
    records: [record({ lastUpdatedAt: "2026-09-01T12:00:00.000Z", sellerActionDueAt: "2026-10-04" })],
  }), RULES, 5);
  assert.equal(ready.visible, true);
  assert.equal(ready.stalledCount, 1);
  assert.equal(ready.deadlineDueCount, 1);
});

test("dados fictícios: site oficial só até existirem devoluções reais", { skip: skipTs }, () => {
  const mode = (env) => metrics.resolveDemoMode(env);
  assert.equal(mode({ VERCEL_ENV: "production" }), "until_real_data");
  assert.equal(mode({ VERCEL_ENV: "production", RETURNS_DEMO_MODE: "false" }), "off");
  assert.equal(mode({ VERCEL_ENV: "preview" }), "forced");
  assert.equal(mode({ VERCEL_ENV: "preview", RETURNS_DEMO_MODE: "false" }), "off");
  assert.equal(mode({}), "off");
  assert.equal(mode({ RETURNS_DEMO_MODE: "true" }), "forced");

  const show = metrics.shouldShowDemo;
  assert.equal(show("until_real_data", null), false);
  assert.equal(show("until_real_data", "tables_missing"), true);
  assert.equal(show("until_real_data", "empty"), true);
  assert.equal(show("until_real_data", "ready"), false);
  assert.equal(show("until_real_data", "error"), false);
  assert.equal(show("forced", "ready"), true);
  assert.equal(show("off", "empty"), false);
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

test("migração da fila só acrescenta colunas e guarda só o apelido do comprador", async () => {
  const sql = await readFile(new URL("supabase/migrations/2026-10-08_devolucoes_fila.sql", root), "utf8");
  const code = sql.replace(/--.*$/gm, "");

  assert.match(code, /alter table ml_dashboards\.devolucoes\s+add column if not exists sku text/);
  for (const column of ["valor_venda", "valor_reembolsado", "comprador_apelido", "status_retorno", "prazo_acao_vendedor", "acao_pendente", "resultado"]) {
    assert.match(code, new RegExp(`add column if not exists ${column} `));
  }
  assert.doesNotMatch(code, /\bdrop\s|\bdelete\s+from|\binsert\s+into|\btruncate\b|\brename\b/i);
  assert.doesNotMatch(code, /comprador_nome|cpf|endereco|telefone|mensage/i);
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
  assert.match(config, /stalledDaysWithoutUpdate: 3,/);
  assert.match(server, /const mode = resolveDemoMode\(process\.env\);/);
  assert.match(server, /shouldShowDemo\(mode, real\.status\) \? buildDemoReturnsPayload\(window\) : real/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_/);
  assert.match(view, /Aguardando dados de devoluções/);
  assert.match(view, /Aguardando classificação dos motivos/);
  assert.doesNotMatch(view, /\bmi\b|\bmil\b/);
});
