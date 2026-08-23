import {
  FALLBACK_DASHBOARD_DATA,
  type CatalogRow,
  type CancellationDailyPoint,
  type CancellationSummary,
  type DailyPerformancePoint,
  type DashboardData,
  type FulfillmentInventorySummary,
  type LogisticsDataHealth,
  type LogisticsDataHealthSource,
  type LogisticsEconomicsSummary,
  type LogisticsOperationalBacklogSummary,
  type LogisticsReconciliation,
  type LogisticsReconciliationCounts,
  type LogisticsSlaBreakdown,
  type LogisticsSlaPolicy,
  type LogisticsSlaSummary,
  type LogisticsStageSummary,
  type LogisticsTypeFilter,
  type ComparisonMode,
  type ProductComparison,
  type ProductPeriodMetrics,
  type SellerProfile,
  type SellerSnapshot,
  type TopProduct,
} from "@/app/dashboard-types";

type AccountRow = {
  id: string;
  account_name: string | null;
};

type CatalogRecord = {
  item_id: string | null;
  catalog_source: string | null;
  synced_at: string | null;
  last_updated: string | null;
};

type AccountSummaryRecord = {
  performance_date: string;
  items_count: number | null;
  fallback_items_count: number | null;
  visits: number | string | null;
  units_sold: number | string | null;
  orders_count: number | string | null;
  gross_amount: number | string | null;
  paid_gross_amount: number | string | null;
  avg_ticket: number | string | null;
  conversion_rate_percent: number | string | null;
};

type ItemPerformanceRecord = {
  performance_date: string;
  item_id: string | null;
  title: string | null;
  catalog_source: string | null;
  visits: number | string | null;
  units_sold: number | string | null;
  orders_count: number | string | null;
  gross_amount: number | string | null;
  conversion_rate_percent: number | string | null;
  available_quantity: number | null;
  status: string | null;
  thumbnail: string | null;
  permalink: string | null;
};

type SellerCurrentRecord = {
  seller_id: number | string | null;
  nickname: string | null;
  reputation_real_level: string | null;
  power_seller_status: string | null;
  protection_end_date: string | null;
  transactions_period: string | null;
  synced_at: string | null;
};

type SellerSnapshotRecord = {
  snapshot_date: string;
  seller_id: number | string | null;
  reputation_level_id: string | null;
  power_seller_status: string | null;
  transactions_total: number | string | null;
  transactions_completed: number | string | null;
  transactions_canceled: number | string | null;
  rating_positive: number | string | null;
  rating_neutral: number | string | null;
  rating_negative: number | string | null;
  sales_completed: number | string | null;
  claims_rate: number | string | null;
  claims_value: number | string | null;
  delayed_handling_time_rate: number | string | null;
  delayed_handling_time_value: number | string | null;
  cancellations_rate: number | string | null;
  cancellations_value: number | string | null;
  synced_at: string | null;
};

type CancellationRecord = {
  performance_date: string;
  orders_count: number | string | null;
  paid_orders_count: number | string | null;
  canceled_orders_count: number | string | null;
  gross_amount: number | string | null;
  paid_amount: number | string | null;
  canceled_amount: number | string | null;
  canceled_orders_percent: number | string | null;
  canceled_amount_percent: number | string | null;
  average_canceled_ticket: number | string | null;
  synced_at: string | null;
};

type LogisticsSlaRecord = {
  sale_date: string;
  logistic_type: string | null;
  event_name: string;
  target_source: string;
  measurement_quality: string;
  shipments_count: number | string | null;
  completed_count: number | string | null;
  on_time_count: number | string | null;
  late_count: number | string | null;
  pending_count: number | string | null;
  overdue_count: number | string | null;
  avg_elapsed_minutes: number | string | null;
  avg_breach_minutes: number | string | null;
  avg_breach_days: number | string | null;
  cancelled_count: number | string | null;
  terminal_without_completion_count: number | string | null;
};

type LogisticsEconomicsRecord = {
  sale_date: string;
  orders_count: number | string | null;
  paid_orders_count: number | string | null;
  orders_with_return: number | string | null;
  orders_with_return_cost: number | string | null;
  returned_units: number | string | null;
  paid_gross_revenue: number | string | null;
  outbound_shipping_cost: number | string | null;
  return_shipping_cost: number | string | null;
  total_shipping_cost: number | string | null;
};

type LogisticsReconciliationRecord = {
  sale_date: string | null;
  logistic_type: string | null;
  modality_code: string;
  reconciliation_reason_code: string;
  reconciliation_reason: string;
  reconciliation_order: number | string;
  reconciliation_scope: string;
  shipments_count: number | string | null;
  preparation_started_count: number | string | null;
  preparation_completed_count: number | string | null;
  handoff_observed_count: number | string | null;
  in_hub_observed_count: number | string | null;
  shipped_observed_count: number | string | null;
  out_for_delivery_observed_count: number | string | null;
  delivered_observed_count: number | string | null;
  on_time_kpi_included_count: number | string | null;
  included_in_dispatch_kpi_count: number | string | null;
  backlog_kpi_included_count: number | string | null;
  terminal_kpi_included_count: number | string | null;
  on_time_count: number | string | null;
  late_count: number | string | null;
  pending_count: number | string | null;
  overdue_count: number | string | null;
  cancelled_count: number | string | null;
  not_delivered_count: number | string | null;
  delivery_failed_count: number | string | null;
};

type FulfillmentInventoryRecord = {
  inventory_id: string;
  total_quantity: number | string | null;
  available_quantity: number | string | null;
  not_available_quantity: number | string | null;
  synced_at: string | null;
};

type LogisticsSlaPolicyRecord = {
  policy_name: string;
  logistic_type: string | null;
  start_event_code: string;
  end_event_code: string;
  target_minutes: number | string;
  valid_from: string;
  valid_to: string | null;
};

type LogisticsStageRecord = {
  sale_date: string;
  logistic_type: string | null;
  stage_order: number | string;
  stage_code: string;
  stage_name: string;
  start_event_code: string;
  end_event_code: string;
  stage_status: string;
  duration_minutes: number | string | null;
  target_minutes: number | string | null;
  above_target: boolean | null;
};

type LogisticsSyncRunRecord = {
  workflow_name: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

type SupabaseConfig = {
  url: string;
  key: string;
  schema: string;
  accountName: string;
};

const DEFAULT_ACCOUNT_NAME = "PC Express";
const DISPLAY_ACCOUNT_NAME = "PCXpress";
const DEFAULT_SCHEMA = "ml_dashboards";
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const PUNCTUALITY_MEASUREMENT_QUALITY = "prospective";
const BACKLOG_MEASUREMENT_QUALITIES = ["pending", "not_applicable"] as const;
const DISPATCH_EVENT_NAMES = ["Despacho ao Mercado Livre", "Despacho ao transportador"] as const;
const DELIVERY_EVENT_NAMES = ["Entrega ao comprador"] as const;
// Os tres workflows logisticos sao agendados diariamente. A margem de 36 horas
// absorve atrasos de agenda sem chamar uma execucao diaria normal de obsoleta.
const LOGISTICS_STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const LOGISTICS_WORKFLOW_NAMES = {
  shipments: "ml_dashboards_mvp5_shipments_sync",
  returns: "ml_dashboards_mvp6_claims_returns_sync",
  fulfillment: "ml_dashboards_mvp7_fulfillment_inventory_sync",
} as const;
const LOGISTICS_TYPE_VALUES: Record<Exclude<LogisticsTypeFilter, "all">, readonly string[]> = {
  fulfillment: ["fulfillment"],
  cross_docking: ["cross_docking"],
  flex: ["self_service", "flex"],
};

export type DashboardDateQuery = {
  periodDays?: number;
  currentStart?: string;
  currentEnd?: string;
  comparisonMode?: ComparisonMode;
  comparisonStart?: string;
  comparisonEnd?: string;
  logisticsType?: LogisticsTypeFilter;
};

type ResolvedDateSelection = DashboardData["dateSelection"];

type OptionalFetchResult<T> = {
  available: boolean;
  rows: T[];
};

function logisticsTypeValues(logisticsType: LogisticsTypeFilter): readonly string[] {
  return logisticsType === "all" ? [] : LOGISTICS_TYPE_VALUES[logisticsType];
}

function logisticsTypeQuery(logisticsType: LogisticsTypeFilter): Record<string, string> {
  const values = logisticsTypeValues(logisticsType);
  return values.length ? { logistic_type: `in.(${values.join(",")})` } : {};
}

function logisticsPolicyTypeQuery(logisticsType: LogisticsTypeFilter): Record<string, string> {
  const values = logisticsTypeValues(logisticsType);
  return values.length
    ? { or: `(logistic_type.is.null,logistic_type.in.(${values.join(",")}))` }
    : {};
}

function readConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
    schema: process.env.SUPABASE_SCHEMA ?? DEFAULT_SCHEMA,
    accountName: process.env.SUPABASE_ACCOUNT_NAME ?? DEFAULT_ACCOUNT_NAME,
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function startDateForPeriod(anchorDate: string, periodDays: number): string {
  const date = new Date(`${anchorDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - Math.max(periodDays - 1, 0));
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(firstDate: string, lastDate: string): number {
  const first = new Date(`${firstDate}T00:00:00Z`).getTime();
  const last = new Date(`${lastDate}T00:00:00Z`).getTime();
  return Math.floor((last - first) / 86400000) + 1;
}

function shiftMonthClamped(dateValue: string, months: number): string {
  const source = new Date(`${dateValue}T00:00:00Z`);
  const targetMonth = source.getUTCMonth() + months;
  const target = new Date(Date.UTC(source.getUTCFullYear(), targetMonth, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

function resolveDateSelection(query: DashboardDateQuery, anchorDate: string): ResolvedDateSelection {
  const requestedDays = query.periodDays ?? 30;
  const currentStart = query.currentStart ?? startDateForPeriod(anchorDate, requestedDays);
  const currentEnd = query.currentEnd ?? anchorDate;
  const currentDays = inclusiveDays(currentStart, currentEnd);
  const comparisonMode = query.comparisonMode ?? "previousPeriod";
  let comparisonStart: string | null = null;
  let comparisonEnd: string | null = null;
  let comparisonLabel = "Sem comparação";

  if (comparisonMode === "previousPeriod") {
    comparisonEnd = shiftDate(currentStart, -1);
    comparisonStart = startDateForPeriod(comparisonEnd, currentDays);
    comparisonLabel = `${currentDays} dias anteriores`;
  } else if (comparisonMode === "previousMonthEquivalent") {
    comparisonStart = shiftMonthClamped(currentStart, -1);
    comparisonEnd = shiftMonthClamped(currentEnd, -1);
    comparisonLabel = "Mesmo intervalo no mês anterior";
  } else if (comparisonMode === "previousMonthFull") {
    const previousMonthDate = shiftMonthClamped(currentStart.slice(0, 8) + "01", -1);
    comparisonStart = previousMonthDate.slice(0, 8) + "01";
    const monthAfter = shiftMonthClamped(comparisonStart, 1);
    comparisonEnd = shiftDate(monthAfter, -1);
    comparisonLabel = "Mês anterior completo";
  } else if (comparisonMode === "custom") {
    comparisonStart = query.comparisonStart ?? null;
    comparisonEnd = query.comparisonEnd ?? null;
    comparisonLabel = "Período personalizado";
  }

  const comparisonDays = comparisonStart && comparisonEnd
    ? inclusiveDays(comparisonStart, comparisonEnd)
    : 0;

  return {
    currentStart,
    currentEnd,
    currentDays,
    comparisonMode,
    comparisonStart,
    comparisonEnd,
    comparisonDays,
    comparisonLabel,
  };
}

function fallbackForQuery(query: DashboardDateQuery, message?: string): DashboardData {
  const anchorDate = query.currentEnd ?? FALLBACK_DASHBOARD_DATA.availableDateRange.lastDate ?? new Date().toISOString().slice(0, 10);
  const dateSelection = resolveDateSelection(query, anchorDate);
  const selectedLogisticsType = query.logisticsType ?? "all";
  const appliedLogisticsTypes = [...logisticsTypeValues(selectedLogisticsType)];
  const fulfillmentIncluded = selectedLogisticsType === "all" || selectedLogisticsType === "fulfillment";

  return {
    ...FALLBACK_DASHBOARD_DATA,
    periodDays: dateSelection.currentDays,
    message: message ?? FALLBACK_DASHBOARD_DATA.message,
    comparison: {
      ...FALLBACK_DASHBOARD_DATA.comparison,
      firstDate: dateSelection.comparisonStart,
      lastDate: dateSelection.comparisonEnd,
      periodDays: dateSelection.comparisonDays,
    },
    dateSelection,
    dailyPerformance: {
      ...FALLBACK_DASHBOARD_DATA.dailyPerformance,
      currentFirstDate: dateSelection.currentStart,
      currentLastDate: dateSelection.currentEnd,
      previousFirstDate: dateSelection.comparisonStart,
      previousLastDate: dateSelection.comparisonEnd,
    },
    logistics: {
      ...FALLBACK_DASHBOARD_DATA.logistics,
      selectedLogisticsType,
      metadata: {
        ...FALLBACK_DASHBOARD_DATA.logistics.metadata,
        logisticsType: {
          selected: selectedLogisticsType,
          appliedValues: appliedLogisticsTypes,
          observedValues: [],
        },
        economics: {
          ...FALLBACK_DASHBOARD_DATA.logistics.metadata.economics,
          scope: selectedLogisticsType === "all"
            ? "all_modalities"
            : "unavailable_for_selected_modality",
          available: false,
        },
        fulfillment: {
          ...FALLBACK_DASHBOARD_DATA.logistics.metadata.fulfillment,
          included: fulfillmentIncluded,
        },
        dataHealth: {
          ...FALLBACK_DASHBOARD_DATA.logistics.metadata.dataHealth,
          checkedAt: new Date().toISOString(),
          sources: FALLBACK_DASHBOARD_DATA.logistics.metadata.dataHealth.sources.map((source) => ({
            ...source,
          })),
        },
      },
    },
  };
}

function share(count: number, total: number): string {
  if (!total) {
    return "0,0%";
  }

  return `${((count / total) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

async function supabaseFetch<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      "accept-profile": config.schema,
      "content-profile": config.schema,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${response.status}: ${detail.slice(0, 240)}`);
  }

  return response.json() as Promise<T>;
}

async function fetchAll<T>(config: SupabaseConfig, path: string): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const page = await supabaseFetch<T[]>(config, path, {
      headers: { range: `${from}-${to}` },
    });

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function optionalFetchAll<T>(config: SupabaseConfig, path: string): Promise<T[]> {
  try {
    return await fetchAll<T>(config, path);
  } catch {
    // A visualizacao de Seller continua disponivel enquanto a nova view SQL
    // ainda nao foi aplicada no ambiente de producao.
    return [];
  }
}

async function optionalFetchAllWithAvailability<T>(
  config: SupabaseConfig,
  path: string,
): Promise<OptionalFetchResult<T>> {
  try {
    return { available: true, rows: await fetchAll<T>(config, path) };
  } catch {
    return { available: false, rows: [] };
  }
}

function validIsoTimestamp(value: string | null | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return null;
  }

  return value;
}

function newestSyncRun(
  records: LogisticsSyncRunRecord[],
  workflowName: string,
  status?: string,
): LogisticsSyncRunRecord | null {
  return records
    .filter((record) => record.workflow_name === workflowName && (!status || record.status === status))
    .sort((left, right) => {
      const leftAt = Date.parse(left.finished_at ?? left.started_at ?? "");
      const rightAt = Date.parse(right.finished_at ?? right.started_at ?? "");
      return (Number.isFinite(rightAt) ? rightAt : 0) - (Number.isFinite(leftAt) ? leftAt : 0);
    })[0] ?? null;
}

type DataHealthSourceInput = {
  key: LogisticsDataHealthSource["key"];
  label: string;
  available: boolean;
  hasData: boolean;
  checkedAt: string;
  workflowName: string;
  syncRuns: OptionalFetchResult<LogisticsSyncRunRecord>;
  fallbackUpdatedAt?: string | null;
  unavailableComponents?: string[];
  optionalUnavailableComponents?: string[];
};

function buildDataHealthSource(input: DataHealthSourceInput): LogisticsDataHealthSource {
  const latestRun = newestSyncRun(input.syncRuns.rows, input.workflowName);
  const latestSuccessfulRun = newestSyncRun(input.syncRuns.rows, input.workflowName, "success");
  const updatedAt = validIsoTimestamp(latestSuccessfulRun?.finished_at)
    ?? validIsoTimestamp(input.fallbackUpdatedAt);
  const unavailableComponents = input.unavailableComponents ?? [];
  const optionalUnavailableComponents = input.optionalUnavailableComponents ?? [];
  const optionalWarning = optionalUnavailableComponents.length
    ? ` Diagnósticos indisponíveis: ${optionalUnavailableComponents.join(", ")}.`
    : "";

  if (!input.available) {
    return {
      key: input.key,
      label: input.label,
      status: "unavailable",
      available: false,
      hasData: input.hasData,
      updatedAt,
      message: unavailableComponents.length
        ? `Consulta indisponível em: ${unavailableComponents.join(", ")}.`
        : "A fonte não pôde ser consultada.",
    };
  }

  if (!input.hasData && latestRun && latestRun.status !== "success") {
    return {
      key: input.key,
      label: input.label,
      status: "unknown",
      available: true,
      hasData: false,
      updatedAt,
      message: latestRun.status === "running"
        ? `A fonte ainda não tem registros e a sincronização mais recente está em execução.${optionalWarning}`
        : `A fonte ainda não tem registros e a sincronização mais recente não terminou com sucesso.${optionalWarning}`,
    };
  }

  if (!input.hasData) {
    return {
      key: input.key,
      label: input.label,
      status: "empty",
      available: true,
      hasData: false,
      updatedAt,
      message: `Fonte acessível, mas sem registros para o recorte consultado.${optionalWarning}`,
    };
  }

  const updatedAtMs = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const checkedAtMs = Date.parse(input.checkedAt);
  const stale = Number.isFinite(updatedAtMs)
    && Number.isFinite(checkedAtMs)
    && checkedAtMs - updatedAtMs > LOGISTICS_STALE_AFTER_MS;

  if (latestRun && latestRun.status !== "success") {
    return {
      key: input.key,
      label: input.label,
      status: stale ? "stale" : "unknown",
      available: true,
      hasData: true,
      updatedAt,
      message: latestRun.status === "running"
        ? `A sincronização mais recente ainda está em execução; os dados representam a última carga concluída.${optionalWarning}`
        : `A sincronização mais recente não terminou com sucesso; os dados representam a última carga concluída.${optionalWarning}`,
    };
  }

  if (!updatedAt) {
    return {
      key: input.key,
      label: input.label,
      status: "unknown",
      available: true,
      hasData: true,
      updatedAt: null,
      message: input.syncRuns.available
        ? `Dados disponíveis, mas sem execução concluída com timestamp confiável.${optionalWarning}`
        : `Dados disponíveis, mas o histórico de sincronizações não pôde ser consultado.${optionalWarning}`,
    };
  }

  if (stale) {
    return {
      key: input.key,
      label: input.label,
      status: "stale",
      available: true,
      hasData: true,
      updatedAt,
      message: `A última atualização confiável ultrapassou a janela esperada da carga diária.${optionalWarning}`,
    };
  }

  if (optionalUnavailableComponents.length) {
    return {
      key: input.key,
      label: input.label,
      status: "unknown",
      available: true,
      hasData: true,
      updatedAt,
      message: `A fonte principal está disponível, mas há diagnósticos auxiliares indisponíveis: ${optionalUnavailableComponents.join(", ")}.`,
    };
  }

  return {
    key: input.key,
    label: input.label,
    status: "healthy",
    available: true,
    hasData: true,
    updatedAt,
    message: input.syncRuns.available
      ? "Fonte disponível e sincronização diária concluída dentro da janela esperada."
      : "Fonte disponível; frescor confirmado pelo timestamp persistido nos dados.",
  };
}

function buildLogisticsDataHealth(
  checkedAt: string,
  sources: LogisticsDataHealthSource[],
): LogisticsDataHealth {
  const allUnavailable = sources.every((source) => source.status === "unavailable");
  const allHealthy = sources.every((source) => source.status === "healthy");

  return {
    overall: allUnavailable ? "unavailable" : allHealthy ? "healthy" : "attention",
    checkedAt,
    sources,
  };
}

function appendQuery(path: string, params: Record<string, string | number>): string {
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    urlParams.set(key, String(value));
  }

  return `${path}?${urlParams.toString()}`;
}

async function getAccount(config: SupabaseConfig): Promise<AccountRow | null> {
  const rows = await supabaseFetch<AccountRow[]>(
    config,
    appendQuery("accounts", {
      select: "id,account_name",
      account_name: `eq.${config.accountName}`,
      limit: 1,
    }),
  );

  return rows[0] ?? null;
}

function buildCatalog(records: CatalogRecord[]): DashboardData["catalog"] {
  const total = new Set(records.map((record) => record.item_id).filter(Boolean)).size;
  const current = new Set(
    records
      .filter((record) => record.catalog_source === "items_current")
      .map((record) => record.item_id)
      .filter(Boolean),
  ).size;
  const retained = new Set(
    records
      .filter((record) => record.catalog_source === "order_items_fallback")
      .map((record) => record.item_id)
      .filter(Boolean),
  ).size;
  const unknown = Math.max(total - current - retained, 0);

  const rows: CatalogRow[] = [
    {
      source: "Catálogo operacional",
      status: "Atualizado pela API",
      count: current,
      share: share(current, total),
      tone: "good",
    },
    {
      source: "Catálogo preservado",
      status: "Mantido para análise",
      count: retained,
      share: share(retained, total),
      tone: "warning",
    },
  ];

  if (unknown > 0) {
    rows.push({
      source: "Origem pendente",
      status: "Revisar classificação",
      count: unknown,
      share: share(unknown, total),
      tone: "neutral",
    });
  }

  return {
    total,
    current,
    retained,
    unknown,
    currentShare: total ? (current / total) * 100 : 0,
    retainedShare: total ? (retained / total) * 100 : 0,
    rows,
  };
}

function buildSales(records: AccountSummaryRecord[]): DashboardData["sales"] {
  const totals = records.reduce(
    (acc, record) => {
      acc.visits += toNumber(record.visits);
      acc.unitsSold += toNumber(record.units_sold);
      acc.ordersCount += toNumber(record.orders_count);
      acc.grossAmount += toNumber(record.gross_amount);
      acc.paidGrossAmount += toNumber(record.paid_gross_amount);
      acc.itemsCount = Math.max(acc.itemsCount ?? 0, record.items_count ?? 0);
      acc.fallbackItemsCount = Math.max(acc.fallbackItemsCount ?? 0, record.fallback_items_count ?? 0);
      return acc;
    },
    {
      visits: 0,
      unitsSold: 0,
      ordersCount: 0,
      grossAmount: 0,
      paidGrossAmount: 0,
      itemsCount: null as number | null,
      fallbackItemsCount: null as number | null,
    },
  );

  const dates = records.map((record) => record.performance_date).sort();
  const hasVisits = records.some((record) => toNullableNumber(record.visits) !== null);
  const conversionRatePercent = totals.visits > 0 ? (totals.ordersCount / totals.visits) * 100 : null;

  return {
    visits: hasVisits ? totals.visits : null,
    unitsSold: totals.unitsSold,
    ordersCount: totals.ordersCount,
    grossAmount: totals.grossAmount,
    paidGrossAmount: totals.paidGrossAmount,
    avgTicket: totals.ordersCount > 0 ? totals.grossAmount / totals.ordersCount : null,
    conversionRatePercent,
    itemsCount: totals.itemsCount,
    fallbackItemsCount: totals.fallbackItemsCount,
    firstPerformanceDate: dates[0] ?? null,
    lastPerformanceDate: dates.at(-1) ?? null,
  };
}

function buildDailyPerformance(records: AccountSummaryRecord[]): DailyPerformancePoint[] {
  return records
    .map((record) => {
      const visits = toNullableNumber(record.visits);
      const unitsSold = toNumber(record.units_sold);
      const ordersCount = toNumber(record.orders_count);
      const grossAmount = toNumber(record.gross_amount);

      return {
        date: record.performance_date,
        visits,
        unitsSold,
        ordersCount,
        grossAmount,
        avgTicket: ordersCount > 0 ? grossAmount / ordersCount : null,
        unitsPerOrder: ordersCount > 0 ? unitsSold / ordersCount : null,
        conversionRatePercent: visits && visits > 0 ? (ordersCount / visits) * 100 : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildSellerProfile(record: SellerCurrentRecord | undefined): SellerProfile {
  return {
    sellerId: toNullableNumber(record?.seller_id),
    nickname: record?.nickname ?? null,
    reputationRealLevel: record?.reputation_real_level ?? null,
    powerSellerStatus: record?.power_seller_status ?? null,
    protectionEndDate: record?.protection_end_date ?? null,
    transactionsPeriod: record?.transactions_period ?? null,
    syncedAt: record?.synced_at ?? null,
  };
}

function buildSellerSnapshot(record: SellerSnapshotRecord): SellerSnapshot {
  return {
    snapshotDate: record.snapshot_date,
    sellerId: toNullableNumber(record.seller_id),
    reputationLevelId: record.reputation_level_id,
    powerSellerStatus: record.power_seller_status,
    transactionsPeriod: null,
    transactionsTotal: toNullableNumber(record.transactions_total),
    transactionsCompleted: toNullableNumber(record.transactions_completed),
    transactionsCanceled: toNullableNumber(record.transactions_canceled),
    ratingPositive: toNullableNumber(record.rating_positive),
    ratingNeutral: toNullableNumber(record.rating_neutral),
    ratingNegative: toNullableNumber(record.rating_negative),
    salesCompleted: toNullableNumber(record.sales_completed),
    claimsRate: toNullableNumber(record.claims_rate),
    claimsValue: toNullableNumber(record.claims_value),
    delayedHandlingTimeRate: toNullableNumber(record.delayed_handling_time_rate),
    delayedHandlingTimeValue: toNullableNumber(record.delayed_handling_time_value),
    cancellationsRate: toNullableNumber(record.cancellations_rate),
    cancellationsValue: toNullableNumber(record.cancellations_value),
    syncedAt: record.synced_at,
  };
}

function latestSnapshotInRange(
  snapshots: SellerSnapshot[],
  firstDate: string | null,
  lastDate: string | null,
): SellerSnapshot | null {
  if (!firstDate || !lastDate) {
    return null;
  }

  return snapshots
    .filter((snapshot) => snapshot.snapshotDate >= firstDate && snapshot.snapshotDate <= lastDate)
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
    .at(-1) ?? null;
}

function buildCancellationSummary(records: CancellationRecord[]): CancellationSummary {
  const totals = records.reduce(
    (acc, record) => {
      acc.ordersCount += toNumber(record.orders_count);
      acc.paidOrdersCount += toNumber(record.paid_orders_count);
      acc.canceledOrdersCount += toNumber(record.canceled_orders_count);
      acc.grossAmount += toNumber(record.gross_amount);
      acc.paidAmount += toNumber(record.paid_amount);
      acc.canceledAmount += toNumber(record.canceled_amount);
      return acc;
    },
    {
      ordersCount: 0,
      paidOrdersCount: 0,
      canceledOrdersCount: 0,
      grossAmount: 0,
      paidAmount: 0,
      canceledAmount: 0,
    },
  );

  return {
    ...totals,
    canceledOrdersPercent:
      totals.ordersCount > 0 ? (totals.canceledOrdersCount / totals.ordersCount) * 100 : null,
    canceledAmountPercent:
      totals.grossAmount > 0 ? (totals.canceledAmount / totals.grossAmount) * 100 : null,
    averageCanceledTicket:
      totals.canceledOrdersCount > 0 ? totals.canceledAmount / totals.canceledOrdersCount : null,
  };
}

function buildCancellationDaily(records: CancellationRecord[]): CancellationDailyPoint[] {
  return records
    .map((record) => ({
      date: record.performance_date,
      ordersCount: toNumber(record.orders_count),
      paidOrdersCount: toNumber(record.paid_orders_count),
      canceledOrdersCount: toNumber(record.canceled_orders_count),
      grossAmount: toNumber(record.gross_amount),
      paidAmount: toNumber(record.paid_amount),
      canceledAmount: toNumber(record.canceled_amount),
      canceledOrdersPercent: toNullableNumber(record.canceled_orders_percent),
      canceledAmountPercent: toNullableNumber(record.canceled_amount_percent),
      averageCanceledTicket: toNullableNumber(record.average_canceled_ticket),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildLogisticsSlaSummary(records: LogisticsSlaRecord[]): LogisticsSlaSummary {
  const totals = records.reduce(
    (acc, record) => {
      const lateCount = toNumber(record.late_count);
      acc.shipmentsCount += toNumber(record.shipments_count);
      acc.completedCount += toNumber(record.completed_count);
      acc.onTimeCount += toNumber(record.on_time_count);
      acc.lateCount += lateCount;
      acc.pendingCount += toNumber(record.pending_count);
      acc.overdueCount += toNumber(record.overdue_count);
      acc.cancelledCount += toNumber(record.cancelled_count);
      acc.terminalWithoutCompletionCount += toNumber(record.terminal_without_completion_count);
      acc.elapsedMinutesTotal += toNumber(record.avg_elapsed_minutes) * toNumber(record.completed_count);
      acc.breachMinutesTotal += toNumber(record.avg_breach_minutes) * lateCount;
      acc.breachDaysTotal += toNumber(record.avg_breach_days) * lateCount;
      return acc;
    },
    {
      shipmentsCount: 0,
      completedCount: 0,
      onTimeCount: 0,
      lateCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      cancelledCount: 0,
      terminalWithoutCompletionCount: 0,
      elapsedMinutesTotal: 0,
      breachMinutesTotal: 0,
      breachDaysTotal: 0,
    },
  );

  return {
    shipmentsCount: totals.shipmentsCount,
    completedCount: totals.completedCount,
    onTimeCount: totals.onTimeCount,
    lateCount: totals.lateCount,
    pendingCount: totals.pendingCount,
    overdueCount: totals.overdueCount,
    cancelledCount: totals.cancelledCount,
    terminalWithoutCompletionCount: totals.terminalWithoutCompletionCount,
    onTimePercent: totals.completedCount > 0 ? (totals.onTimeCount / totals.completedCount) * 100 : null,
    averageElapsedMinutes: totals.completedCount > 0 ? totals.elapsedMinutesTotal / totals.completedCount : null,
    averageBreachMinutes: totals.lateCount > 0 ? totals.breachMinutesTotal / totals.lateCount : null,
    averageBreachDays: totals.lateCount > 0 ? totals.breachDaysTotal / totals.lateCount : null,
  };
}

function buildOperationalBacklogSummary(records: LogisticsSlaRecord[]): LogisticsOperationalBacklogSummary {
  return records.reduce<LogisticsOperationalBacklogSummary>(
    (acc, record) => {
      acc.shipmentsCount += toNumber(record.shipments_count);
      acc.pendingCount += toNumber(record.pending_count);
      acc.overdueCount += toNumber(record.overdue_count);
      acc.cancelledCount += toNumber(record.cancelled_count);
      acc.terminalWithoutCompletionCount += toNumber(record.terminal_without_completion_count);
      return acc;
    },
    {
      shipmentsCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      cancelledCount: 0,
      terminalWithoutCompletionCount: 0,
    },
  );
}

function withOperationalBacklog(
  punctuality: LogisticsSlaSummary,
  backlog: LogisticsOperationalBacklogSummary,
): LogisticsSlaSummary {
  return {
    ...punctuality,
    shipmentsCount: punctuality.shipmentsCount + backlog.shipmentsCount,
    pendingCount: backlog.pendingCount,
    overdueCount: backlog.overdueCount,
    cancelledCount: backlog.cancelledCount,
    terminalWithoutCompletionCount: backlog.terminalWithoutCompletionCount,
  };
}

function completedOutsideProspective(records: LogisticsSlaRecord[]): number {
  return records
    .filter((record) => record.measurement_quality !== PUNCTUALITY_MEASUREMENT_QUALITY)
    .reduce((total, record) => total + toNumber(record.completed_count), 0);
}

function emptyReconciliationCounts(): LogisticsReconciliationCounts {
  return {
    shipmentsCount: 0,
    preparationStartedCount: 0,
    preparationCompletedCount: 0,
    handoffObservedCount: 0,
    inHubObservedCount: 0,
    shippedObservedCount: 0,
    outForDeliveryObservedCount: 0,
    deliveredObservedCount: 0,
    onTimeKpiIncludedCount: 0,
    includedInDispatchKpiCount: 0,
    backlogKpiIncludedCount: 0,
    terminalKpiIncludedCount: 0,
    onTimeCount: 0,
    lateCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    cancelledCount: 0,
    notDeliveredCount: 0,
    deliveryFailedCount: 0,
  };
}

function addReconciliationRecord(
  counts: LogisticsReconciliationCounts,
  record: LogisticsReconciliationRecord,
): LogisticsReconciliationCounts {
  counts.shipmentsCount += toNumber(record.shipments_count);
  counts.preparationStartedCount += toNumber(record.preparation_started_count);
  counts.preparationCompletedCount += toNumber(record.preparation_completed_count);
  counts.handoffObservedCount += toNumber(record.handoff_observed_count);
  counts.inHubObservedCount += toNumber(record.in_hub_observed_count);
  counts.shippedObservedCount += toNumber(record.shipped_observed_count);
  counts.outForDeliveryObservedCount += toNumber(record.out_for_delivery_observed_count);
  counts.deliveredObservedCount += toNumber(record.delivered_observed_count);
  counts.onTimeKpiIncludedCount += toNumber(record.on_time_kpi_included_count);
  counts.includedInDispatchKpiCount += toNumber(record.included_in_dispatch_kpi_count);
  counts.backlogKpiIncludedCount += toNumber(record.backlog_kpi_included_count);
  counts.terminalKpiIncludedCount += toNumber(record.terminal_kpi_included_count);
  counts.onTimeCount += toNumber(record.on_time_count);
  counts.lateCount += toNumber(record.late_count);
  counts.pendingCount += toNumber(record.pending_count);
  counts.overdueCount += toNumber(record.overdue_count);
  counts.cancelledCount += toNumber(record.cancelled_count);
  counts.notDeliveredCount += toNumber(record.not_delivered_count);
  counts.deliveryFailedCount += toNumber(record.delivery_failed_count);
  return counts;
}

function reconciliationCounts(records: LogisticsReconciliationRecord[]): LogisticsReconciliationCounts {
  return records.reduce(addReconciliationRecord, emptyReconciliationCounts());
}

function percentOf(count: number, total: number): number | null {
  return total > 0 ? (count / total) * 100 : null;
}

function buildLogisticsReconciliation(
  result: OptionalFetchResult<LogisticsReconciliationRecord>,
): LogisticsReconciliation {
  const basis = {
    direction: "outbound" as const,
    slaEvent: "dispatch" as const,
    dateField: "sale_date" as const,
  };

  if (!result.available) {
    return {
      available: false,
      hasData: false,
      sourceRows: null,
      shipmentsCount: 0,
      preparationStartedCount: 0,
      preparationCompletedCount: 0,
      includedInDispatchKpiCount: 0,
      basis,
      totals: null,
      reasons: [],
    };
  }

  const totalCounts = reconciliationCounts(result.rows);
  const excludedCount = Math.max(
    totalCounts.shipmentsCount -
      totalCounts.includedInDispatchKpiCount -
      totalCounts.backlogKpiIncludedCount -
      totalCounts.terminalKpiIncludedCount,
    0,
  );
  const totals = {
    ...totalCounts,
    excludedCount,
    dispatchKpiInclusionPercent: percentOf(
      totalCounts.includedInDispatchKpiCount,
      totalCounts.shipmentsCount,
    ),
    backlogPercent: percentOf(totalCounts.backlogKpiIncludedCount, totalCounts.shipmentsCount),
    terminalPercent: percentOf(totalCounts.terminalKpiIncludedCount, totalCounts.shipmentsCount),
    excludedPercent: percentOf(excludedCount, totalCounts.shipmentsCount),
  };
  const modalityTotals = new Map<string, number>();
  const groups = new Map<
    string,
    {
      logisticType: string | null;
      modalityCode: string;
      reasonCode: string;
      reason: string;
      reconciliationOrder: number;
      scope: string;
      records: LogisticsReconciliationRecord[];
    }
  >();

  for (const record of result.rows) {
    const modalityKey = JSON.stringify([record.logistic_type, record.modality_code]);
    modalityTotals.set(
      modalityKey,
      (modalityTotals.get(modalityKey) ?? 0) + toNumber(record.shipments_count),
    );

    const groupKey = JSON.stringify([
      record.logistic_type,
      record.modality_code,
      record.reconciliation_reason_code,
    ]);
    const group = groups.get(groupKey) ?? {
      logisticType: record.logistic_type,
      modalityCode: record.modality_code,
      reasonCode: record.reconciliation_reason_code,
      reason: record.reconciliation_reason,
      reconciliationOrder: toNumber(record.reconciliation_order),
      scope: record.reconciliation_scope,
      records: [],
    };
    group.records.push(record);
    groups.set(groupKey, group);
  }

  const reasons = Array.from(groups.values())
    .map((group) => {
      const counts = reconciliationCounts(group.records);
      const modalityTotal = modalityTotals.get(
        JSON.stringify([group.logisticType, group.modalityCode]),
      ) ?? 0;

      return {
        logisticType: group.logisticType,
        modalityCode: group.modalityCode,
        reasonCode: group.reasonCode,
        reason: group.reason,
        reconciliationOrder: group.reconciliationOrder,
        scope: group.scope,
        ...counts,
        shareOfTotalPercent: percentOf(counts.shipmentsCount, totalCounts.shipmentsCount),
        shareWithinModalityPercent: percentOf(counts.shipmentsCount, modalityTotal),
      };
    })
    .sort(
      (a, b) =>
        (a.logisticType ?? "").localeCompare(b.logisticType ?? "") ||
        a.modalityCode.localeCompare(b.modalityCode) ||
        a.reconciliationOrder - b.reconciliationOrder ||
        a.reasonCode.localeCompare(b.reasonCode),
    );

  return {
    available: true,
    hasData: totalCounts.shipmentsCount > 0,
    sourceRows: result.rows.length,
    shipmentsCount: totalCounts.shipmentsCount,
    preparationStartedCount: totalCounts.preparationStartedCount,
    preparationCompletedCount: totalCounts.preparationCompletedCount,
    includedInDispatchKpiCount: totalCounts.includedInDispatchKpiCount,
    basis,
    totals,
    reasons,
  };
}

function buildLogisticsSlaBreakdown(records: LogisticsSlaRecord[]): LogisticsSlaBreakdown[] {
  const groups = new Map<string, { key: Omit<LogisticsSlaBreakdown, keyof LogisticsSlaSummary>; records: LogisticsSlaRecord[] }>();

  for (const record of records) {
    const key = [record.event_name, record.logistic_type ?? "Sem modalidade", record.target_source, record.measurement_quality].join("|");
    const group = groups.get(key) ?? {
      key: {
        eventName: record.event_name,
        logisticType: record.logistic_type,
        targetSource: record.target_source,
        measurementQuality: record.measurement_quality,
      },
      records: [],
    };
    group.records.push(record);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group.key, ...buildLogisticsSlaSummary(group.records) }))
    .sort((a, b) => b.shipmentsCount - a.shipmentsCount || a.eventName.localeCompare(b.eventName));
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function buildLogisticsStages(records: LogisticsStageRecord[]): LogisticsStageSummary[] {
  const groups = new Map<string, LogisticsStageRecord[]>();

  for (const record of records) {
    const key = [record.logistic_type ?? "Sem modalidade", record.stage_code].join("|");
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const completedDurations = group
        .filter((record) => record.stage_status === "completed")
        .map((record) => toNullableNumber(record.duration_minutes))
        .filter((value): value is number => value !== null);
      const targets = new Set(
        group
          .map((record) => toNullableNumber(record.target_minutes))
          .filter((value): value is number => value !== null),
      );
      const averageDurationMinutes = completedDurations.length
        ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
        : null;

      return {
        logisticType: first.logistic_type,
        stageOrder: toNumber(first.stage_order),
        stageCode: first.stage_code,
        stageName: first.stage_name,
        startEventCode: first.start_event_code,
        endEventCode: first.end_event_code,
        startedCount: group.length,
        completedCount: completedDurations.length,
        inProgressCount: group.filter((record) => record.stage_status === "in_progress").length,
        terminalWithoutEventCount: group.filter((record) => record.stage_status === "terminal_without_event").length,
        invalidSequenceCount: group.filter((record) => record.stage_status === "invalid_sequence").length,
        averageDurationMinutes,
        medianDurationMinutes: percentile(completedDurations, 0.5),
        p90DurationMinutes: percentile(completedDurations, 0.9),
        coveragePercent: group.length ? (completedDurations.length / group.length) * 100 : null,
        targetMinutes: targets.size === 1 ? Array.from(targets)[0] : null,
        aboveTargetCount: group.filter((record) => record.above_target === true).length,
      };
    })
    .sort(
      (a, b) =>
        a.stageOrder - b.stageOrder ||
        (a.logisticType ?? "").localeCompare(b.logisticType ?? ""),
    );
}

function buildLogisticsEconomics(records: LogisticsEconomicsRecord[]): LogisticsEconomicsSummary {
  const totals = records.reduce(
    (acc, record) => {
      acc.ordersCount += toNumber(record.orders_count);
      acc.paidOrdersCount += toNumber(record.paid_orders_count);
      acc.ordersWithReturn += toNumber(record.orders_with_return);
      acc.ordersWithReturnCost += toNumber(record.orders_with_return_cost);
      acc.returnedUnits += toNumber(record.returned_units);
      acc.paidGrossRevenue += toNumber(record.paid_gross_revenue);
      acc.outboundShippingCost += toNumber(record.outbound_shipping_cost);
      acc.returnShippingCost += toNumber(record.return_shipping_cost);
      acc.totalShippingCost += toNumber(record.total_shipping_cost);
      return acc;
    },
    {
      ordersCount: 0,
      paidOrdersCount: 0,
      ordersWithReturn: 0,
      ordersWithReturnCost: 0,
      returnedUnits: 0,
      paidGrossRevenue: 0,
      outboundShippingCost: 0,
      returnShippingCost: 0,
      totalShippingCost: 0,
    },
  );

  return {
    ...totals,
    returnCostOverGrossPercent: totals.paidGrossRevenue > 0
      ? (totals.returnShippingCost / totals.paidGrossRevenue) * 100
      : null,
    totalShippingCostOverGrossPercent: totals.paidGrossRevenue > 0
      ? (totals.totalShippingCost / totals.paidGrossRevenue) * 100
      : null,
  };
}

function buildFulfillmentInventory(records: FulfillmentInventoryRecord[]): FulfillmentInventorySummary {
  const totals = records.reduce(
    (acc, record) => {
      acc.totalQuantity += toNumber(record.total_quantity);
      acc.availableQuantity += toNumber(record.available_quantity);
      acc.notAvailableQuantity += toNumber(record.not_available_quantity);
      return acc;
    },
    { totalQuantity: 0, availableQuantity: 0, notAvailableQuantity: 0 },
  );
  const timestamps = records.map((record) => record.synced_at).filter((value): value is string => Boolean(value)).sort();
  const inventoryCount = new Set(records.map((record) => record.inventory_id)).size;

  return {
    ...totals,
    availablePercent: totals.totalQuantity > 0 ? (totals.availableQuantity / totals.totalQuantity) * 100 : null,
    inventoryCount,
    // Alias temporario para clientes ainda publicados com o contrato anterior.
    skuCount: inventoryCount,
    syncedAt: timestamps.at(-1) ?? null,
  };
}

function buildLogisticsPolicies(records: LogisticsSlaPolicyRecord[]): LogisticsSlaPolicy[] {
  return records.map((record) => ({
    name: record.policy_name,
    logisticType: record.logistic_type,
    startEventCode: record.start_event_code,
    endEventCode: record.end_event_code,
    targetMinutes: toNumber(record.target_minutes),
  }));
}

function aggregateProducts(records: ItemPerformanceRecord[]): TopProduct[] {
  const byItem = new Map<string, TopProduct>();

  for (const record of records) {
    if (!record.item_id) {
      continue;
    }

    const current = byItem.get(record.item_id) ?? {
      itemId: record.item_id,
      title: record.title ?? record.item_id,
      catalogSource: record.catalog_source ?? "unknown",
      visits: 0,
      unitsSold: 0,
      ordersCount: 0,
      grossAmount: 0,
      conversionRatePercent: null,
      availableQuantity: record.available_quantity,
      status: record.status,
      thumbnail: record.thumbnail,
      permalink: record.permalink,
    };

    current.visits += toNumber(record.visits);
    current.unitsSold += toNumber(record.units_sold);
    current.ordersCount += toNumber(record.orders_count);
    current.grossAmount += toNumber(record.gross_amount);
    current.conversionRatePercent =
      current.visits > 0 ? (current.ordersCount / current.visits) * 100 : null;

    byItem.set(record.item_id, current);
  }

  return Array.from(byItem.values());
}

function buildTopProducts(records: ItemPerformanceRecord[]): TopProduct[] {
  return aggregateProducts(records)
    .sort((a, b) => b.grossAmount - a.grossAmount)
    .slice(0, 12);
}

function toProductMetrics(product: TopProduct | undefined): ProductPeriodMetrics {
  return {
    visits: product?.visits ?? 0,
    unitsSold: product?.unitsSold ?? 0,
    ordersCount: product?.ordersCount ?? 0,
    grossAmount: product?.grossAmount ?? 0,
    conversionRatePercent: product?.conversionRatePercent ?? null,
  };
}

function buildProductComparisons(
  currentRecords: ItemPerformanceRecord[],
  previousRecords: ItemPerformanceRecord[],
): ProductComparison[] {
  const currentProducts = aggregateProducts(currentRecords);
  const previousProducts = aggregateProducts(previousRecords);
  const currentByItem = new Map(currentProducts.map((product) => [product.itemId, product]));
  const previousByItem = new Map(previousProducts.map((product) => [product.itemId, product]));
  const currentRanks = new Map(
    [...currentProducts]
      .sort((a, b) => b.grossAmount - a.grossAmount)
      .filter((product) => product.grossAmount > 0)
      .map((product, index) => [product.itemId, index + 1]),
  );
  const previousRanks = new Map(
    [...previousProducts]
      .sort((a, b) => b.grossAmount - a.grossAmount)
      .filter((product) => product.grossAmount > 0)
      .map((product, index) => [product.itemId, index + 1]),
  );
  const itemIds = new Set([...currentByItem.keys(), ...previousByItem.keys()]);

  return Array.from(itemIds)
    .map((itemId) => {
      const current = currentByItem.get(itemId);
      const previous = previousByItem.get(itemId);
      const product = current ?? previous;

      return {
        itemId,
        title: product?.title ?? itemId,
        catalogSource: product?.catalogSource ?? "unknown",
        current: toProductMetrics(current),
        previous: toProductMetrics(previous),
        currentRank: currentRanks.get(itemId) ?? null,
        previousRank: previousRanks.get(itemId) ?? null,
      };
    })
    .sort(
      (a, b) =>
        Math.max(b.current.grossAmount, b.previous.grossAmount) -
        Math.max(a.current.grossAmount, a.previous.grossAmount),
    )
    .slice(0, 50);
}

export async function getDashboardData(query: DashboardDateQuery = {}): Promise<DashboardData> {
  const config = readConfig();
  const selectedLogisticsType = query.logisticsType ?? "all";

  if (!config) {
    return fallbackForQuery(query);
  }

  try {
    const account = await getAccount(config);

    if (!account) {
      return fallbackForQuery(query, `Conta "${config.accountName}" não encontrada no Supabase.`);
    }

    const accountFilter = `eq.${account.id}`;
    const [latestSummary, earliestSummary] = await Promise.all([
      supabaseFetch<Pick<AccountSummaryRecord, "performance_date">[]>(
        config,
        appendQuery("dashboard_daily_account_summary", {
          select: "performance_date",
          account_id: accountFilter,
          order: "performance_date.desc",
          limit: 1,
        }),
      ),
      supabaseFetch<Pick<AccountSummaryRecord, "performance_date">[]>(
        config,
        appendQuery("dashboard_daily_account_summary", {
          select: "performance_date",
          account_id: accountFilter,
          order: "performance_date.asc",
          limit: 1,
        }),
      ),
    ]);
    const anchorDate = latestSummary[0]?.performance_date ?? new Date().toISOString().slice(0, 10);
    const dateSelection = resolveDateSelection(query, anchorDate);
    const hasComparison = Boolean(dateSelection.comparisonStart && dateSelection.comparisonEnd);
    const snapshotCutoff = [dateSelection.currentEnd, dateSelection.comparisonEnd]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? dateSelection.currentEnd;
    const periodFilter: Record<string, string> = hasComparison
      ? {
          or: `(and(performance_date.gte.${dateSelection.currentStart},performance_date.lte.${dateSelection.currentEnd}),and(performance_date.gte.${dateSelection.comparisonStart},performance_date.lte.${dateSelection.comparisonEnd}))`,
        }
      : {
          and: `(performance_date.gte.${dateSelection.currentStart},performance_date.lte.${dateSelection.currentEnd})`,
        };
    const logisticsPeriodFilter: Record<string, string> = hasComparison
      ? {
          or: `(and(sale_date.gte.${dateSelection.currentStart},sale_date.lte.${dateSelection.currentEnd}),and(sale_date.gte.${dateSelection.comparisonStart},sale_date.lte.${dateSelection.comparisonEnd}))`,
        }
      : {
          and: `(sale_date.gte.${dateSelection.currentStart},sale_date.lte.${dateSelection.currentEnd})`,
        };
    const reconciliationPeriodFilter = {
      and: `(sale_date.gte.${dateSelection.currentStart},sale_date.lte.${dateSelection.currentEnd})`,
    };
    const selectedLogisticsTypeQuery = logisticsTypeQuery(selectedLogisticsType);
    const selectedLogisticsPolicyTypeQuery = logisticsPolicyTypeQuery(selectedLogisticsType);
    const [
      catalogRecords,
      summaryRecords,
      performanceRecords,
      sellerCurrentRecords,
      sellerSnapshotRecords,
      cancellationRecords,
      logisticsSlaResult,
      logisticsReconciliationResult,
      operationalLogisticsSlaResult,
      logisticsEconomicsResult,
      fulfillmentResult,
      logisticsPolicyResult,
      logisticsStageResult,
      logisticsSyncRunsResult,
    ] = await Promise.all([
      fetchAll<CatalogRecord>(
        config,
        appendQuery("dashboard_item_catalog", {
          select: "item_id,catalog_source,synced_at,last_updated",
          account_id: accountFilter,
        }),
      ),
      fetchAll<AccountSummaryRecord>(
        config,
        appendQuery("dashboard_daily_account_summary", {
          select:
            "performance_date,items_count,fallback_items_count,visits,units_sold,orders_count,gross_amount,paid_gross_amount,avg_ticket,conversion_rate_percent",
          account_id: accountFilter,
          ...periodFilter,
          order: "performance_date.asc",
        }),
      ),
      fetchAll<ItemPerformanceRecord>(
        config,
        appendQuery("dashboard_daily_item_performance", {
          select:
            "performance_date,item_id,title,catalog_source,visits,units_sold,orders_count,gross_amount,conversion_rate_percent,available_quantity,status,thumbnail,permalink",
          account_id: accountFilter,
          ...periodFilter,
        }),
      ),
      optionalFetchAll<SellerCurrentRecord>(
        config,
        appendQuery("sellers_current", {
          select:
            "seller_id,nickname,reputation_real_level,power_seller_status,protection_end_date,transactions_period,synced_at",
          account_id: accountFilter,
          order: "synced_at.desc",
          limit: 1,
        }),
      ),
      optionalFetchAll<SellerSnapshotRecord>(
        config,
        appendQuery("seller_daily_snapshots", {
          select:
            "snapshot_date,seller_id,reputation_level_id,power_seller_status,transactions_total,transactions_completed,transactions_canceled,rating_positive,rating_neutral,rating_negative,sales_completed,claims_rate,claims_value,delayed_handling_time_rate,delayed_handling_time_value,cancellations_rate,cancellations_value,synced_at",
          account_id: accountFilter,
          snapshot_date: `lte.${snapshotCutoff}`,
          order: "snapshot_date.asc",
        }),
      ),
      optionalFetchAll<CancellationRecord>(
        config,
        appendQuery("dashboard_daily_order_impact", {
          select:
            "performance_date,orders_count,paid_orders_count,canceled_orders_count,gross_amount,paid_amount,canceled_amount,canceled_orders_percent,canceled_amount_percent,average_canceled_ticket,synced_at",
          account_id: accountFilter,
          ...periodFilter,
          order: "performance_date.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsSlaRecord>(
        config,
        appendQuery("dashboard_daily_logistics_sla", {
          select:
            "sale_date,logistic_type,event_name,target_source,measurement_quality,shipments_count,completed_count,on_time_count,late_count,pending_count,overdue_count,avg_elapsed_minutes,avg_breach_minutes,avg_breach_days,cancelled_count,terminal_without_completion_count",
          account_id: accountFilter,
          ...selectedLogisticsTypeQuery,
          ...logisticsPeriodFilter,
          order: "sale_date.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsReconciliationRecord>(
        config,
        appendQuery("dashboard_daily_logistics_reconciliation_waterfall", {
          select:
            "sale_date,logistic_type,modality_code,reconciliation_reason_code,reconciliation_reason,reconciliation_order,reconciliation_scope,shipments_count,preparation_started_count,preparation_completed_count,handoff_observed_count,in_hub_observed_count,shipped_observed_count,out_for_delivery_observed_count,delivered_observed_count,on_time_kpi_included_count,included_in_dispatch_kpi_count,backlog_kpi_included_count,terminal_kpi_included_count,on_time_count,late_count,pending_count,overdue_count,cancelled_count,not_delivered_count,delivery_failed_count",
          account_id: accountFilter,
          direction: "eq.outbound",
          sla_event: "eq.dispatch",
          ...selectedLogisticsTypeQuery,
          ...reconciliationPeriodFilter,
          order: "sale_date.asc,reconciliation_order.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsSlaRecord>(
        config,
        appendQuery("dashboard_daily_logistics_sla", {
          select:
            "sale_date,logistic_type,event_name,target_source,measurement_quality,shipments_count,completed_count,on_time_count,late_count,pending_count,overdue_count,avg_elapsed_minutes,avg_breach_minutes,avg_breach_days,cancelled_count,terminal_without_completion_count",
          account_id: accountFilter,
          target_source: "in.(meli_sla,meli_lead_time)",
          measurement_quality: "in.(pending,not_applicable)",
          ...selectedLogisticsTypeQuery,
          order: "sale_date.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsEconomicsRecord>(
        config,
        appendQuery("dashboard_daily_logistics_economics", {
          select:
            "sale_date,orders_count,paid_orders_count,orders_with_return,orders_with_return_cost,returned_units,paid_gross_revenue,outbound_shipping_cost,return_shipping_cost,total_shipping_cost",
          account_id: accountFilter,
          ...logisticsPeriodFilter,
          order: "sale_date.asc",
        }),
      ),
      optionalFetchAllWithAvailability<FulfillmentInventoryRecord>(
        config,
        appendQuery("dashboard_fulfillment_inventory", {
          select: "inventory_id,total_quantity,available_quantity,not_available_quantity,synced_at",
          account_id: accountFilter,
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsSlaPolicyRecord>(
        config,
        appendQuery("logistics_sla_policies", {
          select: "policy_name,logistic_type,start_event_code,end_event_code,target_minutes,valid_from,valid_to",
          account_id: accountFilter,
          active: "eq.true",
          valid_from: `lte.${dateSelection.currentEnd}`,
          ...selectedLogisticsPolicyTypeQuery,
          order: "policy_name.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsStageRecord>(
        config,
        appendQuery("dashboard_logistics_stage_times", {
          select:
            "sale_date,logistic_type,stage_order,stage_code,stage_name,start_event_code,end_event_code,stage_status,duration_minutes,target_minutes,above_target",
          account_id: accountFilter,
          ...selectedLogisticsTypeQuery,
          ...logisticsPeriodFilter,
          order: "sale_date.asc,stage_order.asc",
        }),
      ),
      optionalFetchAllWithAvailability<LogisticsSyncRunRecord>(
        config,
        appendQuery("sync_runs", {
          select: "workflow_name,status,started_at,finished_at,error_message",
          account_id: accountFilter,
          workflow_name: `in.(${Object.values(LOGISTICS_WORKFLOW_NAMES).join(",")})`,
          order: "started_at.desc",
          limit: 100,
        }),
      ),
    ]);

    const logisticsSlaRecords = logisticsSlaResult.rows;
    const operationalLogisticsSlaRecords = operationalLogisticsSlaResult.rows;
    const logisticsEconomicsRecords = logisticsEconomicsResult.rows;
    const fulfillmentRecords = fulfillmentResult.rows;
    const logisticsPolicyRecords = logisticsPolicyResult.rows;
    const logisticsStageRecords = logisticsStageResult.rows;

    const timestamps = catalogRecords
      .flatMap((record) => [record.synced_at, record.last_updated])
      .filter((value): value is string => Boolean(value))
      .sort();
    const inRange = (date: string, firstDate: string | null, lastDate: string | null) =>
      Boolean(firstDate && lastDate && date >= firstDate && date <= lastDate);
    const currentSummaryRecords = summaryRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const previousSummaryRecords = summaryRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.comparisonStart, dateSelection.comparisonEnd),
    );
    const currentPerformanceRecords = performanceRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const previousPerformanceRecords = performanceRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.comparisonStart, dateSelection.comparisonEnd),
    );
    const sellerSnapshots = sellerSnapshotRecords.map(buildSellerSnapshot);
    const currentSellerSnapshots = sellerSnapshots.filter((snapshot) =>
      inRange(snapshot.snapshotDate, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const currentCancellationRecords = cancellationRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const previousCancellationRecords = cancellationRecords.filter((record) =>
      inRange(record.performance_date, dateSelection.comparisonStart, dateSelection.comparisonEnd),
    );
    const currentLogisticsSlaRecords = logisticsSlaRecords.filter((record) =>
      inRange(record.sale_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const previousLogisticsSlaRecords = logisticsSlaRecords.filter((record) =>
      inRange(record.sale_date, dateSelection.comparisonStart, dateSelection.comparisonEnd),
    );
    const currentLogisticsEconomicsRecords = logisticsEconomicsRecords.filter((record) =>
      inRange(record.sale_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const previousLogisticsEconomicsRecords = logisticsEconomicsRecords.filter((record) =>
      inRange(record.sale_date, dateSelection.comparisonStart, dateSelection.comparisonEnd),
    );
    const currentLogisticsStageRecords = logisticsStageRecords.filter((record) =>
      inRange(record.sale_date, dateSelection.currentStart, dateSelection.currentEnd),
    );
    const officialSla = (records: LogisticsSlaRecord[], eventNames: readonly string[], targetSource: string) =>
      records.filter((record) =>
        eventNames.includes(record.event_name) &&
        record.target_source === targetSource,
      );
    const prospective = (records: LogisticsSlaRecord[]) =>
      records.filter((record) => record.measurement_quality === PUNCTUALITY_MEASUREMENT_QUALITY);
    const operational = (records: LogisticsSlaRecord[]) =>
      records.filter((record) =>
        BACKLOG_MEASUREMENT_QUALITIES.includes(
          record.measurement_quality as (typeof BACKLOG_MEASUREMENT_QUALITIES)[number],
        ),
      );
    const currentOfficialDispatchRecords = officialSla(currentLogisticsSlaRecords, DISPATCH_EVENT_NAMES, "meli_sla");
    const currentOfficialDeliveryRecords = officialSla(currentLogisticsSlaRecords, DELIVERY_EVENT_NAMES, "meli_lead_time");
    const previousOfficialDispatchRecords = officialSla(previousLogisticsSlaRecords, DISPATCH_EVENT_NAMES, "meli_sla");
    const previousOfficialDeliveryRecords = officialSla(previousLogisticsSlaRecords, DELIVERY_EVENT_NAMES, "meli_lead_time");
    const currentDispatchPunctualityRecords = prospective(currentOfficialDispatchRecords);
    const currentDeliveryPunctualityRecords = prospective(currentOfficialDeliveryRecords);
    const previousDispatchPunctualityRecords = prospective(previousOfficialDispatchRecords);
    const previousDeliveryPunctualityRecords = prospective(previousOfficialDeliveryRecords);
    const operationalDispatchRecords = operational(
      officialSla(operationalLogisticsSlaRecords, DISPATCH_EVENT_NAMES, "meli_sla"),
    );
    const operationalDeliveryRecords = operational(
      officialSla(operationalLogisticsSlaRecords, DELIVERY_EVENT_NAMES, "meli_lead_time"),
    );
    const dispatchPunctuality = buildLogisticsSlaSummary(currentDispatchPunctualityRecords);
    const deliveryPunctuality = buildLogisticsSlaSummary(currentDeliveryPunctualityRecords);
    const comparisonDispatchPunctuality = previousDispatchPunctualityRecords.length
      ? buildLogisticsSlaSummary(previousDispatchPunctualityRecords)
      : null;
    const comparisonDeliveryPunctuality = previousDeliveryPunctualityRecords.length
      ? buildLogisticsSlaSummary(previousDeliveryPunctualityRecords)
      : null;
    const dispatchBacklog = buildOperationalBacklogSummary(operationalDispatchRecords);
    const deliveryBacklog = buildOperationalBacklogSummary(operationalDeliveryRecords);
    const stages = buildLogisticsStages(currentLogisticsStageRecords);
    const observedLogisticsTypes = Array.from(
      new Set(
        [
          ...logisticsSlaRecords.map((record) => record.logistic_type),
          ...operationalLogisticsSlaRecords.map((record) => record.logistic_type),
          ...logisticsStageRecords.map((record) => record.logistic_type),
          ...logisticsPolicyRecords.map((record) => record.logistic_type),
        ].filter((value): value is string => Boolean(value)),
      ),
    ).sort();
    const comparisonBase = hasComparison
      ? {
          dispatch: comparisonDispatchPunctuality?.completedCount ?? 0,
          delivery: comparisonDeliveryPunctuality?.completedCount ?? 0,
        }
      : null;
    const comparisonExcludedCompleted = hasComparison
      ? {
          dispatch: completedOutsideProspective(previousOfficialDispatchRecords),
          delivery: completedOutsideProspective(previousOfficialDeliveryRecords),
        }
      : null;
    const reconciliation = buildLogisticsReconciliation(logisticsReconciliationResult);
    const fulfillment = buildFulfillmentInventory(fulfillmentRecords);
    const checkedAt = new Date().toISOString();
    const unavailableShipmentCoreComponents = [
      !logisticsSlaResult.available ? "indicadores de SLA" : null,
      !operationalLogisticsSlaResult.available ? "fila operacional" : null,
    ].filter((value): value is string => Boolean(value));
    const unavailableShipmentDiagnosticComponents = [
      !logisticsPolicyResult.available ? "metas internas" : null,
      !logisticsStageResult.available ? "tempos por etapa" : null,
    ].filter((value): value is string => Boolean(value));
    const dataHealthSources: LogisticsDataHealthSource[] = [
      buildDataHealthSource({
        key: "shipments",
        label: "Envios",
        available: unavailableShipmentCoreComponents.length === 0,
        hasData: logisticsSlaRecords.length > 0
          || operationalLogisticsSlaRecords.length > 0,
        checkedAt,
        workflowName: LOGISTICS_WORKFLOW_NAMES.shipments,
        syncRuns: logisticsSyncRunsResult,
        unavailableComponents: unavailableShipmentCoreComponents,
        optionalUnavailableComponents: unavailableShipmentDiagnosticComponents,
      }),
      buildDataHealthSource({
        key: "returns",
        label: "Devoluções e custos",
        available: logisticsEconomicsResult.available,
        hasData: logisticsEconomicsRecords.length > 0,
        checkedAt,
        workflowName: LOGISTICS_WORKFLOW_NAMES.returns,
        syncRuns: logisticsSyncRunsResult,
      }),
      buildDataHealthSource({
        key: "fulfillment",
        label: "Estoque Full",
        available: fulfillmentResult.available,
        hasData: fulfillmentRecords.length > 0,
        checkedAt,
        workflowName: LOGISTICS_WORKFLOW_NAMES.fulfillment,
        syncRuns: logisticsSyncRunsResult,
        fallbackUpdatedAt: fulfillment.syncedAt,
      }),
      buildDataHealthSource({
        key: "reconciliation",
        label: "Reconciliação logística",
        available: logisticsReconciliationResult.available,
        hasData: logisticsReconciliationResult.rows.length > 0,
        checkedAt,
        workflowName: LOGISTICS_WORKFLOW_NAMES.shipments,
        syncRuns: logisticsSyncRunsResult,
      }),
    ];

    return {
      source: "supabase",
      connected: true,
      message: null,
      accountName: DISPLAY_ACCOUNT_NAME,
      periodDays: dateSelection.currentDays,
      updatedAt: timestamps.at(-1) ?? null,
      catalog: buildCatalog(catalogRecords),
      sales: buildSales(currentSummaryRecords),
      comparison: {
        firstDate: dateSelection.comparisonStart,
        lastDate: dateSelection.comparisonEnd,
        periodDays: dateSelection.comparisonDays,
        sales: previousSummaryRecords.length ? buildSales(previousSummaryRecords) : null,
      },
      dateSelection,
      availableDateRange: {
        firstDate: earliestSummary[0]?.performance_date ?? null,
        lastDate: latestSummary[0]?.performance_date ?? null,
      },
      dailyPerformance: {
        currentFirstDate: dateSelection.currentStart,
        currentLastDate: dateSelection.currentEnd,
        previousFirstDate: dateSelection.comparisonStart,
        previousLastDate: dateSelection.comparisonEnd,
        current: buildDailyPerformance(currentSummaryRecords),
        previous: buildDailyPerformance(previousSummaryRecords),
      },
      topProducts: buildTopProducts(currentPerformanceRecords),
      productComparisons: buildProductComparisons(currentPerformanceRecords, previousPerformanceRecords),
      sellerHealth: {
        profile: buildSellerProfile(sellerCurrentRecords[0]),
        currentSnapshot: latestSnapshotInRange(
          sellerSnapshots,
          dateSelection.currentStart,
          dateSelection.currentEnd,
        ),
        comparisonSnapshot: latestSnapshotInRange(
          sellerSnapshots,
          dateSelection.comparisonStart,
          dateSelection.comparisonEnd,
        ),
        history: currentSellerSnapshots,
        availableSnapshotDays: sellerSnapshots.length,
      },
      cancellations: {
        current: buildCancellationSummary(currentCancellationRecords),
        comparison: previousCancellationRecords.length
          ? buildCancellationSummary(previousCancellationRecords)
          : null,
        dailyCurrent: buildCancellationDaily(currentCancellationRecords),
        dailyComparison: buildCancellationDaily(previousCancellationRecords),
      },
      logistics: {
        selectedLogisticsType,
        reconciliation,
        punctuality: {
          dispatch: dispatchPunctuality,
          delivery: deliveryPunctuality,
          comparisonDispatch: comparisonDispatchPunctuality,
          comparisonDelivery: comparisonDeliveryPunctuality,
        },
        operationalBacklog: {
          dispatch: dispatchBacklog,
          delivery: deliveryBacklog,
          comparison: null,
        },
        // Campos legados mantidos enquanto a UI migra para punctuality e operationalBacklog.
        dispatch: withOperationalBacklog(dispatchPunctuality, dispatchBacklog),
        delivery: withOperationalBacklog(deliveryPunctuality, deliveryBacklog),
        comparisonDispatch: comparisonDispatchPunctuality,
        comparisonDelivery: comparisonDeliveryPunctuality,
        slaBreakdown: buildLogisticsSlaBreakdown(currentLogisticsSlaRecords),
        economics: buildLogisticsEconomics(currentLogisticsEconomicsRecords),
        comparisonEconomics: previousLogisticsEconomicsRecords.length
          ? buildLogisticsEconomics(previousLogisticsEconomicsRecords)
          : null,
        fulfillment,
        policies: buildLogisticsPolicies(
          logisticsPolicyRecords.filter((record) => !record.valid_to || record.valid_to >= dateSelection.currentStart),
        ),
        stages,
        metadata: {
          logisticsType: {
            selected: selectedLogisticsType,
            appliedValues: [...logisticsTypeValues(selectedLogisticsType)],
            observedValues: observedLogisticsTypes,
          },
          punctuality: {
            population: "completed_shipments",
            measurementQualities: [PUNCTUALITY_MEASUREMENT_QUALITY],
            currentBase: {
              dispatch: dispatchPunctuality.completedCount,
              delivery: deliveryPunctuality.completedCount,
            },
            comparisonBase,
            currentExcludedCompleted: {
              dispatch: completedOutsideProspective(currentOfficialDispatchRecords),
              delivery: completedOutsideProspective(currentOfficialDeliveryRecords),
            },
            comparisonExcludedCompleted,
          },
          backlog: {
            population: "pending_overdue_or_terminal_shipments",
            measurementQualities: [...BACKLOG_MEASUREMENT_QUALITIES],
            currentBase: {
              dispatch: dispatchBacklog.shipmentsCount,
              delivery: deliveryBacklog.shipmentsCount,
            },
            comparisonBase: null,
            historicalComparisonAvailable: false,
          },
          stages: {
            population: "shipments_with_stage_start",
            groupedByLogisticsType: true,
            rowCount: currentLogisticsStageRecords.length,
            completedBase: stages.reduce((total, stage) => total + stage.completedCount, 0),
          },
          economics: {
            population: "orders_by_sale_date",
            scope: selectedLogisticsType === "all"
              ? "all_modalities"
              : "unavailable_for_selected_modality",
            available: selectedLogisticsType === "all" && logisticsEconomicsResult.available,
          },
          fulfillment: {
            population: "current_inventory",
            logisticsType: "fulfillment",
            included: selectedLogisticsType === "all" || selectedLogisticsType === "fulfillment",
          },
          availability: {
            sla: logisticsSlaResult.available,
            backlog: operationalLogisticsSlaResult.available,
            economics: logisticsEconomicsResult.available,
            fulfillment: fulfillmentResult.available,
            policies: logisticsPolicyResult.available,
            stages: logisticsStageResult.available,
            reconciliation: logisticsReconciliationResult.available,
          },
          dataHealth: buildLogisticsDataHealth(checkedAt, dataHealthSources),
        },
      },
    };
  } catch (error) {
    return fallbackForQuery(
      query,
      error instanceof Error ? error.message : "Erro desconhecido ao consultar Supabase.",
    );
  }
}
