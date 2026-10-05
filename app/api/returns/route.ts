import type { ReturnsWindow } from "@/app/returns/returns-types";
import { getReturnsData } from "@/lib/supabase-returns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RANGE_DAYS = 366;

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

/**
 * Devoluções para o período já resolvido pelo painel principal
 * (mesmas datas de /api/dashboard: período atual e comparação).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentStart = searchParams.get("currentStart");
  const currentEnd = searchParams.get("currentEnd");
  const comparisonStart = searchParams.get("comparisonStart");
  const comparisonEnd = searchParams.get("comparisonEnd");

  const currentError = validateRange("Período principal", currentStart, currentEnd);
  if (currentError) return Response.json({ error: currentError }, { status: 400 });

  if (Boolean(comparisonStart) !== Boolean(comparisonEnd)) {
    return Response.json({ error: "Informe a data inicial e a data final da comparação." }, { status: 400 });
  }

  if (comparisonStart || comparisonEnd) {
    const comparisonError = validateRange("Período de comparação", comparisonStart, comparisonEnd);
    if (comparisonError) return Response.json({ error: comparisonError }, { status: 400 });
  }

  const window: ReturnsWindow = {
    currentStart: currentStart as string,
    currentEnd: currentEnd as string,
    comparisonStart: comparisonStart || null,
    comparisonEnd: comparisonEnd || null,
  };

  return Response.json(await getReturnsData(window), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
