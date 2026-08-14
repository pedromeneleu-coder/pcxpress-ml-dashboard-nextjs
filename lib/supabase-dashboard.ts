import {
  FALLBACK_DASHBOARD_DATA,
  type CatalogRow,
  type CancellationDailyPoint,
  type CancellationSummary,
  type DailyPerformancePoint,
  type DashboardData,
  type FulfillmentInventorySummary,
  type LogisticsEconomicsSummary,
  type LogisticsSlaBreakdown,
  type LogisticsSlaPolicy,
  type LogisticsSlaSummary,
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

export type DashboardDateQuery = {
  periodDays?: number;
  currentStart?: string;
  currentEnd?: string;
  comparisonMode?: ComparisonMode;
  comparisonStart?: string;
  comparisonEnd?: string;
};

type ResolvedDateSelection = DashboardData["dateSelection"];

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

  return {
    ...totals,
    availablePercent: totals.totalQuantity > 0 ? (totals.availableQuantity / totals.totalQuantity) * 100 : null,
    skuCount: new Set(records.map((record) => record.inventory_id)).size,
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
    const [
      catalogRecords,
      summaryRecords,
      performanceRecords,
      sellerCurrentRecords,
      sellerSnapshotRecords,
      cancellationRecords,
      logisticsSlaRecords,
      logisticsEconomicsRecords,
      fulfillmentRecords,
      logisticsPolicyRecords,
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
      optionalFetchAll<LogisticsSlaRecord>(
        config,
        appendQuery("dashboard_daily_logistics_sla", {
          select:
            "sale_date,logistic_type,event_name,target_source,measurement_quality,shipments_count,completed_count,on_time_count,late_count,pending_count,overdue_count,avg_elapsed_minutes,avg_breach_minutes,avg_breach_days,cancelled_count,terminal_without_completion_count",
          account_id: accountFilter,
          ...logisticsPeriodFilter,
          order: "sale_date.asc",
        }),
      ),
      optionalFetchAll<LogisticsEconomicsRecord>(
        config,
        appendQuery("dashboard_daily_logistics_economics", {
          select:
            "sale_date,orders_count,paid_orders_count,orders_with_return,orders_with_return_cost,returned_units,paid_gross_revenue,outbound_shipping_cost,return_shipping_cost,total_shipping_cost",
          account_id: accountFilter,
          ...logisticsPeriodFilter,
          order: "sale_date.asc",
        }),
      ),
      optionalFetchAll<FulfillmentInventoryRecord>(
        config,
        appendQuery("dashboard_fulfillment_inventory", {
          select: "inventory_id,total_quantity,available_quantity,not_available_quantity,synced_at",
          account_id: accountFilter,
        }),
      ),
      optionalFetchAll<LogisticsSlaPolicyRecord>(
        config,
        appendQuery("logistics_sla_policies", {
          select: "policy_name,logistic_type,start_event_code,end_event_code,target_minutes,valid_from,valid_to",
          account_id: accountFilter,
          active: "eq.true",
          valid_from: `lte.${dateSelection.currentEnd}`,
          order: "policy_name.asc",
        }),
      ),
    ]);

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
    const officialSla = (records: LogisticsSlaRecord[], eventName: string, targetSource: string) =>
      records.filter((record) =>
        record.event_name === eventName &&
        record.target_source === targetSource &&
        record.measurement_quality === "prospective",
      );

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
        dispatch: buildLogisticsSlaSummary(
          officialSla(currentLogisticsSlaRecords, "Despacho ao transportador", "meli_sla"),
        ),
        delivery: buildLogisticsSlaSummary(
          officialSla(currentLogisticsSlaRecords, "Entrega ao comprador", "meli_lead_time"),
        ),
        comparisonDispatch: previousLogisticsSlaRecords.length
          ? buildLogisticsSlaSummary(
            officialSla(previousLogisticsSlaRecords, "Despacho ao transportador", "meli_sla"),
          )
          : null,
        comparisonDelivery: previousLogisticsSlaRecords.length
          ? buildLogisticsSlaSummary(
            officialSla(previousLogisticsSlaRecords, "Entrega ao comprador", "meli_lead_time"),
          )
          : null,
        slaBreakdown: buildLogisticsSlaBreakdown(currentLogisticsSlaRecords),
        economics: buildLogisticsEconomics(currentLogisticsEconomicsRecords),
        comparisonEconomics: previousLogisticsEconomicsRecords.length
          ? buildLogisticsEconomics(previousLogisticsEconomicsRecords)
          : null,
        fulfillment: buildFulfillmentInventory(fulfillmentRecords),
        policies: buildLogisticsPolicies(
          logisticsPolicyRecords.filter((record) => !record.valid_to || record.valid_to >= dateSelection.currentStart),
        ),
      },
    };
  } catch (error) {
    return fallbackForQuery(
      query,
      error instanceof Error ? error.message : "Erro desconhecido ao consultar Supabase.",
    );
  }
}
