/**
 * Contrato de dados da seção Devoluções.
 *
 * Devolução = pós-entrega: o comprador recebeu o produto e o devolveu.
 * Cancelamento é outro assunto e continua em Saúde da conta.
 */

/**
 * Etapas normalizadas, na ordem do funil. As listas em ordem ficam em
 * returns-metrics.ts (RETURN_STAGES e OPEN_RETURN_STAGES).
 */
export type ReturnStage =
  | "aberta"
  | "enviada_pelo_comprador"
  | "recebida"
  | "revisada"
  | "reembolsada"
  | "encerrada_sem_devolucao";

export type ReasonFamily = "PDD" | "PNR";

/**
 * De onde veio a etapa exibida:
 * - config: status traduzido por returns-config.ts;
 * - ingestao: status fora do mapeamento, etapa gravada pela ingestão;
 * - nao_mapeada: nenhuma das duas; a devolução é contada à parte.
 */
export type StageSource = "config" | "ingestao" | "nao_mapeada";

export type ReturnRecord = {
  claimId: string;
  returnId: string | null;
  orderId: string | null;
  mlbId: string | null;
  listingTitle: string | null;
  family: ReasonFamily | null;
  reasonId: string | null;
  rawStatus: string | null;
  stage: ReturnStage | null;
  stageSource: StageSource;
  /** AAAA-MM-DD no calendário de São Paulo. */
  saleDate: string | null;
  openedAt: string | null;
  buyerShippedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  lastUpdatedAt: string | null;
  returnedUnits: number | null;
  returnedAmount: number | null;
  returnShippingCost: number | null;
  logisticType: string | null;
};

export type ReturnStatusEvent = {
  claimId: string;
  rawStatus: string;
  stage: ReturnStage | null;
  occurredAt: string;
};

export type ReturnReason = {
  reasonId: string;
  family: ReasonFamily | null;
  name: string | null;
  detail: string | null;
  /** null = ainda não classificado pelo cliente. */
  operationalError: boolean | null;
};

export type ReturnsSalesDay = {
  saleDate: string;
  paidOrders: number;
  paidUnits: number;
  paidRevenue: number;
};

/**
 * - ready: tabelas existem e há devoluções;
 * - empty: tabelas existem, mas ainda sem linhas;
 * - tables_missing: a migração ainda não foi aplicada no Supabase;
 * - not_configured: variáveis do Supabase ausentes;
 * - error: falha inesperada de leitura.
 */
export type ReturnsDataStatus = "ready" | "empty" | "tables_missing" | "not_configured" | "error";

export type ReturnsWindow = {
  currentStart: string;
  currentEnd: string;
  comparisonStart: string | null;
  comparisonEnd: string | null;
};

export type ReturnsPayload = {
  status: ReturnsDataStatus;
  message: string | null;
  /** true somente no modo demonstração local. */
  demo: boolean;
  /** Momento da leitura; base para "dias parada" e meses provisórios. */
  generatedAt: string;
  window: ReturnsWindow;
  records: ReturnRecord[];
  history: ReturnStatusEvent[];
  reasons: ReturnReason[];
  salesDaily: ReturnsSalesDay[];
  salesBaseAvailable: boolean;
};

export type ReturnsLogisticsFilter = "all" | "exclude_fulfillment" | "fulfillment" | "cross_docking" | "flex";

export type ReturnsFamilyFilter = "all" | ReasonFamily;

export type ReturnsFilters = {
  logistics: ReturnsLogisticsFilter;
  family: ReturnsFamilyFilter;
};
