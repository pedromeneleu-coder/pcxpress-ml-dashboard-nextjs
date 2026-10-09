/**
 * Cálculos da seção Devoluções.
 *
 * Funções puras: recebem as linhas lidas do Supabase (ou do modo demonstração)
 * e devolvem os números de cada bloco. Percentuais e médias são sempre
 * calculados aqui, na leitura, a partir de contagens e somas — nunca gravados.
 *
 * Este arquivo só importa tipos, para poder ser testado direto pelo Node.
 * Os limites configuráveis chegam por parâmetro (ver returns-config.ts).
 */

import type {
  ReasonFamily,
  ReturnReason,
  ReturnRecord,
  ReturnStage,
  ReturnsDataStatus,
  ReturnsFilters,
  ReturnsPayload,
  ReturnsWindow,
  StageSource,
} from "./returns-types";

export const RETURN_STAGES: readonly ReturnStage[] = [
  "aberta",
  "enviada_pelo_comprador",
  "recebida",
  "revisada",
  "reembolsada",
  "encerrada_sem_devolucao",
];

/** Etapas em que a devolução ainda exige acompanhamento. */
export const OPEN_RETURN_STAGES: readonly ReturnStage[] = [
  "aberta",
  "enviada_pelo_comprador",
  "recebida",
  "revisada",
];

export const RETURN_STAGE_LABELS: Record<ReturnStage, string> = {
  aberta: "Aberta",
  enviada_pelo_comprador: "A caminho",
  recebida: "Recebida, aguardando revisão",
  revisada: "Revisada",
  reembolsada: "Reembolsada",
  encerrada_sem_devolucao: "Encerrada sem devolução",
};

const DAY_MS = 86_400_000;
const SAO_PAULO_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function emptyReturnsPayload(
  window: ReturnsWindow,
  status: ReturnsDataStatus = "empty",
  message: string | null = null,
  generatedAt: string = new Date().toISOString(),
): ReturnsPayload {
  return {
    status,
    message,
    demo: false,
    generatedAt,
    window,
    records: [],
    history: [],
    reasons: [],
    salesDaily: [],
    salesBaseAvailable: false,
  };
}

/**
 * Quando mostrar os dados fictícios de demonstração:
 * - off: nunca;
 * - forced: sempre (prévias da Vercel e computador local com RETURNS_DEMO_MODE=true);
 * - until_real_data: só enquanto não houver devoluções reais (site oficial).
 */
export type ReturnsDemoMode = "off" | "forced" | "until_real_data";

export function resolveDemoMode(env: Record<string, string | undefined>): ReturnsDemoMode {
  if (env.RETURNS_DEMO_MODE === "false") return "off";
  if (env.VERCEL_ENV === "production") return "until_real_data";
  if (env.VERCEL_ENV === "preview") return "forced";
  return env.RETURNS_DEMO_MODE === "true" ? "forced" : "off";
}

/**
 * Situações em que ainda não existe nenhuma devolução real para mostrar.
 * Falha de leitura ("error") NÃO entra: um problema no banco nunca vira
 * dado fictício no site oficial.
 */
const STATUSES_WITHOUT_REAL_DATA: readonly ReturnsDataStatus[] = ["tables_missing", "empty", "not_configured"];

/**
 * Erro do Supabase que significa "a TABELA ou VIEW ainda não existe"
 * (migração não aplicada). Só esse caso pode ligar a demonstração no site
 * oficial. Coluna inexistente (código 42703) ou qualquer outra falha NÃO
 * entra: com dados reais no banco, um erro nunca pode virar dado fictício.
 */
export function isMissingTableError(message: string): boolean {
  if (/\b42703\b|column\s+\S+\s+does not exist/i.test(message)) return false;
  return /PGRST205|\b42P01\b|Could not find the table|relation\s+\S+\s+does not exist/i.test(message);
}

export function shouldShowDemo(mode: ReturnsDemoMode, realStatus: ReturnsDataStatus | null): boolean {
  if (mode === "forced") return true;
  if (mode === "off" || realStatus === null) return false;
  return STATUSES_WITHOUT_REAL_DATA.includes(realStatus);
}

/** Converte um instante em data AAAA-MM-DD no calendário de São Paulo. */
export function saoPauloDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Data pura já está no calendário certo; convertê-la como instante UTC
  // voltaria um dia em São Paulo.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? SAO_PAULO_DATE.format(new Date(time)) : null;
}

function inWindow(date: string | null, start: string | null, end: string | null): boolean {
  return Boolean(date && start && end && date >= start && date <= end);
}

function daysBetween(firstDate: string, lastDate: string): number {
  return Math.round(
    (Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / DAY_MS,
  );
}

function isReturnStage(value: string | null | undefined): value is ReturnStage {
  return Boolean(value && (RETURN_STAGES as readonly string[]).includes(value));
}

/**
 * Traduz o status bruto para a etapa. Ordem: mapeamento da configuração →
 * etapa gravada pela ingestão → "não mapeada".
 */
export function resolveStage(
  rawStatus: string | null | undefined,
  ingestionStage: string | null | undefined,
  mapping: Record<string, ReturnStage>,
): { stage: ReturnStage | null; source: StageSource } {
  const normalized = rawStatus?.trim().toLowerCase();
  if (normalized) {
    for (const [status, stage] of Object.entries(mapping)) {
      if (status.toLowerCase() === normalized) return { stage, source: "config" };
    }
  }

  const ingested = ingestionStage?.trim().toLowerCase();
  if (isReturnStage(ingested)) return { stage: ingested, source: "ingestao" };

  return { stage: null, source: "nao_mapeada" };
}

export function matchesFilters(record: ReturnRecord, filters: ReturnsFilters): boolean {
  const type = record.logisticType?.toLowerCase() ?? null;

  if (filters.logistics === "exclude_fulfillment" && type === "fulfillment") return false;
  if (filters.logistics === "fulfillment" && type !== "fulfillment") return false;
  if (filters.logistics === "cross_docking" && type !== "cross_docking") return false;
  if (filters.logistics === "flex" && type !== "self_service" && type !== "flex") return false;
  if (filters.family !== "all" && record.family !== filters.family) return false;

  return true;
}

// -----------------------------------------------------------------------------
// A. Acompanhamento — fila de casos abertos (mesmas regras da planilha
// "pcxpress-fila-devolucoes", abas Devoluções e Resumo). Situação de hoje;
// não depende do filtro de datas.
// -----------------------------------------------------------------------------

/** Situação do prazo para ação do vendedor (coluna "Prazo do vendedor" da planilha). */
export type SellerDeadline = "vencido" | "hoje" | "proximo" | "ok";

export type QueueRow = {
  record: ReturnRecord;
  /** Nome do motivo: texto do ML; se ausente, nome do dicionário de motivos. */
  reasonText: string | null;
  /** Dias desde a última atualização do ML (null quando não informada). */
  daysWithoutUpdate: number | null;
  /** Aberto e (data prevista do ML já passou ou sem atualização há ≥ limite). */
  stalled: boolean;
  deadline: SellerDeadline | null;
  /** Ação pendente informada e diferente de "Nenhuma…". */
  awaitingSellerAction: boolean;
  /** 0 prazo vencido/hoje · 1 aguardando ação · 2 parado · 3 demais. */
  priority: 0 | 1 | 2 | 3;
};

/** saleAmount null = nenhum caso do grupo tem valor de venda informado. */
export type ReturnStatusGroup = { label: string; count: number; saleAmount: number | null };

export type TrackingSummary = {
  openCount: number;
  /** null quando a ingestão ainda não informa o valor de venda (nunca R$ 0,00 falso). */
  openSaleAmount: number | null;
  deadlineDueCount: number;
  awaitingActionCount: number;
  stalledCount: number;
  stalledSaleAmount: number | null;
  byReturnStatus: ReturnStatusGroup[];
  /** Fila em ordem de prioridade, como na planilha. */
  rows: QueueRow[];
};

export type QueueRules = {
  /** "Parado" quando sem atualização há este número de dias ou mais. */
  stalledDaysWithoutUpdate: number;
  /** "≤ N dias" para o prazo do vendedor. */
  deadlineWarningDays: number;
};

function reasonIndex(reasons: ReturnReason[]): Map<string, ReturnReason> {
  return new Map(reasons.map((reason) => [reason.reasonId, reason]));
}

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

/** Caso em aberto: "Status ML = Aberta"; sem essa informação, usa a etapa. */
export function isOpenCase(record: ReturnRecord): boolean {
  const status = record.claimStatus?.trim().toLowerCase();
  if (status === "opened" || status === "aberta") return true;
  if (status === "closed" || status === "fechada") return false;
  return record.stage === null || OPEN_RETURN_STAGES.includes(record.stage);
}

export function sellerDeadline(dueAt: string | null, today: string, warningDays: number): SellerDeadline | null {
  const due = saoPauloDate(dueAt);
  if (!due) return null;
  const diff = daysBetween(today, due);
  if (diff < 0) return "vencido";
  if (diff === 0) return "hoje";
  return diff <= warningDays ? "proximo" : "ok";
}

export function buildQueueRow(
  record: ReturnRecord,
  today: string,
  rules: QueueRules,
  reasons: Map<string, ReturnReason> = new Map(),
): QueueRow {
  const open = isOpenCase(record);
  const lastUpdate = saoPauloDate(record.lastUpdatedAt);
  const expected = saoPauloDate(record.expectedAt);
  const daysWithoutUpdate = lastUpdate ? daysBetween(lastUpdate, today) : null;
  const stalled = open && (
    (expected !== null && expected < today)
    || (daysWithoutUpdate !== null && daysWithoutUpdate >= rules.stalledDaysWithoutUpdate)
  );
  const deadline = open ? sellerDeadline(record.sellerActionDueAt, today, rules.deadlineWarningDays) : null;
  const action = record.pendingAction?.trim() ?? "";
  const awaitingSellerAction = open && action !== "" && !/^nenhuma/i.test(action);
  const priority = deadline === "vencido" || deadline === "hoje" ? 0 : awaitingSellerAction ? 1 : stalled ? 2 : 3;

  return {
    record,
    reasonText: record.reasonText ?? (record.reasonId ? reasons.get(record.reasonId)?.name ?? null : null),
    daysWithoutUpdate,
    stalled,
    deadline,
    awaitingSellerAction,
    priority,
  };
}

/** Ordem da planilha: prazo vencido/hoje → ação do vendedor → parados → demais. */
export function compareQueueRows(a: QueueRow, b: QueueRow): number {
  return a.priority - b.priority
    || (b.daysWithoutUpdate ?? -1) - (a.daysWithoutUpdate ?? -1)
    || (a.record.openedAt ?? "").localeCompare(b.record.openedAt ?? "");
}

export function buildTracking(
  payload: ReturnsPayload,
  filters: ReturnsFilters,
  rules: QueueRules,
): TrackingSummary {
  const today = saoPauloDate(payload.generatedAt) ?? payload.window.currentEnd;
  const reasons = reasonIndex(payload.reasons);
  const rows = payload.records
    .filter((record) => matchesFilters(record, filters) && isOpenCase(record))
    .map((record) => buildQueueRow(record, today, rules, reasons))
    .sort(compareQueueRows);

  const saleAmount = (items: QueueRow[]) => (items.some((row) => row.record.saleAmount !== null)
    ? items.reduce((total, row) => total + (row.record.saleAmount ?? 0), 0)
    : null);
  const stalledRows = rows.filter((row) => row.stalled);
  const groups = new Map<string, ReturnStatusGroup>();
  for (const row of rows) {
    const label = row.record.returnStatusText
      ?? (row.record.stage ? RETURN_STAGE_LABELS[row.record.stage] : "Status não informado");
    const group = groups.get(label) ?? { label, count: 0, saleAmount: null };
    group.count += 1;
    if (row.record.saleAmount !== null) group.saleAmount = (group.saleAmount ?? 0) + row.record.saleAmount;
    groups.set(label, group);
  }

  return {
    openCount: rows.length,
    openSaleAmount: saleAmount(rows),
    deadlineDueCount: countBy(rows, (row) => row.deadline === "vencido" || row.deadline === "hoje"),
    awaitingActionCount: countBy(rows, (row) => row.awaitingSellerAction),
    stalledCount: stalledRows.length,
    stalledSaleAmount: saleAmount(stalledRows),
    byReturnStatus: [...groups.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "pt-BR")),
    rows,
  };
}

// -----------------------------------------------------------------------------
// Motivos e anúncios do período (exibidos no Fechamento)
// -----------------------------------------------------------------------------

export type ReasonRow = {
  reasonId: string;
  name: string;
  family: ReasonFamily | null;
  current: number;
  comparison: number | null;
  sharePercent: number | null;
};

export type ListingRow = {
  mlbId: string;
  title: string | null;
  current: number;
  comparison: number | null;
  units: number;
  amount: number;
};

export type PeriodBreakdown = {
  reasonsByFamily: { family: ReasonFamily | null; rows: ReasonRow[] }[];
  listings: ListingRow[];
};

/**
 * Devoluções das vendas feitas no período (mesma regra do Fechamento: data da
 * venda original, sem as "encerradas sem devolução"), por motivo e por anúncio.
 */
export function buildPeriodBreakdown(payload: ReturnsPayload, filters: ReturnsFilters): PeriodBreakdown {
  const { window } = payload;
  const hasComparison = Boolean(window.comparisonStart && window.comparisonEnd);
  const reasons = reasonIndex(payload.reasons);
  const returned = payload.records.filter(
    (record) => matchesFilters(record, filters) && record.stage !== "encerrada_sem_devolucao",
  );
  const current = returned.filter((record) => inWindow(record.saleDate, window.currentStart, window.currentEnd));
  const comparison = hasComparison
    ? returned.filter((record) => inWindow(record.saleDate, window.comparisonStart, window.comparisonEnd))
    : [];

  return {
    reasonsByFamily: buildReasonRows(current, comparison, reasons, hasComparison),
    listings: buildListingRows(current, comparison, hasComparison),
  };
}

function buildReasonRows(
  current: ReturnRecord[],
  comparison: ReturnRecord[],
  reasons: Map<string, ReturnReason>,
  hasComparison: boolean,
): PeriodBreakdown["reasonsByFamily"] {
  const familyOf = (record: ReturnRecord): ReasonFamily | null =>
    record.family ?? (record.reasonId ? reasons.get(record.reasonId)?.family ?? null : null);
  const keyOf = (record: ReturnRecord) => record.reasonId ?? "sem_motivo";

  const families: (ReasonFamily | null)[] = ["PDD", "PNR", null];
  return families
    .map((family) => {
      const currentRows = current.filter((record) => familyOf(record) === family);
      const comparisonRows = comparison.filter((record) => familyOf(record) === family);
      const keys = new Set(currentRows.map(keyOf));
      const rows: ReasonRow[] = [...keys].map((key) => {
        const count = countBy(currentRows, (record) => keyOf(record) === key);
        return {
          reasonId: key,
          name: key === "sem_motivo" ? "Motivo não informado" : reasons.get(key)?.name ?? key,
          family,
          current: count,
          comparison: hasComparison ? countBy(comparisonRows, (record) => keyOf(record) === key) : null,
          sharePercent: currentRows.length ? (count / currentRows.length) * 100 : null,
        };
      });
      rows.sort((a, b) => b.current - a.current || a.name.localeCompare(b.name, "pt-BR"));
      return { family, rows: rows.slice(0, 10) };
    })
    .filter((group) => group.rows.length > 0 || group.family !== null);
}

function buildListingRows(
  current: ReturnRecord[],
  comparison: ReturnRecord[],
  hasComparison: boolean,
): ListingRow[] {
  const keyOf = (record: ReturnRecord) => record.mlbId ?? "sem_anuncio";
  const listings = new Map<string, ListingRow>();

  for (const record of current) {
    const key = keyOf(record);
    const row = listings.get(key) ?? {
      mlbId: key,
      title: record.listingTitle,
      current: 0,
      comparison: hasComparison ? 0 : null,
      units: 0,
      amount: 0,
    };
    row.current += 1;
    row.units += record.returnedUnits ?? 0;
    row.amount += record.returnedAmount ?? 0;
    row.title = row.title ?? record.listingTitle;
    listings.set(key, row);
  }

  if (hasComparison) {
    for (const record of comparison) {
      const row = listings.get(keyOf(record));
      if (row) row.comparison = (row.comparison ?? 0) + 1;
    }
  }

  return [...listings.values()]
    .sort((a, b) => b.current - a.current || b.amount - a.amount)
    .slice(0, 10);
}

// -----------------------------------------------------------------------------
// B. Fechamento (por data da venda original)
// -----------------------------------------------------------------------------

export type ClosingTotals = {
  paidUnits: number;
  paidRevenue: number;
  /** Devoluções consideradas: todas, exceto "encerrada sem devolução". */
  returnsCount: number;
  returnedUnits: number;
  returnedAmount: number;
  unknownUnitsCount: number;
  unknownAmountCount: number;
  unitsRatePercent: number | null;
  revenueRatePercent: number | null;
  shippingCost: number;
  shippingCostUnknownCount: number;
  operationalErrorCount: number;
  classifiedCount: number;
  unclassifiedCount: number;
  /** null = nenhuma devolução classificada ("aguardando classificação"). */
  operationalErrorPercent: number | null;
};

export type ClosingMonth = ClosingTotals & {
  month: string;
  firstDate: string;
  lastDate: string;
  /** O filtro de período cobre só parte do mês. */
  partial: boolean;
  /** Vendas recentes: devoluções ainda podem chegar. */
  provisional: boolean;
};

export type ClosingSummary = {
  months: ClosingMonth[];
  current: ClosingTotals;
  comparison: ClosingTotals | null;
  salesBaseAvailable: boolean;
};

function closingTotals(
  payload: ReturnsPayload,
  records: ReturnRecord[],
  reasons: Map<string, ReturnReason>,
  start: string,
  end: string,
): ClosingTotals {
  const sold = records.filter((record) => inWindow(record.saleDate, start, end));
  const returned = sold.filter((record) => record.stage !== "encerrada_sem_devolucao");
  const sales = payload.salesDaily.filter((day) => inWindow(day.saleDate, start, end));
  const paidUnits = sales.reduce((total, day) => total + day.paidUnits, 0);
  const paidRevenue = sales.reduce((total, day) => total + day.paidRevenue, 0);
  const returnedUnits = returned.reduce((total, record) => total + (record.returnedUnits ?? 0), 0);
  const returnedAmount = returned.reduce((total, record) => total + (record.returnedAmount ?? 0), 0);

  const classification = returned.map((record) =>
    record.reasonId ? reasons.get(record.reasonId)?.operationalError ?? null : null,
  );
  const operationalErrorCount = countBy(classification, (value) => value === true);
  const classifiedCount = countBy(classification, (value) => value !== null);

  return {
    paidUnits,
    paidRevenue,
    returnsCount: returned.length,
    returnedUnits,
    returnedAmount,
    unknownUnitsCount: countBy(returned, (record) => record.returnedUnits === null),
    unknownAmountCount: countBy(returned, (record) => record.returnedAmount === null),
    unitsRatePercent: payload.salesBaseAvailable && paidUnits > 0 ? (returnedUnits / paidUnits) * 100 : null,
    revenueRatePercent: payload.salesBaseAvailable && paidRevenue > 0 ? (returnedAmount / paidRevenue) * 100 : null,
    shippingCost: sold.reduce((total, record) => total + (record.returnShippingCost ?? 0), 0),
    shippingCostUnknownCount: countBy(sold, (record) => record.returnShippingCost === null),
    operationalErrorCount,
    classifiedCount,
    unclassifiedCount: returned.length - classifiedCount,
    operationalErrorPercent: classifiedCount > 0 ? (operationalErrorCount / classifiedCount) * 100 : null,
  };
}

function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function nextMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
}

export function buildClosing(
  payload: ReturnsPayload,
  filters: ReturnsFilters,
  provisionalWindowDays: number,
): ClosingSummary {
  const { window } = payload;
  const records = payload.records.filter((record) => matchesFilters(record, filters));
  const reasons = reasonIndex(payload.reasons);
  const today = saoPauloDate(payload.generatedAt) ?? window.currentEnd;
  const months: ClosingMonth[] = [];

  for (let month = window.currentStart.slice(0, 7); month <= window.currentEnd.slice(0, 7); month = nextMonth(month)) {
    const monthStart = `${month}-01`;
    const monthEnd = lastDayOfMonth(month);
    const firstDate = monthStart < window.currentStart ? window.currentStart : monthStart;
    const lastDate = monthEnd > window.currentEnd ? window.currentEnd : monthEnd;
    months.push({
      ...closingTotals(payload, records, reasons, firstDate, lastDate),
      month,
      firstDate,
      lastDate,
      partial: firstDate !== monthStart || lastDate !== monthEnd,
      provisional: daysBetween(lastDate, today) < provisionalWindowDays,
    });
  }

  return {
    months,
    current: closingTotals(payload, records, reasons, window.currentStart, window.currentEnd),
    comparison: window.comparisonStart && window.comparisonEnd
      ? closingTotals(payload, records, reasons, window.comparisonStart, window.comparisonEnd)
      : null,
    salesBaseAvailable: payload.salesBaseAvailable,
  };
}

// -----------------------------------------------------------------------------
// C. Alertas da Visão geral
// -----------------------------------------------------------------------------

export type ReturnsOverviewAlerts = {
  /** false enquanto não houver devoluções: os alertas ficam ocultos. */
  visible: boolean;
  stalledCount: number;
  /** Casos com prazo do vendedor vencido ou vencendo hoje. */
  deadlineDueCount: number;
  operationalError: {
    currentPercent: number;
    comparisonPercent: number;
    triggered: boolean;
  } | null;
};

export function buildOverviewAlerts(
  payload: ReturnsPayload,
  rules: QueueRules,
  increasePoints: number,
): ReturnsOverviewAlerts {
  if (payload.status !== "ready" || payload.records.length === 0) {
    return { visible: false, stalledCount: 0, deadlineDueCount: 0, operationalError: null };
  }

  const all: ReturnsFilters = { logistics: "all", family: "all" };
  const tracking = buildTracking(payload, all, rules);
  const closing = buildClosing(payload, all, 0);
  const current = closing.current.operationalErrorPercent;
  const comparison = closing.comparison?.operationalErrorPercent ?? null;

  return {
    visible: true,
    stalledCount: tracking.stalledCount,
    deadlineDueCount: tracking.deadlineDueCount,
    operationalError: current !== null && comparison !== null
      ? {
          currentPercent: current,
          comparisonPercent: comparison,
          triggered: current - comparison >= increasePoints,
        }
      : null,
  };
}
