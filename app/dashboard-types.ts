export type CatalogTone = "good" | "warning" | "neutral" | "brand";

export type CatalogRow = {
  source: string;
  status: string;
  count: number;
  share: string;
  tone: CatalogTone;
};

export type TopProduct = {
  itemId: string;
  title: string;
  catalogSource: "items_current" | "order_items_fallback" | string;
  visits: number;
  unitsSold: number;
  ordersCount: number;
  grossAmount: number;
  conversionRatePercent: number | null;
  availableQuantity: number | null;
  status: string | null;
  thumbnail: string | null;
  permalink: string | null;
};

export type DashboardData = {
  source: "supabase" | "fallback";
  connected: boolean;
  message: string | null;
  accountName: string;
  periodDays: number;
  updatedAt: string | null;
  catalog: {
    total: number;
    current: number;
    retained: number;
    unknown: number;
    currentShare: number;
    retainedShare: number;
    rows: CatalogRow[];
  };
  sales: {
    visits: number | null;
    unitsSold: number;
    ordersCount: number;
    grossAmount: number;
    paidGrossAmount: number | null;
    avgTicket: number | null;
    conversionRatePercent: number | null;
    itemsCount: number | null;
    fallbackItemsCount: number | null;
    firstPerformanceDate: string | null;
    lastPerformanceDate: string | null;
  };
  topProducts: TopProduct[];
};

export const FALLBACK_DASHBOARD_DATA: DashboardData = {
  source: "fallback",
  connected: false,
  message: "Aguardando variaveis do Supabase.",
  accountName: "PC Express",
  periodDays: 30,
  updatedAt: null,
  catalog: {
    total: 277,
    current: 174,
    retained: 103,
    unknown: 0,
    currentShare: 62.8,
    retainedShare: 37.2,
    rows: [
      {
        source: "Catalogo operacional",
        status: "Atualizado pela API",
        count: 174,
        share: "62,8%",
        tone: "good",
      },
      {
        source: "Catalogo preservado",
        status: "Mantido para analise",
        count: 103,
        share: "37,2%",
        tone: "warning",
      },
    ],
  },
  sales: {
    visits: null,
    unitsSold: 1044,
    ordersCount: 898,
    grossAmount: 1763179.84,
    paidGrossAmount: null,
    avgTicket: 1963.45,
    conversionRatePercent: null,
    itemsCount: null,
    fallbackItemsCount: 103,
    firstPerformanceDate: null,
    lastPerformanceDate: "2026-02-25",
  },
  topProducts: [],
};
