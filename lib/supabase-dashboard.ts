import {
  FALLBACK_DASHBOARD_DATA,
  type CatalogRow,
  type DashboardData,
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
  const conversionRatePercent = totals.visits > 0 ? (totals.unitsSold / totals.visits) * 100 : null;

  return {
    visits: totals.visits,
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

function buildTopProducts(records: ItemPerformanceRecord[]): TopProduct[] {
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
      current.visits > 0 ? (current.unitsSold / current.visits) * 100 : toNullableNumber(record.conversion_rate_percent);

    byItem.set(record.item_id, current);
  }

  return Array.from(byItem.values())
    .sort((a, b) => b.grossAmount - a.grossAmount)
    .slice(0, 12);
}

export async function getDashboardData(periodDays: number): Promise<DashboardData> {
  const config = readConfig();

  if (!config) {
    return { ...FALLBACK_DASHBOARD_DATA, periodDays };
  }

  try {
    const account = await getAccount(config);

    if (!account) {
      return {
        ...FALLBACK_DASHBOARD_DATA,
        periodDays,
        message: `Conta "${config.accountName}" não encontrada no Supabase.`,
      };
    }

    const accountFilter = `eq.${account.id}`;
    const latestSummary = await supabaseFetch<Pick<AccountSummaryRecord, "performance_date">[]>(
      config,
      appendQuery("dashboard_daily_account_summary", {
        select: "performance_date",
        account_id: accountFilter,
        order: "performance_date.desc",
        limit: 1,
      }),
    );
    const anchorDate = latestSummary[0]?.performance_date ?? new Date().toISOString().slice(0, 10);
    const fromDate = startDateForPeriod(anchorDate, periodDays);
    const previousLastDate = shiftDate(fromDate, -1);
    const previousFirstDate = startDateForPeriod(previousLastDate, periodDays);
    const combinedPeriodFilter = `(performance_date.gte.${previousFirstDate},performance_date.lte.${anchorDate})`;
    const periodFilter = `(performance_date.gte.${fromDate},performance_date.lte.${anchorDate})`;
    const [catalogRecords, summaryRecords, performanceRecords] = await Promise.all([
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
          and: combinedPeriodFilter,
          order: "performance_date.asc",
        }),
      ),
      fetchAll<ItemPerformanceRecord>(
        config,
        appendQuery("dashboard_daily_item_performance", {
          select:
            "item_id,title,catalog_source,visits,units_sold,orders_count,gross_amount,conversion_rate_percent,available_quantity,status,thumbnail,permalink",
          account_id: accountFilter,
          and: periodFilter,
        }),
      ),
    ]);

    const timestamps = catalogRecords
      .flatMap((record) => [record.synced_at, record.last_updated])
      .filter((value): value is string => Boolean(value))
      .sort();
    const currentSummaryRecords = summaryRecords.filter((record) => record.performance_date >= fromDate);
    const previousSummaryRecords = summaryRecords.filter((record) => record.performance_date < fromDate);

    return {
      source: "supabase",
      connected: true,
      message: null,
      accountName: DISPLAY_ACCOUNT_NAME,
      periodDays,
      updatedAt: timestamps.at(-1) ?? null,
      catalog: buildCatalog(catalogRecords),
      sales: buildSales(currentSummaryRecords),
      comparison: {
        firstDate: previousFirstDate,
        lastDate: previousLastDate,
        sales: previousSummaryRecords.length ? buildSales(previousSummaryRecords) : null,
      },
      topProducts: buildTopProducts(performanceRecords),
    };
  } catch (error) {
    return {
      ...FALLBACK_DASHBOARD_DATA,
      periodDays,
      message: error instanceof Error ? error.message : "Erro desconhecido ao consultar Supabase.",
    };
  }
}
