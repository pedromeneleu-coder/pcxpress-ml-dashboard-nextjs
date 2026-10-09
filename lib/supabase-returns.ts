import { INCLUDE_PNR, RETURN_STATUS_TO_STAGE } from "@/app/returns/returns-config";
import { emptyReturnsPayload, isMissingTableError, resolveDemoMode, resolveStage, shouldShowDemo } from "@/app/returns/returns-metrics";
import type {
  ReasonFamily,
  ReturnReason,
  ReturnRecord,
  ReturnsPayload,
  ReturnsSalesDay,
  ReturnStatusEvent,
  ReturnsWindow,
} from "@/app/returns/returns-types";
import { buildDemoReturnsPayload } from "@/lib/returns-demo-data";
import {
  appendQuery,
  fetchAll,
  getAccount,
  optionalFetchAllWithAvailability,
  readConfig,
  toNullableNumber,
  toNumber,
} from "@/lib/supabase-dashboard";

// Linhas como vêm do Postgres (snake_case). Nenhuma coluna de dado pessoal.
type DevolucaoRecord = {
  claim_id: string;
  return_id: string | null;
  order_id: string | null;
  mlb_id: string | null;
  titulo_anuncio: string | null;
  familia_motivo: string | null;
  reason_id: string | null;
  status_atual: string | null;
  etapa_atual: string | null;
  data_venda: string | null;
  data_abertura: string | null;
  data_envio_comprador: string | null;
  data_recebimento: string | null;
  data_reembolso: string | null;
  ultima_atualizacao: string | null;
  unidades_devolvidas: number | string | null;
  valor_devolvido: number | string | null;
  custo_frete_devolucao: number | string | null;
  logistic_type: string | null;
  // Colunas da fila (2026-10-08_devolucoes_fila.sql). Opcionais: o painel
  // funciona com ou sem essa migração; ausentes viram "—" na tela.
  sku?: string | null;
  quantidade?: number | string | null;
  valor_venda?: number | string | null;
  valor_reembolsado?: number | string | null;
  comprador_apelido?: string | null;
  motivo_descricao?: string | null;
  etapa_ml?: string | null;
  status_reclamacao?: string | null;
  status_retorno?: string | null;
  descricao_status?: string | null;
  data_prevista?: string | null;
  destino_retorno?: string | null;
  rastreio?: string | null;
  prazo_acao_vendedor?: string | null;
  acao_pendente?: string | null;
  resultado?: string | null;
  synced_at?: string | null;
};

type DevolucaoStatusRecord = {
  claim_id: string;
  status: string;
  etapa: string | null;
  data_status: string;
};

type DevolucaoMotivoRecord = {
  reason_id: string;
  familia: string | null;
  nome: string | null;
  detalhe: string | null;
  erro_operacional: boolean | null;
};

type BaseVendasRecord = {
  data_venda: string;
  pedidos_pagos: number | string | null;
  unidades_pagas: number | string | null;
  faturamento_pago: number | string | null;
};

// A leitura usa select=* de propósito: pedir uma coluna que ainda não existe
// no banco faz o Supabase recusar a consulta inteira. Com "*", o painel lê o
// que existir; colunas da fila ausentes ficam vazias. A tabela não tem nenhuma
// coluna de dado pessoal além do apelido do comprador.
const DEVOLUCOES_SELECT = "*";

function family(value: string | null | undefined): ReasonFamily | null {
  const normalized = value?.trim().toUpperCase();
  return normalized === "PDD" || normalized === "PNR" ? normalized : null;
}

function toRecord(row: DevolucaoRecord): ReturnRecord {
  const { stage, source } = resolveStage(row.status_atual, row.etapa_atual, RETURN_STATUS_TO_STAGE);
  return {
    claimId: row.claim_id,
    returnId: row.return_id,
    orderId: row.order_id,
    mlbId: row.mlb_id,
    listingTitle: row.titulo_anuncio,
    family: family(row.familia_motivo),
    reasonId: row.reason_id,
    rawStatus: row.status_atual,
    stage,
    stageSource: source,
    saleDate: row.data_venda ? row.data_venda.slice(0, 10) : null,
    openedAt: row.data_abertura,
    buyerShippedAt: row.data_envio_comprador,
    receivedAt: row.data_recebimento,
    refundedAt: row.data_reembolso,
    lastUpdatedAt: row.ultima_atualizacao,
    returnedUnits: toNullableNumber(row.unidades_devolvidas),
    returnedAmount: toNullableNumber(row.valor_devolvido),
    returnShippingCost: toNullableNumber(row.custo_frete_devolucao),
    logisticType: row.logistic_type,
    sku: row.sku ?? null,
    quantity: toNullableNumber(row.quantidade ?? null),
    saleAmount: toNullableNumber(row.valor_venda ?? null),
    refundedAmount: toNullableNumber(row.valor_reembolsado ?? null),
    buyerNickname: row.comprador_apelido ?? null,
    reasonText: row.motivo_descricao ?? null,
    caseType: row.etapa_ml ?? null,
    claimStatus: row.status_reclamacao ?? null,
    returnStatusText: row.status_retorno ?? null,
    statusDescription: row.descricao_status ?? null,
    expectedAt: row.data_prevista ?? null,
    returnDestination: row.destino_retorno ?? null,
    trackingNumber: row.rastreio ?? null,
    sellerActionDueAt: row.prazo_acao_vendedor ?? null,
    pendingAction: row.acao_pendente ?? null,
    result: row.resultado ?? null,
    syncedAt: row.synced_at ?? null,
  };
}

function toEvent(row: DevolucaoStatusRecord): ReturnStatusEvent {
  return {
    claimId: row.claim_id,
    rawStatus: row.status,
    stage: resolveStage(row.status, row.etapa, RETURN_STATUS_TO_STAGE).stage,
    occurredAt: row.data_status,
  };
}

function toReason(row: DevolucaoMotivoRecord): ReturnReason {
  return {
    reasonId: row.reason_id,
    family: family(row.familia),
    name: row.nome,
    detail: row.detalhe,
    operationalError: row.erro_operacional,
  };
}

function toSalesDay(row: BaseVendasRecord): ReturnsSalesDay {
  return {
    saleDate: row.data_venda.slice(0, 10),
    paidOrders: toNumber(row.pedidos_pagos),
    paidUnits: toNumber(row.unidades_pagas),
    paidRevenue: toNumber(row.faturamento_pago),
  };
}

/** Tabela/view inexistente no PostgREST: a migração ainda não foi aplicada. */
function isMissingRelation(error: unknown): boolean {
  return isMissingTableError(error instanceof Error ? error.message : String(error));
}

function salesPeriodFilter(window: ReturnsWindow): Record<string, string> {
  const current = `and(data_venda.gte.${window.currentStart},data_venda.lte.${window.currentEnd})`;
  return window.comparisonStart && window.comparisonEnd
    ? { or: `(${current},and(data_venda.gte.${window.comparisonStart},data_venda.lte.${window.comparisonEnd}))` }
    : { and: `(data_venda.gte.${window.currentStart},data_venda.lte.${window.currentEnd})` };
}

export async function getReturnsData(window: ReturnsWindow): Promise<ReturnsPayload> {
  // Regra completa em resolveDemoMode/shouldShowDemo (app/returns/returns-metrics.ts).
  // No site oficial, os dados fictícios saem sozinhos quando a ingestão gravar
  // a primeira devolução real.
  const mode = resolveDemoMode(process.env);
  if (shouldShowDemo(mode, null)) return buildDemoReturnsPayload(window);

  const real = await getRealReturnsData(window);
  return shouldShowDemo(mode, real.status) ? buildDemoReturnsPayload(window) : real;
}

async function getRealReturnsData(window: ReturnsWindow): Promise<ReturnsPayload> {
  const config = readConfig();
  if (!config) {
    return emptyReturnsPayload(window, "not_configured", "Supabase não configurado neste ambiente.");
  }

  try {
    const account = await getAccount(config);
    if (!account) {
      return emptyReturnsPayload(window, "error", `Conta "${config.accountName}" não encontrada no Supabase.`);
    }

    const accountFilter = `eq.${account.id}`;
    let devolucoes: DevolucaoRecord[];

    try {
      // Todas as devoluções da conta: as em aberto precisam aparecer qualquer que
      // seja a idade. O volume histórico da PCXpress é de centenas por semestre.
      devolucoes = await fetchAll<DevolucaoRecord>(
        config,
        appendQuery("devolucoes", {
          select: DEVOLUCOES_SELECT,
          account_id: accountFilter,
          order: "data_abertura.desc.nullslast",
        }),
      );
    } catch (error) {
      if (isMissingRelation(error)) {
        return emptyReturnsPayload(
          window,
          "tables_missing",
          "As tabelas de devoluções ainda não existem no Supabase (migração não aplicada).",
        );
      }
      throw error;
    }

    const [statusResult, motivosResult, vendasResult] = await Promise.all([
      optionalFetchAllWithAvailability<DevolucaoStatusRecord>(
        config,
        appendQuery("devolucoes_status", {
          select: "claim_id,status,etapa,data_status",
          account_id: accountFilter,
          order: "data_status.asc",
        }),
      ),
      optionalFetchAllWithAvailability<DevolucaoMotivoRecord>(
        config,
        appendQuery("devolucoes_motivos", {
          select: "reason_id,familia,nome,detalhe,erro_operacional",
          account_id: accountFilter,
        }),
      ),
      optionalFetchAllWithAvailability<BaseVendasRecord>(
        config,
        appendQuery("devolucoes_base_vendas_diaria", {
          select: "data_venda,pedidos_pagos,unidades_pagas,faturamento_pago",
          account_id: accountFilter,
          ...salesPeriodFilter(window),
          order: "data_venda.asc",
        }),
      ),
    ]);

    const records = devolucoes
      .map(toRecord)
      .filter((record) => INCLUDE_PNR || record.family !== "PNR");
    const claimIds = new Set(records.map((record) => record.claimId));

    return {
      status: records.length ? "ready" : "empty",
      message: null,
      demo: false,
      generatedAt: new Date().toISOString(),
      window,
      records,
      history: statusResult.rows.map(toEvent).filter((event) => claimIds.has(event.claimId)),
      reasons: motivosResult.rows.map(toReason),
      salesDaily: vendasResult.rows.map(toSalesDay),
      salesBaseAvailable: vendasResult.available,
    };
  } catch (error) {
    return emptyReturnsPayload(
      window,
      "error",
      error instanceof Error ? error.message : "Erro ao consultar devoluções.",
    );
  }
}
