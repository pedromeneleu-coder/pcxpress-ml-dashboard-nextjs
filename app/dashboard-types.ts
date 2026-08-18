export type CatalogTone = "good" | "warning" | "neutral" | "brand";

export type ComparisonMode =
  | "previousPeriod"
  | "previousMonthEquivalent"
  | "previousMonthFull"
  | "custom"
  | "none";

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

export type ProductPeriodMetrics = {
  visits: number;
  unitsSold: number;
  ordersCount: number;
  grossAmount: number;
  conversionRatePercent: number | null;
};

export type ProductComparison = {
  itemId: string;
  title: string;
  catalogSource: string;
  current: ProductPeriodMetrics;
  previous: ProductPeriodMetrics;
  currentRank: number | null;
  previousRank: number | null;
};

export type SalesSummary = {
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

export type DailyPerformancePoint = {
  date: string;
  visits: number | null;
  unitsSold: number;
  ordersCount: number;
  grossAmount: number;
  avgTicket: number | null;
  unitsPerOrder: number | null;
  conversionRatePercent: number | null;
};

export type SellerProfile = {
  sellerId: number | null;
  nickname: string | null;
  reputationRealLevel: string | null;
  powerSellerStatus: string | null;
  protectionEndDate: string | null;
  transactionsPeriod: string | null;
  syncedAt: string | null;
};

export type SellerSnapshot = {
  snapshotDate: string;
  sellerId: number | null;
  reputationLevelId: string | null;
  powerSellerStatus: string | null;
  transactionsPeriod: string | null;
  transactionsTotal: number | null;
  transactionsCompleted: number | null;
  transactionsCanceled: number | null;
  ratingPositive: number | null;
  ratingNeutral: number | null;
  ratingNegative: number | null;
  salesCompleted: number | null;
  claimsRate: number | null;
  claimsValue: number | null;
  delayedHandlingTimeRate: number | null;
  delayedHandlingTimeValue: number | null;
  cancellationsRate: number | null;
  cancellationsValue: number | null;
  syncedAt: string | null;
};

export type CancellationSummary = {
  ordersCount: number;
  paidOrdersCount: number;
  canceledOrdersCount: number;
  grossAmount: number;
  paidAmount: number;
  canceledAmount: number;
  canceledOrdersPercent: number | null;
  canceledAmountPercent: number | null;
  averageCanceledTicket: number | null;
};

export type CancellationDailyPoint = CancellationSummary & {
  date: string;
};

export type LogisticsSlaSummary = {
  shipmentsCount: number;
  completedCount: number;
  onTimeCount: number;
  lateCount: number;
  pendingCount: number;
  overdueCount: number;
  cancelledCount: number;
  terminalWithoutCompletionCount: number;
  onTimePercent: number | null;
  averageElapsedMinutes: number | null;
  averageBreachMinutes: number | null;
  averageBreachDays: number | null;
};

export type LogisticsSlaBreakdown = LogisticsSlaSummary & {
  eventName: string;
  logisticType: string | null;
  targetSource: string;
  measurementQuality: string;
};

export type LogisticsEconomicsSummary = {
  ordersCount: number;
  paidOrdersCount: number;
  ordersWithReturn: number;
  ordersWithReturnCost: number;
  returnedUnits: number;
  paidGrossRevenue: number;
  outboundShippingCost: number;
  returnShippingCost: number;
  totalShippingCost: number;
  returnCostOverGrossPercent: number | null;
  totalShippingCostOverGrossPercent: number | null;
};

export type FulfillmentInventorySummary = {
  totalQuantity: number;
  availableQuantity: number;
  notAvailableQuantity: number;
  availablePercent: number | null;
  skuCount: number;
  syncedAt: string | null;
};

export type LogisticsSlaPolicy = {
  name: string;
  logisticType: string | null;
  startEventCode: string;
  endEventCode: string;
  targetMinutes: number;
};

export type LogisticsStageSummary = {
  stageOrder: number;
  stageCode: string;
  stageName: string;
  startEventCode: string;
  endEventCode: string;
  startedCount: number;
  completedCount: number;
  inProgressCount: number;
  terminalWithoutEventCount: number;
  invalidSequenceCount: number;
  averageDurationMinutes: number | null;
  medianDurationMinutes: number | null;
  p90DurationMinutes: number | null;
  coveragePercent: number | null;
  targetMinutes: number | null;
  aboveTargetCount: number;
};

export type LogisticsData = {
  dispatch: LogisticsSlaSummary;
  delivery: LogisticsSlaSummary;
  comparisonDispatch: LogisticsSlaSummary | null;
  comparisonDelivery: LogisticsSlaSummary | null;
  slaBreakdown: LogisticsSlaBreakdown[];
  economics: LogisticsEconomicsSummary;
  comparisonEconomics: LogisticsEconomicsSummary | null;
  fulfillment: FulfillmentInventorySummary;
  policies: LogisticsSlaPolicy[];
  stages: LogisticsStageSummary[];
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
  sales: SalesSummary;
  comparison: {
    firstDate: string | null;
    lastDate: string | null;
    periodDays: number;
    sales: SalesSummary | null;
  };
  dateSelection: {
    currentStart: string;
    currentEnd: string;
    currentDays: number;
    comparisonMode: ComparisonMode;
    comparisonStart: string | null;
    comparisonEnd: string | null;
    comparisonDays: number;
    comparisonLabel: string;
  };
  availableDateRange: {
    firstDate: string | null;
    lastDate: string | null;
  };
  dailyPerformance: {
    currentFirstDate: string | null;
    currentLastDate: string | null;
    previousFirstDate: string | null;
    previousLastDate: string | null;
    current: DailyPerformancePoint[];
    previous: DailyPerformancePoint[];
  };
  topProducts: TopProduct[];
  productComparisons: ProductComparison[];
  sellerHealth: {
    profile: SellerProfile;
    currentSnapshot: SellerSnapshot | null;
    comparisonSnapshot: SellerSnapshot | null;
    history: SellerSnapshot[];
    availableSnapshotDays: number;
  };
  cancellations: {
    current: CancellationSummary;
    comparison: CancellationSummary | null;
    dailyCurrent: CancellationDailyPoint[];
    dailyComparison: CancellationDailyPoint[];
  };
  logistics: LogisticsData;
};

export const FALLBACK_DASHBOARD_DATA: DashboardData = {
  source: "fallback",
  connected: false,
  message: "Aguardando variáveis do Supabase.",
  accountName: "PCXpress",
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
        source: "Catálogo operacional",
        status: "Atualizado pela API",
        count: 174,
        share: "62,8%",
        tone: "good",
      },
      {
        source: "Catálogo preservado",
        status: "Mantido para análise",
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
  comparison: {
    firstDate: null,
    lastDate: null,
    periodDays: 0,
    sales: null,
  },
  dateSelection: {
    currentStart: "2026-01-27",
    currentEnd: "2026-02-25",
    currentDays: 30,
    comparisonMode: "previousPeriod",
    comparisonStart: "2025-12-28",
    comparisonEnd: "2026-01-26",
    comparisonDays: 30,
    comparisonLabel: "30 dias anteriores",
  },
  availableDateRange: {
    firstDate: null,
    lastDate: "2026-02-25",
  },
  dailyPerformance: {
    currentFirstDate: null,
    currentLastDate: null,
    previousFirstDate: null,
    previousLastDate: null,
    current: [],
    previous: [],
  },
  topProducts: [],
  productComparisons: [],
  sellerHealth: {
    profile: {
      sellerId: null,
      nickname: null,
      reputationRealLevel: null,
      powerSellerStatus: null,
      protectionEndDate: null,
      transactionsPeriod: null,
      syncedAt: null,
    },
    currentSnapshot: null,
    comparisonSnapshot: null,
    history: [],
    availableSnapshotDays: 0,
  },
  cancellations: {
    current: {
      ordersCount: 0,
      paidOrdersCount: 0,
      canceledOrdersCount: 0,
      grossAmount: 0,
      paidAmount: 0,
      canceledAmount: 0,
      canceledOrdersPercent: null,
      canceledAmountPercent: null,
      averageCanceledTicket: null,
    },
    comparison: null,
    dailyCurrent: [],
    dailyComparison: [],
  },
  logistics: {
    dispatch: {
      shipmentsCount: 0, completedCount: 0, onTimeCount: 0, lateCount: 0, pendingCount: 0, overdueCount: 0,
      cancelledCount: 0, terminalWithoutCompletionCount: 0, onTimePercent: null, averageElapsedMinutes: null, averageBreachMinutes: null, averageBreachDays: null,
    },
    delivery: {
      shipmentsCount: 0, completedCount: 0, onTimeCount: 0, lateCount: 0, pendingCount: 0, overdueCount: 0,
      cancelledCount: 0, terminalWithoutCompletionCount: 0, onTimePercent: null, averageElapsedMinutes: null, averageBreachMinutes: null, averageBreachDays: null,
    },
    comparisonDispatch: null,
    comparisonDelivery: null,
    slaBreakdown: [],
    economics: {
      ordersCount: 0, paidOrdersCount: 0, ordersWithReturn: 0, ordersWithReturnCost: 0, returnedUnits: 0,
      paidGrossRevenue: 0, outboundShippingCost: 0, returnShippingCost: 0, totalShippingCost: 0,
      returnCostOverGrossPercent: null, totalShippingCostOverGrossPercent: null,
    },
    comparisonEconomics: null,
    fulfillment: {
      totalQuantity: 0, availableQuantity: 0, notAvailableQuantity: 0, availablePercent: null, skuCount: 0, syncedAt: null,
    },
    policies: [],
    stages: [],
  },
};
