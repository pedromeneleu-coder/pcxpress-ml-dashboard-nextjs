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

// -----------------------------------------------------------------------------
// A. Acompanhamento (situação de hoje; não depende do filtro de datas)
// -----------------------------------------------------------------------------

export type OpenStageSummary = {
  stage: ReturnStage;
  count: number;
  /** Paradas na etapa há mais dias que o limite configurado. */
  stalled: number;
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

export type TrackingSummary = {
  /** Uma entrada por etapa em aberto, na ordem do fluxo. */
  stages: OpenStageSummary[];
  totalOpen: number;
  /** Devoluções com status ainda não traduzido para uma etapa. */
  unmappedOpen: number;
  stalledCount: number;
  /** Ordenadas pelos dias na etapa atual, as mais antigas primeiro. */
  openRows: OpenReturnRow[];
};

function reasonIndex(reasons: ReturnReason[]): Map<string, ReturnReason> {
  return new Map(reasons.map((reason) => [reason.reasonId, reason]));
}

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

/**
 * Situação atual das devoluções em aberto. Ignora o período selecionado no
 * painel: uma devolução aberta há meses continua aparecendo até ser concluída.
 */
export function buildTracking(
  payload: ReturnsPayload,
  filters: ReturnsFilters,
  stalledDaysThreshold: number,
): TrackingSummary {
  const records = payload.records.filter((record) => matchesFilters(record, filters));
  const history = groupHistory(payload.history);
  const reasons = reasonIndex(payload.reasons);

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
    stages: OPEN_RETURN_STAGES.map((stage) => ({
      stage,
      count: countBy(openRows, (row) => row.stage === stage),
      stalled: countBy(openRows, (row) => row.stage === stage && row.stalled),
    })),
    totalOpen: openRows.length,
    unmappedOpen: countBy(openRows, (row) => row.stage === null),
    stalledCount: countBy(openRows, (row) => row.stalled),
    openRows,
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
