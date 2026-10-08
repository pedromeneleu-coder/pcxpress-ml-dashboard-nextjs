/**
 * MODO DEMONSTRAÇÃO — dados FICTÍCIOS, apenas para visualizar o layout.
 *
 * - Quando aparece: ver resolveDemoMode/shouldShowDemo (app/returns/returns-metrics.ts).
 *   No site oficial, só enquanto não houver devoluções reais.
 * - Nada daqui é gravado no Supabase. Os números não representam a PCXpress.
 * - Todos os identificadores começam com "DEMO-". A fila imita o vocabulário
 *   da planilha "pcxpress-fila-devolucoes" (etapas, status, destinos e ações),
 *   sem copiar nenhum caso real.
 */

import { RETURN_STATUS_TO_STAGE } from "@/app/returns/returns-config";
import { resolveStage } from "@/app/returns/returns-metrics";
import type {
  ReasonFamily,
  ReturnReason,
  ReturnRecord,
  ReturnsPayload,
  ReturnsSalesDay,
  ReturnStatusEvent,
  ReturnsWindow,
} from "@/app/returns/returns-types";

const DAY_MS = 86_400_000;

const DEMO_REASONS: ReturnReason[] = [
  { reasonId: "DEMO-PDD-01", family: "PDD", name: "Produto com defeito", detail: "Exemplo fictício", operationalError: false },
  { reasonId: "DEMO-PDD-02", family: "PDD", name: "Diferente do anunciado", detail: "Exemplo fictício", operationalError: true },
  { reasonId: "DEMO-PDD-03", family: "PDD", name: "Faltam peças ou acessórios", detail: "Exemplo fictício", operationalError: true },
  { reasonId: "DEMO-PDD-04", family: "PDD", name: "Chegou danificado", detail: "Exemplo fictício", operationalError: null },
  { reasonId: "DEMO-PNR-01", family: "PNR", name: "Produto não recebido", detail: "Exemplo fictício", operationalError: null },
];

const DEMO_LISTINGS = [
  "PC Gamer Ryzen 5 RTX 4060 (exemplo)",
  "PC Escritório Intel i5 16GB (exemplo)",
  "Placa de vídeo RTX 4070 (exemplo)",
  "Memória DDR5 32GB (exemplo)",
  "SSD NVMe 1TB (exemplo)",
  "Fonte 750W 80 Plus Gold (exemplo)",
  "PC Gamer Ryzen 7 RTX 4070 Super (exemplo)",
  "Gabinete Mid Tower Vidro (exemplo)",
];

const LOGISTIC_TYPES = ["cross_docking", "cross_docking", "fulfillment", "self_service"];

/** Gerador pseudoaleatório fixo: a demonstração mostra sempre os mesmos números. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function isoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return isoDate(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS);
}

type DemoScenario = {
  caseType: string;
  returnStatusText: string;
  statusDescription: string;
  returnDestination: string;
  pendingAction: string;
  /** Dias após a última atualização em que o ML promete algo (data prevista). */
  expectedAfterDays?: number;
  /** O ML dá prazo para a loja agir. */
  sellerDeadline?: boolean;
  /** Resultado da revisão, quando já revisado. */
  result?: string;
  tracking?: boolean;
};

// Cenários de casos abertos por etapa, com o vocabulário da planilha de fila.
const OPEN_SCENARIOS: Record<"aberta" | "enviada_pelo_comprador" | "recebida" | "revisada", DemoScenario[]> = {
  aberta: [
    {
      caseType: "Reclamação",
      returnStatusText: "Aguardando comprador iniciar devolução",
      statusDescription: "Reclamação com devolução habilitada — o comprador já pode iniciar a devolução.",
      returnDestination: "—",
      pendingAction: "Nenhuma — aguardar comprador",
    },
    {
      caseType: "Devolução",
      returnStatusText: "Em preparação pelo comprador",
      statusDescription: "Devolução em preparação — o comprador ainda não postou o produto.",
      returnDestination: "A definir",
      pendingAction: "Nenhuma — aguardar envio",
    },
    {
      caseType: "Mediação",
      returnStatusText: "Em análise pelo ML",
      statusDescription: "O Mercado Livre está analisando o caso — acompanhe a conversa.",
      returnDestination: "—",
      pendingAction: "Acompanhar a conversa do caso e responder ao ML",
      sellerDeadline: true,
    },
  ],
  enviada_pelo_comprador: [
    {
      caseType: "Devolução",
      returnStatusText: "A caminho do CD do ML para revisão",
      statusDescription: "Em devolução — o produto está indo para o centro de distribuição do ML para revisão.",
      returnDestination: "CD Mercado Livre (Full)",
      pendingAction: "Nenhuma — aguardar resultado da revisão",
      expectedAfterDays: 6,
      tracking: true,
    },
    {
      caseType: "Devolução",
      returnStatusText: "A caminho do vendedor",
      statusDescription: "Devolução a caminho do seu endereço — use o código de autorização ao receber.",
      returnDestination: "Vendedor",
      pendingAction: "Receber com código de autorização e conferir",
      expectedAfterDays: 5,
      tracking: true,
    },
    {
      caseType: "Retorno (não entregue)",
      returnStatusText: "Voltando ao vendedor",
      statusDescription: "O envio não foi entregue e está voltando para a loja.",
      returnDestination: "Vendedor",
      pendingAction: "Receber e reestocar",
      expectedAfterDays: 7,
      tracking: true,
    },
  ],
  recebida: [
    {
      caseType: "Devolução",
      returnStatusText: "Entregue ao vendedor — revisão pendente",
      statusDescription: "Devolução para revisar — avise o ML como o produto chegou dentro do prazo.",
      returnDestination: "Vendedor",
      pendingAction: "Revisar o produto e informar ao ML (\"Já revisei\")",
      sellerDeadline: true,
      tracking: true,
    },
    {
      caseType: "Devolução",
      returnStatusText: "Em revisão no CD do ML",
      statusDescription: "O produto chegou ao centro de distribuição e está em revisão pelo ML.",
      returnDestination: "CD Mercado Livre (Full)",
      pendingAction: "Nenhuma — aguardar resultado da revisão",
      expectedAfterDays: 4,
      tracking: true,
    },
  ],
  revisada: [
    {
      caseType: "Devolução",
      returnStatusText: "Revisado — produto parado no CD do ML",
      statusDescription: "Devolução revisada. Solicite a retirada do produto no centro de distribuição.",
      returnDestination: "CD Mercado Livre (Full)",
      pendingAction: "Solicitar a retirada do produto no CD",
      result: "Não apto para venda",
      tracking: true,
    },
    {
      caseType: "Devolução",
      returnStatusText: "Revisado pelo ML — prazo para contestar",
      statusDescription: "Devolução entregue e revisada pelo ML — se discordar, peça ajuda dentro do prazo.",
      returnDestination: "Vendedor",
      pendingAction: "Se discordar da revisão, pedir ajuda ao ML",
      sellerDeadline: true,
      result: "Apto para venda",
      tracking: true,
    },
  ],
};

const REVIEW_REASONS = [
  "não está em boas condições (exemplo)",
  "apresenta marcas de uso (exemplo)",
  "a caixa original está danificada (exemplo)",
  "não funciona (exemplo)",
];

type DemoPath = { status: string; offsetDays: number }[];

// Trajetórias de status (status bruto + dias após a abertura).
const PATHS: DemoPath[] = [
  [{ status: "opened", offsetDays: 0 }],
  [{ status: "opened", offsetDays: 0 }, { status: "shipped", offsetDays: 3 }],
  [{ status: "opened", offsetDays: 0 }, { status: "shipped", offsetDays: 2 }, { status: "delivered", offsetDays: 8 }],
  [{ status: "opened", offsetDays: 0 }, { status: "shipped", offsetDays: 2 }, { status: "delivered", offsetDays: 7 }, { status: "reviewed", offsetDays: 9 }],
  [{ status: "opened", offsetDays: 0 }, { status: "shipped", offsetDays: 2 }, { status: "delivered", offsetDays: 7 }, { status: "reviewed", offsetDays: 9 }, { status: "refunded", offsetDays: 11 }],
  [{ status: "opened", offsetDays: 0 }, { status: "shipped", offsetDays: 3 }, { status: "delivered", offsetDays: 9 }, { status: "refunded", offsetDays: 10 }],
  [{ status: "opened", offsetDays: 0 }, { status: "cancelled", offsetDays: 4 }],
];

export function buildDemoReturnsPayload(window: ReturnsWindow): ReturnsPayload {
  const random = seeded(20261005);
  // Mesmo conjunto de devoluções qualquer que seja o período escolhido: o
  // Acompanhamento não depende do filtro de datas. "Agora" é fixado no dia.
  const now = Math.floor(Date.now() / DAY_MS) * DAY_MS + 15 * 3_600_000;
  const generatedAt = new Date(now).toISOString();
  const records: ReturnRecord[] = [];
  const history: ReturnStatusEvent[] = [];
  const spanDays = 420;
  const total = 250;

  for (let index = 0; index < total; index += 1) {
    const openedTime = now - Math.floor(random() * spanDays) * DAY_MS - Math.floor(random() * 20) * 3_600_000;
    const ageDays = Math.floor((now - openedTime) / DAY_MS);
    const reason = DEMO_REASONS[Math.floor(random() * DEMO_REASONS.length)];
    const listingIndex = Math.floor(random() * DEMO_LISTINGS.length);
    const units = random() < 0.85 ? 1 : 2;
    const unitPrice = 900 + Math.round(random() * 5200);
    // Devoluções recentes ficam no começo do fluxo; as antigas quase sempre já
    // terminaram (algumas poucas ficam paradas, para exemplificar o destaque).
    const finished = [4, 5, 4, 5, 6];
    const pathIndex = reason.family === "PNR"
      ? 6
      : ageDays > 45
        ? finished[Math.floor(random() * finished.length)]
        : ageDays > 20
          ? random() < 0.3 ? Math.floor(random() * 4) : finished[Math.floor(random() * finished.length)]
          : Math.floor(random() * Math.min(6, 1 + ageDays / 4));
    const path = PATHS[pathIndex].filter((step) => openedTime + step.offsetDays * DAY_MS <= now);
    const steps = path.length ? path : [PATHS[0][0]];
    const last = steps[steps.length - 1];
    const claimId = `DEMO-${String(100000 + index)}`;
    const at = (status: string) => {
      const step = steps.find((item) => item.status === status);
      return step ? new Date(openedTime + step.offsetDays * DAY_MS).toISOString() : null;
    };
    const ingested = resolveStage(last.status, null, RETURN_STATUS_TO_STAGE);
    const lastUpdatedAt = new Date(openedTime + last.offsetDays * DAY_MS).toISOString();
    const saleAmount = units * unitPrice;
    const stage = ingested.stage;
    const isOpen = stage === "aberta" || stage === "enviada_pelo_comprador" || stage === "recebida" || stage === "revisada";
    const scenarios = isOpen ? OPEN_SCENARIOS[stage] : null;
    const scenario: DemoScenario = scenarios
      ? scenarios[Math.floor(random() * scenarios.length)]
      : stage === "reembolsada"
        ? {
            caseType: "Devolução",
            returnStatusText: "Reembolsado ao comprador",
            statusDescription: "Caso encerrado — o comprador foi reembolsado.",
            returnDestination: "Vendedor",
            pendingAction: "Nenhuma — caso encerrado",
            result: random() < 0.6 ? "Não apto para venda" : "Apto para venda",
            tracking: true,
          }
        : {
            caseType: "Reclamação",
            returnStatusText: "Encerrado sem devolução",
            statusDescription: "Caso encerrado sem o produto voltar.",
            returnDestination: "—",
            pendingAction: "Nenhuma — caso encerrado",
          };
    const lastUpdateTime = openedTime + last.offsetDays * DAY_MS;
    // Prazos espalhados entre anteontem e daqui a 2 dias, para mostrar vencido, hoje e próximo.
    const sellerActionDueAt = scenario.sellerDeadline ? isoDate(now + ((index % 5) - 2) * DAY_MS) : null;
    const reviewed = Boolean(scenario.result);

    records.push({
      claimId,
      returnId: `DEMO-R${index}`,
      orderId: `DEMO-PED-${200000 + index}`,
      mlbId: `DEMO-MLB${3000 + listingIndex}`,
      listingTitle: DEMO_LISTINGS[listingIndex],
      family: reason.family as ReasonFamily,
      reasonId: reason.reasonId,
      rawStatus: last.status,
      stage: ingested.stage,
      stageSource: ingested.source,
      saleDate: isoDate(openedTime - (3 + Math.floor(random() * 20)) * DAY_MS),
      openedAt: new Date(openedTime).toISOString(),
      buyerShippedAt: at("shipped"),
      receivedAt: at("delivered"),
      refundedAt: at("refunded"),
      lastUpdatedAt,
      returnedUnits: units,
      returnedAmount: saleAmount,
      returnShippingCost: random() < 0.9 ? Math.round((25 + random() * 70) * 100) / 100 : null,
      logisticType: LOGISTIC_TYPES[Math.floor(random() * LOGISTIC_TYPES.length)],
      sku: `DEMO-SKU-${String(listingIndex + 1).padStart(2, "0")}`,
      quantity: units,
      saleAmount,
      refundedAmount: reviewed || stage === "reembolsada" ? Math.round(saleAmount * 0.95 * 100) / 100 : null,
      buyerNickname: `COMPRADOR.DEMO${index}`,
      reasonText: reviewed ? REVIEW_REASONS[Math.floor(random() * REVIEW_REASONS.length)] : null,
      caseType: scenario.caseType,
      claimStatus: isOpen ? "opened" : "closed",
      returnStatusText: scenario.returnStatusText,
      statusDescription: scenario.statusDescription,
      expectedAt: scenario.expectedAfterDays ? isoDate(lastUpdateTime + scenario.expectedAfterDays * DAY_MS) : null,
      returnDestination: scenario.returnDestination,
      trackingNumber: scenario.tracking ? `DEMO${String(700000 + index)}BR` : null,
      sellerActionDueAt,
      pendingAction: scenario.pendingAction,
      result: scenario.result ?? null,
      syncedAt: generatedAt,
    });

    for (const step of steps) {
      history.push({
        claimId,
        rawStatus: step.status,
        stage: resolveStage(step.status, null, RETURN_STATUS_TO_STAGE).stage,
        occurredAt: new Date(openedTime + step.offsetDays * DAY_MS).toISOString(),
      });
    }
  }

  const salesDaily: ReturnsSalesDay[] = [];
  const ranges: [string, string][] = [[window.currentStart, window.currentEnd]];
  if (window.comparisonStart && window.comparisonEnd) ranges.push([window.comparisonStart, window.comparisonEnd]);
  const seen = new Set<string>();

  for (const [start, end] of ranges) {
    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (seen.has(date)) continue;
      seen.add(date);
      const paidOrders = 8 + Math.floor(random() * 7);
      const paidUnits = paidOrders + Math.floor(random() * 3);
      salesDaily.push({
        saleDate: date,
        paidOrders,
        paidUnits,
        paidRevenue: Math.round(paidUnits * (2500 + random() * 3000) * 100) / 100,
      });
    }
  }

  return {
    status: "ready",
    message: "Modo demonstração: dados fictícios, não representam a PCXpress.",
    demo: true,
    generatedAt,
    window,
    records,
    history,
    reasons: DEMO_REASONS,
    salesDaily: salesDaily.sort((a, b) => a.saleDate.localeCompare(b.saleDate)),
    salesBaseAvailable: true,
  };
}
