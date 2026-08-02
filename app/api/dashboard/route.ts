import { getDashboardData } from "@/lib/supabase-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedPeriod = Number(searchParams.get("periodDays") ?? 30);
  const periodDays = [7, 30, 90].includes(requestedPeriod) ? requestedPeriod : 30;
  const data = await getDashboardData(periodDays);

  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
