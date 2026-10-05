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
  ReturnStatusEvent,
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

/** Converte um instante em data AAAA-MM-DD no calendário de São Paulo. */
export function saoPauloDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? SAO_PAULO_DATE.format(new Date(time)) : null;
}

/** Último milissegundo de um dia AAAA-MM-DD em São Paulo (UTC−3, sem horário de verão). */
export function endOfSaoPauloDay(date: string): number {
  return Date.parse(`${date}T23:59:59.999-03:00`);
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

export function groupHistory(history: ReturnStatusEvent[]): Map<string, ReturnStatusEvent[]> {
  const grouped = new Map<string, ReturnStatusEvent[]>();

  for (const event of history) {
    if (!Number.isFinite(Date.parse(event.occurredAt))) continue;
    const events = grouped.get(event.claimId) ?? [];
    events.push(event);
    grouped.set(event.claimId, events);
  }

  for (const events of grouped.values()) {
    events.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  }

  return grouped;
}

function stageDateField(record: ReturnRecord, stage: ReturnStage | null): string | null {
  switch (stage) {
    case "aberta":
      return record.openedAt;
    case "enviada_pelo_comprador":
      return record.buyerShippedAt;
    case "recebida":
      return record.receivedAt;
    case "reembolsada":
      return record.refundedAt;
    default:
      return null;
  }
}

/** Momento em que a devolução entrou na etapa atual. */
export function stageSince(record: ReturnRecord, events: ReturnStatusEvent[] = []): string | null {
  if (record.stage) {
    let since: string | null = null;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (events[index].stage !== record.stage) break;
      since = events[index].occurredAt;
    }
    if (since) return since;
  }

  return stageDateField(record, record.stage) ?? record.lastUpdatedAt ?? record.openedAt;
}

export function daysInStage(
  record: ReturnRecord,
  events: ReturnStatusEvent[] | undefined,
  asOf: string,
): number | null {
  const since = stageSince(record, events);
  const sinceTime = since ? Date.parse(since) : Number.NaN;
  const asOfTime = Date.parse(asOf);
  if (!Number.isFinite(sinceTime) || !Number.isFinite(asOfTime)) return null;
  return Math.max(0, Math.floor((asOfTime - sinceTime) / DAY_MS));
}

function notAfter(value: string | null, cutoff: number): boolean {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) && time <= cutoff;
}

/**
 * Reconstrói em que etapa a devolução estava num instante passado, para
 * comparar a posição atual com o fim do período de comparação.
 * Retorna null quando a devolução ainda não existia ou a etapa é desconhecida.
 */
export function stageAt(
  record: ReturnRecord,
  events: ReturnStatusEvent[] = [],
  cutoff: number,
): ReturnStage | null {
  const firstSeen = record.openedAt ?? events[0]?.occurredAt ?? null;
  if (!notAfter(firstSeen, cutoff)) return null;

  const before = events.filter((event) => notAfter(event.occurredAt, cutoff));
  if (before.length) return before[before.length - 1].stage;

  if (record.stage === "encerrada_sem_devolucao" && notAfter(record.lastUpdatedAt, cutoff)) {
    return "encerrada_sem_devolucao";
  }
  if (notAfter(record.refundedAt, cutoff)) return "reembolsada";
  if (notAfter(record.receivedAt, cutoff)) return "recebida";
  if (notAfter(record.buyerShippedAt, cutoff)) return "enviada_pelo_comprador";
  return "aberta";
}

function refundDate(record: ReturnRecord): string | null {
  return saoPauloDate(
    record.refundedAt ?? (record.stage === "reembolsada" ? record.lastUpdatedAt : null),
  );
}

// -----------------------------------------------------------------------------
// A. Acompanhamento
// -----------------------------------------------------------------------------

export type StageCounter = {
  current: number;
  /** null quando não há período de comparação. */
  comparison: number | null;
};

export type OpenReturnRow = {
  claimId: string;
  orderId: string | null;
  mlbId: string | null;
  listingTitle: string | null;
  reasonId: string | null;
  reasonName: string | null;
  family: ReasonFamily | null;
  stage: ReturnStage | null;
  rawStatus: string | null;
  daysInStage: number | null;
  amount: number | null;
  stalled: boolean;
};

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

export type TrackingSummary = {
  counters: {
    open: StageCounter;
    inTransit: StageCounter;
    awaitingReview: StageCounter;
    refunded: StageCounter;
  };
  openedInPeriod: StageCounter;
  /** Data (AAAA-MM-DD) usada como "posição anterior" dos contadores atuais. */
  comparisonCutoffDate: string | null;
  funnel: { stage: ReturnStage; label: string; count: number }[];
  funnelUnmapped: number;
  funnelTotal: number;
  openRows: OpenReturnRow[];
  stalledCount: number;
  reasonsByFamily: { family: ReasonFamily | null; rows: ReasonRow[] }[];
  listings: ListingRow[];
};

function reasonIndex(reasons: ReturnReason[]): Map<string, ReturnReason> {
  return new Map(reasons.map((reason) => [reason.reasonId, reason]));
}

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

export function buildTracking(
  payload: ReturnsPayload,
  filters: ReturnsFilters,
  stalledDaysThreshold: number,
): TrackingSummary {
  const { window } = payload;
  const records = payload.records.filter((record) => matchesFilters(record, filters));
  const history = groupHistory(payload.history);
  const reasons = reasonIndex(payload.reasons);
  const hasComparison = Boolean(window.comparisonStart && window.comparisonEnd);
  const cutoff = hasComparison && window.comparisonEnd ? endOfSaoPauloDay(window.comparisonEnd) : null;

  const positionCounter = (stage: ReturnStage): StageCounter => ({
    current: countBy(records, (record) => record.stage === stage),
    comparison: cutoff === null
      ? null
      : countBy(records, (record) => stageAt(record, history.get(record.claimId), cutoff) === stage),
  });

  const periodCounter = (dateOf: (record: ReturnRecord) => string | null): StageCounter => ({
    current: countBy(records, (record) => inWindow(dateOf(record), window.currentStart, window.currentEnd)),
    comparison: hasComparison
      ? countBy(records, (record) => inWindow(dateOf(record), window.comparisonStart, window.comparisonEnd))
      : null,
  });

  const openedDate = (record: ReturnRecord) => saoPauloDate(record.openedAt);
  const openedCurrent = records.filter((record) => inWindow(openedDate(record), window.currentStart, window.currentEnd));
  const openedComparison = hasComparison
    ? records.filter((record) => inWindow(openedDate(record), window.comparisonStart, window.comparisonEnd))
    : [];

  const funnel = RETURN_STAGES.map((stage) => ({
    stage,
    label: RETURN_STAGE_LABELS[stage],
    count: countBy(openedCurrent, (record) => record.stage === stage),
  }));

  const openRows: OpenReturnRow[] = records
    .filter((record) => record.stage === null || OPEN_RETURN_STAGES.includes(record.stage))
    .map((record) => {
      const days = daysInStage(record, history.get(record.claimId), payload.generatedAt);
      const reason = record.reasonId ? reasons.get(record.reasonId) : undefined;
      return {
        claimId: record.claimId,
        orderId: record.orderId,
        mlbId: record.mlbId,
        listingTitle: record.listingTitle,
        reasonId: record.reasonId,
        reasonName: reason?.name ?? null,
        family: record.family ?? reason?.family ?? null,
        stage: record.stage,
        rawStatus: record.rawStatus,
        daysInStage: days,
        amount: record.returnedAmount,
        stalled: days !== null && days > stalledDaysThreshold,
      };
    })
    .sort((a, b) => (b.daysInStage ?? -1) - (a.daysInStage ?? -1));

  return {
    counters: {
      open: positionCounter("aberta"),
      inTransit: positionCounter("enviada_pelo_comprador"),
      awaitingReview: positionCounter("recebida"),
      refunded: periodCounter(refundDate),
    },
    openedInPeriod: { current: openedCurrent.length, comparison: hasComparison ? openedComparison.length : null },
    comparisonCutoffDate: hasComparison ? window.comparisonEnd : null,
    funnel,
    funnelUnmapped: countBy(openedCurrent, (record) => record.stage === null),
    funnelTotal: openedCurrent.length,
    openRows,
    stalledCount: countBy(openRows, (row) => row.stalled),
    reasonsByFamily: buildReasonRows(openedCurrent, openedComparison, reasons, hasComparison),
    listings: buildListingRows(openedCurrent, openedComparison, hasComparison),
  };
}

function buildReasonRows(
  current: ReturnRecord[],
  comparison: ReturnRecord[],
  reasons: Map<string, ReturnReason>,
  hasComparison: boolean,
): TrackingSummary["reasonsByFamily"] {
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
  operationalError: {
    currentPercent: number;
    comparisonPercent: number;
    triggered: boolean;
  } | null;
};

export function buildOverviewAlerts(
  payload: ReturnsPayload,
  stalledDaysThreshold: number,
  increasePoints: number,
): ReturnsOverviewAlerts {
  if (payload.status !== "ready" || payload.records.length === 0) {
    return { visible: false, stalledCount: 0, operationalError: null };
  }

  const all: ReturnsFilters = { logistics: "all", family: "all" };
  const tracking = buildTracking(payload, all, stalledDaysThreshold);
  const closing = buildClosing(payload, all, 0);
  const current = closing.current.operationalErrorPercent;
  const comparison = closing.comparison?.operationalErrorPercent ?? null;

  return {
    visible: true,
    stalledCount: tracking.stalledCount,
    operationalError: current !== null && comparison !== null
      ? {
          currentPercent: current,
          comparisonPercent: comparison,
          triggered: current - comparison >= increasePoints,
        }
      : null,
  };
}
