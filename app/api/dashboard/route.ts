import type { ComparisonMode, LogisticsTypeFilter } from "@/app/dashboard-types";
import { getDashboardData, type DashboardDateQuery } from "@/lib/supabase-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RANGE_DAYS = 366;
const comparisonModes = new Set<ComparisonMode>([
  "previousPeriod",
  "previousMonthEquivalent",
  "previousMonthFull",
  "custom",
  "none",
]);
const logisticsTypes = new Set<LogisticsTypeFilter>([
  "all",
  "fulfillment",
  "cross_docking",
  "flex",
]);

function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function rangeDays(firstDate: string, lastDate: string) {
  return Math.floor(
    (new Date(`${lastDate}T00:00:00Z`).getTime() - new Date(`${firstDate}T00:00:00Z`).getTime()) / 86400000,
  ) + 1;
}

function validateRange(label: string, firstDate: string | null, lastDate: string | null) {
  if (!isIsoDate(firstDate) || !isIsoDate(lastDate)) {
    return `${label}: informe as duas datas no formato AAAA-MM-DD.`;
  }

  const days = rangeDays(firstDate, lastDate);
  if (days < 1) return `${label}: a data inicial deve ser anterior ou igual à final.`;
  if (days > MAX_RANGE_DAYS) return `${label}: o intervalo máximo é de ${MAX_RANGE_DAYS} dias.`;
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPeriod = Number(searchParams.get("periodDays") ?? 30);
  const periodDays = [7, 30, 90].includes(requestedPeriod) ? requestedPeriod : 30;
  const currentStart = searchParams.get("currentStart");
  const currentEnd = searchParams.get("currentEnd");
  const requestedMode = searchParams.get("comparisonMode") as ComparisonMode | null;
  const comparisonMode = requestedMode && comparisonModes.has(requestedMode)
    ? requestedMode
    : "previousPeriod";
  const comparisonStart = searchParams.get("comparisonStart");
  const comparisonEnd = searchParams.get("comparisonEnd");
  const requestedLogisticsType = searchParams.get("logisticsType");

  if (requestedLogisticsType && !logisticsTypes.has(requestedLogisticsType as LogisticsTypeFilter)) {
    return Response.json(
      { error: "Modalidade inválida. Use all, fulfillment, cross_docking ou flex." },
      { status: 400 },
    );
  }

  const logisticsType = (requestedLogisticsType ?? "all") as LogisticsTypeFilter;

  if (Boolean(currentStart) !== Boolean(currentEnd)) {
    return Response.json({ error: "Informe a data inicial e a data final do período principal." }, { status: 400 });
  }

  if (currentStart || currentEnd) {
    const error = validateRange("Período principal", currentStart, currentEnd);
    if (error) return Response.json({ error }, { status: 400 });
  }

  if (comparisonMode === "custom") {
    const error = validateRange("Período de comparação", comparisonStart, comparisonEnd);
    if (error) return Response.json({ error }, { status: 400 });
  }

  const query: DashboardDateQuery = {
    periodDays,
    comparisonMode,
    logisticsType,
    ...(currentStart && currentEnd ? { currentStart, currentEnd } : {}),
    ...(comparisonMode === "custom" && comparisonStart && comparisonEnd
      ? { comparisonStart, comparisonEnd }
      : {}),
  };
  const data = await getDashboardData(query);

  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
