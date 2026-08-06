"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Database,
  Eye,
  Gauge,
  LayoutDashboard,
  Menu,
  Minus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FALLBACK_DASHBOARD_DATA,
  type DailyPerformancePoint,
  type DashboardData,
} from "./dashboard-types";

type ViewId = "overview" | "sales" | "products" | "performance" | "traffic" | "seller" | "quality";

const navItems = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: CircleDollarSign },
  { id: "products", label: "Produtos e anúncios", icon: ShoppingBag },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "traffic", label: "Tráfego e conversão", icon: Eye },
  { id: "seller", label: "Saúde do seller", icon: ShieldCheck },
  { id: "quality", label: "Qualidade da base", icon: Database },
] as const;

const viewMeta: Record<ViewId, { title: string; description: string }> = {
  overview: {
    title: "Visão geral",
    description: "Leitura executiva da operação Mercado Livre, com catálogo consolidado e dados auditáveis.",
  },
  sales: {
    title: "Vendas",
    description: "Pedidos, unidades, ticket e valor bruto no período selecionado.",
  },
  products: {
    title: "Produtos e anúncios",
    description: "Catálogo único para decisões comerciais, preservando a origem apenas como auditoria técnica.",
  },
  performance: {
    title: "Performance por produto",
    description: "Cruzamento diário de vendas, visitas, conversão e disponibilidade por item.",
  },
  traffic: {
    title: "Tráfego e conversão",
    description: "Demanda, eficiência de conversão e oportunidades por anúncio.",
  },
  seller: {
    title: "Saúde do seller",
    description: "Reputação e sinais operacionais da conta PCXpress.",
  },
  quality: {
    title: "Qualidade da base",
    description: "Rastreabilidade das sincronizações e cobertura do catálogo analítico.",
  },
};

const pipelineRows = [
  { name: "Seller", window: "Snapshot diário", status: "Disponível" },
  { name: "Anúncios", window: "Estado atual", status: "Disponível" },
  { name: "Pedidos", window: "Janela móvel", status: "Disponível" },
  { name: "Visitas", window: "Janela móvel", status: "Disponível" },
];

function periodToDays(period: string) {
  if (period === "7d") return 7;
  if (period === "90d") return 90;
  return 30;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatShortCurrency(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} mi`;
  }

  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil`;
  }

  return formatCurrency(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "Após conexão";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatTablePercent(value: number | null) {
  return value === null ? "—" : formatPercent(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Após conexão";
  }

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function shiftIsoDate(value: string | null, days: number) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getChange(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return { label: "Sem base", direction: "neutral" as const };
  }

  if (previous === 0) {
    return current > 0
      ? { label: "Novo", direction: "up" as const }
      : { label: "0,0%", direction: "neutral" as const };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const formatted = Math.abs(change).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return {
    label: `${change > 0 ? "+" : change < 0 ? "-" : ""}${formatted}%`,
    direction: change > 0 ? "up" as const : change < 0 ? "down" as const : "neutral" as const,
  };
}

type ChartMetricId = "grossAmount" | "ordersCount" | "unitsSold" | "visits";

const chartMetrics: { id: ChartMetricId; label: string }[] = [
  { id: "grossAmount", label: "Valor bruto" },
  { id: "ordersCount", label: "Pedidos" },
  { id: "unitsSold", label: "Unidades" },
  { id: "visits", label: "Visitas" },
];

function formatChartValue(metric: ChartMetricId, value: number) {
  return metric === "grossAmount" ? formatShortCurrency(value) : formatNumber(Math.round(value));
}

function dayIndex(date: string, firstDate: string) {
  const current = new Date(`${date}T00:00:00Z`).getTime();
  const first = new Date(`${firstDate}T00:00:00Z`).getTime();
  return Math.round((current - first) / 86400000);
}

function alignDailyValues(
  points: DailyPerformancePoint[],
  firstDate: string | null,
  periodDays: number,
  metric: ChartMetricId,
) {
  const values: (number | null)[] = Array.from({ length: periodDays }, () => null);

  if (!firstDate) {
    return values;
  }

  for (const point of points) {
    const index = dayIndex(point.date, firstDate);

    if (index >= 0 && index < periodDays) {
      values[index] = point[metric];
    }
  }

  return values;
}

function buildChartPath(values: (number | null)[], maxValue: number) {
  const left = 72;
  const top = 20;
  const width = 768;
  const height = 204;
  let path = "";
  let drawing = false;

  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }

    const x = left + (index / Math.max(values.length - 1, 1)) * width;
    const y = top + height - (value / maxValue) * height;
    path += `${drawing ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    drawing = true;
  });

  return path;
}

function PeriodComparisonChart({ data }: { data: DashboardData }) {
  const [metric, setMetric] = useState<ChartMetricId>("grossAmount");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const current = alignDailyValues(
    data.dailyPerformance.current,
    data.dailyPerformance.currentFirstDate,
    data.periodDays,
    metric,
  );
  const previous = alignDailyValues(
    data.dailyPerformance.previous,
    data.dailyPerformance.previousFirstDate,
    data.periodDays,
    metric,
  );
  const populatedValues = [...current, ...previous].filter((value): value is number => value !== null);
  const maxValue = Math.max(...populatedValues, 0) || 1;
  const chart = {
    current,
    previous,
    currentPath: buildChartPath(current, maxValue),
    previousPath: buildChartPath(previous, maxValue),
    maxValue,
    hasData: populatedValues.length > 0,
  };
  const hoveredCurrent = hoveredIndex === null ? null : chart.current[hoveredIndex];
  const hoveredPrevious = hoveredIndex === null ? null : chart.previous[hoveredIndex];
  const hoveredPriorDay = hoveredIndex === null || hoveredIndex === 0 ? null : chart.current[hoveredIndex - 1];
  const hoveredX = hoveredIndex === null
    ? 72
    : 72 + (hoveredIndex / Math.max(data.periodDays - 1, 1)) * 768;
  const tooltipX = hoveredX > 570 ? hoveredX - 258 : hoveredX + 10;
  const periodChange = getChange(hoveredCurrent, hoveredPrevious);
  const dayChange = getChange(hoveredCurrent, hoveredPriorDay);

  return (
    <section className="panel trend-panel">
      <PanelTitle
        title="Evolução diária: atual vs. anterior"
        subtitle="As duas linhas usam dias equivalentes dentro de janelas consecutivas, sem sobreposição."
        action={
          <div className="chart-tabs" aria-label="Métrica do gráfico">
            {chartMetrics.map((item) => (
              <button
                key={item.id}
                className={metric === item.id ? "active" : ""}
                aria-pressed={metric === item.id}
                onClick={() => {
                  setMetric(item.id);
                  setHoveredIndex(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      {chart.hasData ? (
        <>
          <div className="chart-legend">
            <span>
              <i className="chart-line current" /> Atual: {formatDate(data.dailyPerformance.currentFirstDate)} a {formatDate(data.dailyPerformance.currentLastDate)}
            </span>
            <span>
              <i className="chart-line previous" /> Anterior: {formatDate(data.dailyPerformance.previousFirstDate)} a {formatDate(data.dailyPerformance.previousLastDate)}
            </span>
          </div>
          <div className="chart-wrap">
            <svg
              className="comparison-chart"
              viewBox="0 0 860 260"
              role="img"
              aria-label={`Evolução diária de ${chartMetrics.find((item) => item.id === metric)?.label.toLowerCase()}, comparando período atual e anterior`}
              onMouseLeave={() => setHoveredIndex(null)}
            >
            {[20, 122, 224].map((y) => (
              <line key={y} className="chart-grid-line" x1="72" x2="840" y1={y} y2={y} />
            ))}
            <text className="chart-axis-text" x="62" y="24" textAnchor="end">
              {formatChartValue(metric, chart.maxValue)}
            </text>
            <text className="chart-axis-text" x="62" y="126" textAnchor="end">
              {formatChartValue(metric, chart.maxValue / 2)}
            </text>
            <text className="chart-axis-text" x="62" y="228" textAnchor="end">0</text>
            <text className="chart-axis-text" x="72" y="252">Dia 1</text>
            <text className="chart-axis-text" x="456" y="252" textAnchor="middle">
              Dia {Math.ceil(data.periodDays / 2)}
            </text>
            <text className="chart-axis-text" x="840" y="252" textAnchor="end">
              Dia {data.periodDays}
            </text>
            <path className="trend-line previous" d={chart.previousPath} />
            <path className="trend-line current" d={chart.currentPath} />
            {chart.current.map((value, index) =>
              value === null ? null : (
                <circle
                  key={`current-${index}`}
                  className="chart-point current"
                  cx={72 + (index / Math.max(data.periodDays - 1, 1)) * 768}
                  cy={20 + 204 - (value / chart.maxValue) * 204}
                  r={data.periodDays > 30 ? 1.7 : 2.8}
                />
              ),
            )}
            {chart.previous.map((value, index) =>
              value === null ? null : (
                <circle
                  key={`previous-${index}`}
                  className="chart-point previous"
                  cx={72 + (index / Math.max(data.periodDays - 1, 1)) * 768}
                  cy={20 + 204 - (value / chart.maxValue) * 204}
                  r={data.periodDays > 30 ? 1.7 : 2.8}
                />
              ),
            )}
            {Array.from({ length: data.periodDays }, (_, index) => {
              const step = 768 / Math.max(data.periodDays - 1, 1);
              const width = Math.max(step, 8);
              const x = 72 + index * step - width / 2;

              return (
                <rect
                  key={`hit-${index}`}
                  className="chart-hit-area"
                  x={x}
                  y="20"
                  width={width}
                  height="204"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
              );
            })}
            {hoveredIndex !== null && hoveredIndex < data.periodDays ? (
              <g className="chart-tooltip" pointerEvents="none">
                <line className="chart-hover-line" x1={hoveredX} x2={hoveredX} y1="20" y2="224" />
                {hoveredCurrent !== null && hoveredCurrent !== undefined ? (
                  <circle
                    className="chart-hover-point current"
                    cx={hoveredX}
                    cy={20 + 204 - (hoveredCurrent / chart.maxValue) * 204}
                    r="5"
                  />
                ) : null}
                {hoveredPrevious !== null && hoveredPrevious !== undefined ? (
                  <circle
                    className="chart-hover-point previous"
                    cx={hoveredX}
                    cy={20 + 204 - (hoveredPrevious / chart.maxValue) * 204}
                    r="5"
                  />
                ) : null}
                <rect className="chart-tooltip-box" x={tooltipX} y="28" width="248" height="105" rx="5" />
                <text className="chart-tooltip-title" x={tooltipX + 12} y="47">
                  Dia {hoveredIndex + 1}
                </text>
                <text className="chart-tooltip-text" x={tooltipX + 12} y="66">
                  Atual ({formatDate(shiftIsoDate(data.dailyPerformance.currentFirstDate, hoveredIndex))}): {hoveredCurrent === null || hoveredCurrent === undefined ? "Sem dado" : formatChartValue(metric, hoveredCurrent)}
                </text>
                <text className="chart-tooltip-text" x={tooltipX + 12} y="82">
                  Anterior ({formatDate(shiftIsoDate(data.dailyPerformance.previousFirstDate, hoveredIndex))}): {hoveredPrevious === null || hoveredPrevious === undefined ? "Sem dado" : formatChartValue(metric, hoveredPrevious)}
                </text>
                <text className={`chart-tooltip-change ${periodChange.direction}`} x={tooltipX + 12} y="101">
                  Vs. período anterior: {periodChange.label}
                </text>
                <text className={`chart-tooltip-change ${dayChange.direction}`} x={tooltipX + 12} y="118">
                  Vs. dia anterior: {dayChange.label}
                </text>
              </g>
            ) : null}
            </svg>
          </div>
        </>
      ) : (
        <div className="chart-empty-state">
          <BarChart3 size={22} />
          <span>{data.connected ? "Não há pontos diários neste recorte." : "O gráfico será exibido após a conexão com o Supabase."}</span>
        </div>
      )}
    </section>
  );
}

type ComparisonMetric = {
  current: number | null;
  previous: number | null;
  periodDays: number;
};

function ComparisonIndicator({ current, previous, periodDays, compact = false }: ComparisonMetric & { compact?: boolean }) {
  if (current === null || previous === null) {
    return (
      <span className={`comparison-indicator comparison-neutral${compact ? " comparison-compact" : ""}`}>
        <Minus size={13} /> Sem base anterior
      </span>
    );
  }

  if (previous === 0) {
    const hasGrowth = current > 0;

    return (
      <span className={`comparison-indicator comparison-${hasGrowth ? "up" : "neutral"}${compact ? " comparison-compact" : ""}`}>
        {hasGrowth ? <ArrowUpRight size={13} /> : <Minus size={13} />}
        {hasGrowth ? "Novo vs. período anterior" : "Sem variação vs. período anterior"}
      </span>
    );
  }

  const changePercent = ((current - previous) / Math.abs(previous)) * 100;
  const direction = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const formattedChange = Math.abs(changePercent).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <span
      className={`comparison-indicator comparison-${direction}${compact ? " comparison-compact" : ""}`}
      title={`Comparação com os ${periodDays} dias anteriores`}
    >
      <Icon size={13} /> {formattedChange}% vs. período anterior
    </span>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  comparison,
  featured = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "neutral" | "good" | "warning" | "brand";
  comparison?: ComparisonMetric;
  featured?: boolean;
}) {
  return (
    <article className={`kpi-card kpi-${tone}${featured ? " kpi-featured" : ""}`}>
      <div className="kpi-topline">
        <span>{label}</span>
        <span className="icon-box" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      {comparison ? <ComparisonIndicator {...comparison} /> : null}
    </article>
  );
}

function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function TopProductsTable({ data }: { data: DashboardData }) {
  if (!data.topProducts.length) {
    return <p className="empty-table-message">Ainda não há produtos no período selecionado.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th className="number-cell">Visitas</th>
            <th className="number-cell">Unid.</th>
            <th className="number-cell">Valor</th>
            <th className="number-cell">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {data.topProducts.slice(0, 8).map((product) => (
            <tr key={product.itemId}>
              <td className="primary-cell">{product.title}</td>
              <td className="number-cell">{formatNumber(product.visits)}</td>
              <td className="number-cell">{formatNumber(product.unitsSold)}</td>
              <td className="number-cell">{formatShortCurrency(product.grossAmount)}</td>
              <td className="number-cell">{formatPercent(product.conversionRatePercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductVariation({ current, previous }: { current: number; previous: number }) {
  const change = getChange(current, previous);
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;

  return (
    <span className={`product-variation variation-${change.direction}`}>
      <Icon size={13} /> {change.label}
    </span>
  );
}

function ProductRank({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null) {
    return (
      <span className="rank-cell rank-down">
        <strong>Sem vendas</strong>
        <small>{previous ? `Antes #${previous}` : "Fora do ranking"}</small>
      </span>
    );
  }

  if (previous === null) {
    return (
      <span className="rank-cell rank-up">
        <strong>#{current}</strong>
        <small>Novo no ranking</small>
      </span>
    );
  }

  const movement = previous - current;

  return (
    <span className={`rank-cell rank-${movement > 0 ? "up" : movement < 0 ? "down" : "neutral"}`}>
      <strong>#{current}</strong>
      <small>{movement > 0 ? `Subiu ${movement}` : movement < 0 ? `Caiu ${Math.abs(movement)}` : "Manteve"}</small>
    </span>
  );
}

function ProductComparisonTable({ data }: { data: DashboardData }) {
  if (!data.productComparisons.length) {
    return <p className="empty-table-message">Ainda não há produtos nos períodos comparados.</p>;
  }

  return (
    <div className="table-wrap product-comparison-wrap">
      <table className="product-comparison-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th className="number-cell">Visitas</th>
            <th className="number-cell">Pedidos</th>
            <th className="number-cell">Unid.</th>
            <th className="number-cell">Valor bruto</th>
            <th className="number-cell">Conv.</th>
            <th>Variação</th>
            <th>Posição por valor</th>
          </tr>
        </thead>
        <tbody>
          {data.productComparisons.slice(0, 12).map((product) => (
            <tr key={product.itemId}>
              <td className="primary-cell product-name-cell">
                <strong>{product.title}</strong>
                <small>{product.itemId}</small>
              </td>
              <td className="number-cell comparison-value-cell">
                <strong>{formatNumber(product.current.visits)}</strong>
                <small>ant. {formatNumber(product.previous.visits)}</small>
              </td>
              <td className="number-cell comparison-value-cell">
                <strong>{formatNumber(product.current.ordersCount)}</strong>
                <small>ant. {formatNumber(product.previous.ordersCount)}</small>
              </td>
              <td className="number-cell comparison-value-cell">
                <strong>{formatNumber(product.current.unitsSold)}</strong>
                <small>ant. {formatNumber(product.previous.unitsSold)}</small>
              </td>
              <td className="number-cell comparison-value-cell">
                <strong>{formatShortCurrency(product.current.grossAmount)}</strong>
                <small>ant. {formatShortCurrency(product.previous.grossAmount)}</small>
              </td>
              <td className="number-cell comparison-value-cell">
                <strong>{formatTablePercent(product.current.conversionRatePercent)}</strong>
                <small>ant. {formatTablePercent(product.previous.conversionRatePercent)}</small>
              </td>
              <td>
                <ProductVariation current={product.current.grossAmount} previous={product.previous.grossAmount} />
              </td>
              <td>
                <ProductRank current={product.currentRank} previous={product.previousRank} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewView({ data }: { data: DashboardData }) {
  const accountConversion = data.sales.conversionRatePercent;
  const unitsPerOrder = data.sales.ordersCount > 0 ? data.sales.unitsSold / data.sales.ordersCount : null;
  const previousUnitsPerOrder = data.comparison.sales && data.comparison.sales.ordersCount > 0
    ? data.comparison.sales.unitsSold / data.comparison.sales.ordersCount
    : null;
  const lowConversionProducts = accountConversion === null
    ? []
    : data.topProducts.filter(
        (product) =>
          product.visits > 0 &&
          product.conversionRatePercent !== null &&
          product.conversionRatePercent < accountConversion,
      );
  const stockRiskProducts = data.topProducts.filter(
    (product) =>
      product.availableQuantity !== null &&
      product.unitsSold > 0 &&
      product.availableQuantity <= product.unitsSold,
  );
  const decliningProducts = data.productComparisons.filter(
    (product) =>
      product.previous.grossAmount > 0 &&
      product.current.grossAmount < product.previous.grossAmount * 0.9,
  );

  return (
    <>
      <section className="kpi-grid executive-kpis">
        <KpiCard
          label="Valor bruto"
          value={formatShortCurrency(data.sales.grossAmount)}
          detail={`Resultado acumulado em ${data.periodDays} dias`}
          icon={CircleDollarSign}
          tone="brand"
          featured
          comparison={{
            current: data.sales.grossAmount,
            previous: data.comparison.sales?.grossAmount ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Pedidos"
          value={formatNumber(data.sales.ordersCount)}
          detail={`Janela de ${data.periodDays} dias`}
          icon={ShoppingBag}
          comparison={{
            current: data.sales.ordersCount,
            previous: data.comparison.sales?.ordersCount ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Ticket médio"
          value={data.sales.avgTicket === null ? "Após conexão" : formatShortCurrency(data.sales.avgTicket)}
          detail="Valor bruto dividido por pedidos"
          icon={Gauge}
          tone="good"
          comparison={{
            current: data.sales.avgTicket,
            previous: data.comparison.sales?.avgTicket ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Unidades vendidas"
          value={formatNumber(data.sales.unitsSold)}
          detail={unitsPerOrder === null ? "Sem pedidos no período" : `${unitsPerOrder.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} por pedido`}
          icon={TrendingUp}
          tone="warning"
          comparison={{
            current: unitsPerOrder,
            previous: previousUnitsPerOrder,
            periodDays: data.periodDays,
          }}
        />
      </section>

      <section className="panel commerce-flow-panel">
        <PanelTitle
          title="Motor comercial do período"
          subtitle="A leitura conecta aquisição de tráfego, eficiência do anúncio e resultado comercial."
          action={<span className="tiny-label">{data.periodDays} dias</span>}
        />
        <div className="commerce-flow" aria-label="Visitas, conversão, pedidos e valor bruto">
          <div className="commerce-flow-step">
            <span className="flow-icon"><Eye size={17} /></span>
            <small>01 · Tráfego</small>
            <strong>{data.sales.visits === null ? "Após conexão" : formatNumber(data.sales.visits)}</strong>
            <p>Visitas aos anúncios</p>
          </div>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <div className="commerce-flow-step">
            <span className="flow-icon"><Gauge size={17} /></span>
            <small>02 · Eficiência</small>
            <strong>{formatPercent(data.sales.conversionRatePercent)}</strong>
            <p>Pedidos por visita</p>
          </div>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <div className="commerce-flow-step">
            <span className="flow-icon"><ShoppingBag size={17} /></span>
            <small>03 · Demanda</small>
            <strong>{formatNumber(data.sales.ordersCount)}</strong>
            <p>Pedidos confirmados</p>
          </div>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <div className="commerce-flow-step flow-result">
            <span className="flow-icon"><CircleDollarSign size={17} /></span>
            <small>04 · Resultado</small>
            <strong>{formatShortCurrency(data.sales.grossAmount)}</strong>
            <p>Valor bruto vendido</p>
          </div>
        </div>
      </section>

      <PeriodComparisonChart data={data} />

      <section className="content-grid two-one">
        <article className="panel coverage-panel">
          <PanelTitle
            title="Cobertura do catálogo"
            subtitle="Todos os anúncios e vendas entram em uma única leitura comercial, sem duplicidade entre fontes."
            action={<span className="tiny-label">{formatNumber(data.catalog.total)} anúncios</span>}
          />
          <div className="coverage-bar" aria-label="Composição do catálogo consolidado">
            <span
              className="coverage-current"
              style={{ width: `${data.catalog.total ? (data.catalog.current / data.catalog.total) * 100 : 0}%` }}
            />
            <span
              className="coverage-history"
              style={{ width: `${data.catalog.total ? (data.catalog.retained / data.catalog.total) * 100 : 0}%` }}
            />
          </div>
          <div className="legend-row">
            <span>
              <i className="legend-dot dot-cyan" />Com atributos atuais <b>{formatNumber(data.catalog.current)}</b>
            </span>
            <span>
              <i className="legend-dot dot-amber" />Histórico preservado <b>{formatNumber(data.catalog.retained)}</b>
            </span>
            <span>
              <i className="legend-dot dot-neutral" />Pendências <b>{formatNumber(data.catalog.unknown)}</b>
            </span>
          </div>
          <div className="coverage-numbers">
            <div>
              <strong>{formatNumber(data.catalog.current)}</strong>
              <span>Com preço, estoque e status</span>
            </div>
            <div>
              <strong>{formatNumber(data.catalog.retained)}</strong>
              <span>Preservados pelas vendas</span>
            </div>
            <div>
              <strong>{formatNumber(data.catalog.unknown)}</strong>
              <span>Itens sem classificação</span>
            </div>
          </div>
        </article>

        <article className="panel decision-panel">
          <PanelTitle title="Leitura para decisão" subtitle="O que merece atenção agora" />
          <ul className="decision-list">
            <li>
              <span className={`decision-icon ${lowConversionProducts.length ? "warning" : "good"}`}>
                {lowConversionProducts.length ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
              </span>
              <div>
                <strong>{lowConversionProducts.length ? `${lowConversionProducts.length} anúncios abaixo da conversão média` : "Conversão sem alerta entre os líderes"}</strong>
                <small>{lowConversionProducts.length ? "Priorize preço, oferta e conteúdo nos produtos que já recebem visitas." : "Nenhum produto do ranking está abaixo da média da conta com a base disponível."}</small>
              </div>
            </li>
            <li>
              <span className={`decision-icon ${stockRiskProducts.length ? "warning" : "good"}`}>
                {stockRiskProducts.length ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
              </span>
              <div>
                <strong>{stockRiskProducts.length ? `${stockRiskProducts.length} anúncios com sinal de estoque curto` : "Sem risco de estoque entre os líderes"}</strong>
                <small>{stockRiskProducts.length ? "O estoque disponível é menor ou igual às unidades vendidas na janela." : "Os produtos do ranking não atingiram o critério de atenção desta leitura."}</small>
              </div>
            </li>
            <li>
              <span className={`decision-icon ${decliningProducts.length ? "warning" : "brand"}`}>
                {decliningProducts.length ? <ArrowDownRight size={17} /> : <Zap size={17} />}
              </span>
              <div>
                <strong>{decliningProducts.length ? `${decliningProducts.length} produtos caíram mais de 10%` : "Sem queda relevante na comparação disponível"}</strong>
                <small>{decliningProducts.length ? `Comparação contra os ${data.periodDays} dias imediatamente anteriores.` : "A leitura será refinada conforme o histórico comparável crescer."}</small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section className="panel table-panel">
        <PanelTitle
          title="Top produtos por valor bruto"
          subtitle={`Desempenho acumulado na janela de ${data.periodDays} dias.`}
        />
        <TopProductsTable data={data} />
      </section>
    </>
  );
}

function SalesView({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="context-banner">
        <div>
          <Database size={18} />
          <span>
            <strong>Recorte validado:</strong> vendas associadas ao catálogo consolidado.
          </span>
        </div>
        <span>Última data: {formatDate(data.sales.lastPerformanceDate)}</span>
      </div>
      <section className="kpi-grid">
        <KpiCard
          label="Valor bruto"
          value={formatCurrency(data.sales.grossAmount)}
          detail="Período selecionado"
          icon={CircleDollarSign}
          tone="brand"
          comparison={{
            current: data.sales.grossAmount,
            previous: data.comparison.sales?.grossAmount ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Pedidos"
          value={formatNumber(data.sales.ordersCount)}
          detail="Pedidos no recorte"
          icon={ShoppingBag}
          comparison={{
            current: data.sales.ordersCount,
            previous: data.comparison.sales?.ordersCount ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Unidades"
          value={formatNumber(data.sales.unitsSold)}
          detail={`${(data.sales.unitsSold / Math.max(data.sales.ordersCount, 1)).toLocaleString("pt-BR", {
            maximumFractionDigits: 2,
          })} unidade por pedido`}
          icon={Box}
          tone="good"
          comparison={{
            current: data.sales.unitsSold,
            previous: data.comparison.sales?.unitsSold ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Média por pedido"
          value={data.sales.avgTicket === null ? "Após conexão" : formatCurrency(data.sales.avgTicket)}
          detail="Valor bruto dividido por pedidos"
          icon={Gauge}
          comparison={{
            current: data.sales.avgTicket,
            previous: data.comparison.sales?.avgTicket ?? null,
            periodDays: data.periodDays,
          }}
        />
      </section>

      <PeriodComparisonChart data={data} />

      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Dimensão do período" subtitle="Escala dos registros carregados para a análise" />
          <div className="metric-bars">
            <div className="metric-bar-row">
              <div>
                <span>Pedidos</span>
                <strong>{formatNumber(data.sales.ordersCount)}</strong>
              </div>
              <div className="track">
                <span style={{ width: "86%" }} />
              </div>
            </div>
            <div className="metric-bar-row">
              <div>
                <span>Unidades</span>
                <strong>{formatNumber(data.sales.unitsSold)}</strong>
              </div>
              <div className="track">
                <span style={{ width: "100%" }} />
              </div>
            </div>
            <div className="metric-bar-row amber">
              <div>
                <span>Itens no catálogo</span>
                <strong>{formatNumber(data.catalog.total)}</strong>
              </div>
              <div className="track">
                <span style={{ width: `${Math.max(data.catalog.retainedShare, 8)}%` }} />
              </div>
            </div>
          </div>
        </article>
        <article className="panel">
          <PanelTitle title="Regras de leitura" subtitle="Como os números devem ser interpretados" />
          <div className="rule-list">
            <div>
              <span>01</span>
              <p>
                <strong>Conversão = pedidos ÷ visitas.</strong> Mede a parcela de visitas que resultou em um pedido.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Ticket médio = valor bruto ÷ pedidos.</strong> Mostra o valor médio movimentado por pedido.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Unidades por pedido = unidades ÷ pedidos.</strong> Indica a quantidade média de itens em cada pedido.
              </p>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function ProductsView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="kpi-grid">
        <KpiCard label="Catálogo total" value={formatNumber(data.catalog.total)} detail="Sem duplicidade entre fontes" icon={Box} tone="brand" />
        <KpiCard label="Com dados operacionais" value={formatNumber(data.catalog.current)} detail="Preço, estoque e status disponíveis" icon={ShoppingBag} />
        <KpiCard
          label="Unidades vendidas"
          value={formatNumber(data.sales.unitsSold)}
          detail={`Janela de ${data.periodDays} dias`}
          icon={TrendingUp}
          tone="warning"
          comparison={{
            current: data.sales.unitsSold,
            previous: data.comparison.sales?.unitsSold ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard
          label="Cobertura classificada"
          value={data.catalog.unknown === 0 ? "100%" : `${formatNumber(data.catalog.unknown)} pend.`}
          detail="Origem conhecida em todos os itens"
          icon={CheckCircle2}
          tone="good"
        />
      </section>
      <section className="panel table-panel">
        <PanelTitle
          title="Comparação por produto"
          subtitle={`Desempenho dos ${data.periodDays} dias selecionados contra os ${data.periodDays} dias imediatamente anteriores.`}
        />
        <ProductComparisonTable data={data} />
      </section>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Ações operacionais" subtitle={`Aplicáveis aos ${formatNumber(data.catalog.current)} anúncios operacionais`} />
          <div className="action-grid">
            <div>
              <span className="action-icon">
                <Box size={18} />
              </span>
              <p>
                <strong>Estoque crítico</strong>
                <small>Priorizar reposição por giro e valor vendido.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Após conexão"}</b>
            </div>
            <div>
              <span className="action-icon">
                <Activity size={18} />
              </span>
              <p>
                <strong>Anúncio pausado com estoque</strong>
                <small>Identificar receita potencial bloqueada.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Após conexão"}</b>
            </div>
            <div>
              <span className="action-icon">
                <Search size={18} />
              </span>
              <p>
                <strong>Sem venda com visita</strong>
                <small>Revisar preço, conteúdo e oferta.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Após conexão"}</b>
            </div>
          </div>
        </article>
        <article className="panel data-note">
          <PanelTitle title="Regras de uso dos dados" />
          <div className="split-visual">
            <div className="split-current">
              <span>Decisão comercial</span>
              <strong>Venda | Receita | Conversão</strong>
              <small>Considera o catálogo consolidado</small>
            </div>
            <div className="split-history">
              <span>Decisão operacional</span>
              <strong>Preço | Estoque | Status</strong>
              <small>Usa os atributos atuais disponíveis</small>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function PerformanceView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="formula-strip">
        <div>
          <Eye size={18} />
          <span>Visitas</span>
        </div>
        <b>+</b>
        <div>
          <ShoppingBag size={18} />
          <span>Unidades vendidas</span>
        </div>
        <b>+</b>
        <div>
          <Box size={18} />
          <span>Preço e status</span>
        </div>
        <b>=</b>
        <div className="formula-result">
          <TrendingUp size={18} />
          <span>Decisão por produto</span>
        </div>
      </section>
      <section className="kpi-grid">
        <KpiCard label="Janela de pedidos" value={`${data.periodDays} dias`} detail="Atualização móvel" icon={CalendarDays} tone="brand" />
        <KpiCard
          label="Visitas"
          value={data.sales.visits === null ? "Após conexão" : formatNumber(data.sales.visits)}
          detail="Detalhamento diário"
          icon={Eye}
          comparison={{
            current: data.sales.visits,
            previous: data.comparison.sales?.visits ?? null,
            periodDays: data.periodDays,
          }}
        />
        <KpiCard label="Grão analítico" value="Item + dia" detail="Comparação no mesmo nível" icon={Database} />
        <KpiCard
          label="Conversão"
          value={formatPercent(data.sales.conversionRatePercent)}
          detail="Pedidos divididos por visitas"
          icon={Gauge}
          tone="good"
          comparison={{
            current: data.sales.conversionRatePercent,
            previous: data.comparison.sales?.conversionRatePercent ?? null,
            periodDays: data.periodDays,
          }}
        />
      </section>
      <section className="panel table-panel">
        <PanelTitle
          title={data.topProducts.length ? "Top produtos por valor bruto" : "Matriz de decisão por produto"}
          subtitle={data.topProducts.length ? "Produtos agregados pela view diária do Supabase." : "Estrutura pronta para receber as métricas reais do Supabase."}
        />
        <div className="table-wrap">
          <table>
            {data.topProducts.length ? (
              <>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="number-cell">Visitas</th>
                    <th className="number-cell">Unid.</th>
                    <th className="number-cell">Valor</th>
                    <th className="number-cell">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.slice(0, 8).map((product) => (
                    <tr key={product.itemId}>
                      <td className="primary-cell">{product.title}</td>
                      <td className="number-cell">{formatNumber(product.visits)}</td>
                      <td className="number-cell">{formatNumber(product.unitsSold)}</td>
                      <td className="number-cell">{formatShortCurrency(product.grossAmount)}</td>
                      <td className="number-cell">{formatPercent(product.conversionRatePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Sinal</th>
                    <th>Leitura</th>
                    <th>Decisão sugerida</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="primary-cell">Muita visita + pouca venda</td>
                    <td>Conversão baixa</td>
                    <td>Rever preço, frete e conteúdo</td>
                    <td>
                      <span className="status-badge status-warning">Alta</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Pouca visita + boa conversão</td>
                    <td>Oferta eficiente, alcance baixo</td>
                    <td>Aumentar exposição</td>
                    <td>
                      <span className="status-badge status-good">Oportunidade</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Boa venda + estoque baixo</td>
                    <td>Risco de ruptura</td>
                    <td>Priorizar reposição</td>
                    <td>
                      <span className="status-badge status-warning">Alta</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Sem visita + sem venda</td>
                    <td>Anúncio sem tração</td>
                    <td>Reavaliar permanência e cadastro</td>
                    <td>
                      <span className="status-badge status-neutral">Média</span>
                    </td>
                  </tr>
                </tbody>
              </>
            )}
          </table>
        </div>
      </section>
    </>
  );
}

function TrafficView({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="empty-data-hero">
        <span className="hero-icon">
          <Eye size={26} />
        </span>
        <div>
          <h2>Tráfego e conversão em janela móvel de {data.periodDays} dias</h2>
          <p>
            A visão usa <code>item_visits_daily</code> cruzada com vendas no mesmo item e data.
          </p>
        </div>
        <span className="status-badge status-good">{data.connected ? "Supabase ativo" : "Estrutura pronta"}</span>
      </div>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Funil do anúncio" subtitle="Da exposição à venda" />
          <div className="funnel">
            <div style={{ width: "100%" }}>
              <span>Visitas</span>
              <div className="funnel-value">
                <b>{data.sales.visits === null ? "Após conexão" : formatNumber(data.sales.visits)}</b>
                <ComparisonIndicator
                  current={data.sales.visits}
                  previous={data.comparison.sales?.visits ?? null}
                  periodDays={data.periodDays}
                  compact
                />
              </div>
            </div>
            <div style={{ width: "78%" }}>
              <span>Pedidos</span>
              <div className="funnel-value">
                <b>{formatNumber(data.sales.ordersCount)}</b>
                <ComparisonIndicator
                  current={data.sales.ordersCount}
                  previous={data.comparison.sales?.ordersCount ?? null}
                  periodDays={data.periodDays}
                  compact
                />
              </div>
            </div>
            <div style={{ width: "56%" }}>
              <span>Unidades vendidas</span>
              <div className="funnel-value">
                <b>{formatNumber(data.sales.unitsSold)}</b>
                <ComparisonIndicator
                  current={data.sales.unitsSold}
                  previous={data.comparison.sales?.unitsSold ?? null}
                  periodDays={data.periodDays}
                  compact
                />
              </div>
            </div>
          </div>
        </article>
        <article className="panel">
          <PanelTitle title="Perguntas respondidas" subtitle="Decisões que esta aba deve acelerar" />
          <ul className="question-list">
            <li>
              <CheckCircle2 size={17} />Quais anúncios atraem público, mas não convertem?
            </li>
            <li>
              <CheckCircle2 size={17} />Quais convertem bem e merecem mais exposição?
            </li>
            <li>
              <CheckCircle2 size={17} />Onde preço e status explicam queda de demanda?
            </li>
            <li>
              <CheckCircle2 size={17} />Quais itens ativos estão invisíveis para o mercado?
            </li>
          </ul>
        </article>
      </section>
    </>
  );
}

function SellerView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="seller-header panel">
        <div className="seller-avatar">
          <Store size={24} />
        </div>
        <div>
          <span>Conta Mercado Livre</span>
          <h2>{data.accountName}</h2>
          <p>Snapshot diário para acompanhar reputação e qualidade operacional.</p>
        </div>
        <span className="status-badge status-good">{data.connected ? "Supabase ativo" : "Conta ativa"}</span>
      </section>
      <section className="kpi-grid muted-kpis">
        <KpiCard label="Reputação" value="-" detail="Último snapshot do seller" icon={ShieldCheck} tone="brand" />
        <KpiCard label="Cancelamentos" value="-" detail="Evolução por período" icon={X} />
        <KpiCard label="Reclamações" value="-" detail="Evolução por período" icon={Users} />
        <KpiCard label="Atrasos" value="-" detail="Evolução por período" icon={Activity} />
      </section>
      <section className="panel">
        <PanelTitle title="Linha de acompanhamento" subtitle="A série diária mostrará mudança, tendência e alertas de reputação." />
        <div className="timeline-placeholder">
          {[28, 35, 31, 48, 42, 58, 62, 60, 72, 68, 76, 82].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>
    </>
  );
}

function QualityView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="kpi-grid">
        <KpiCard label="Itens classificados" value={`${formatNumber(data.catalog.total - data.catalog.unknown)} / ${formatNumber(data.catalog.total)}`} detail="Cobertura de origem completa" icon={CheckCircle2} tone="good" />
        <KpiCard label="Com atributos atuais" value={formatNumber(data.catalog.current)} detail="Preço, estoque e status disponíveis" icon={Zap} tone="brand" />
        <KpiCard label="Cobertura complementar" value={formatNumber(data.catalog.retained)} detail="Registros comerciais preservados" icon={Database} tone="warning" />
        <KpiCard label="Pendência desconhecida" value={formatNumber(data.catalog.unknown)} detail="Itens sem tratamento" icon={ShieldCheck} tone="good" />
      </section>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Pipelines de dados" subtitle="Cobertura e período de cada domínio" />
          <div className="pipeline-list">
            {pipelineRows.map((row) => (
              <div key={row.name}>
                <span className="pipeline-icon">
                  <RefreshCw size={16} />
                </span>
                <p>
                  <strong>{row.name}</strong>
                  <small>{row.window}</small>
                </p>
                <span className="status-badge status-good">{row.status}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <PanelTitle title="Tratamento da cobertura" subtitle="Resultado do saneamento dos anúncios vendidos" />
          <div className="backfill-flow">
            <div>
              <span>176</span>
              <small>Itens faltantes no início</small>
            </div>
            <i />
            <div>
              <span>73</span>
              <small>Recuperados pela API</small>
            </div>
            <i />
            <div className="highlight">
              <span>{formatNumber(data.catalog.retained)}</span>
              <small>Integrados pelo histórico de pedidos</small>
            </div>
          </div>
          <p className="backfill-note">
            <AlertTriangle size={16} />Os atributos operacionais dependem da API; o histórico comercial permanece completo para análise.
          </p>
        </article>
      </section>
    </>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [period, setPeriod] = useState("30d");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(FALLBACK_DASHBOARD_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const activeMeta = viewMeta[activeView];
  const periodDays = periodToDays(period);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/dashboard?periodDays=${periodDays}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o dashboard.");
        }

        return response.json() as Promise<DashboardData>;
      })
      .then((data) => setDashboardData(data))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setDashboardData({
            ...FALLBACK_DASHBOARD_DATA,
            periodDays,
            message: error instanceof Error ? error.message : "Erro ao carregar dados.",
          });
        }
      })
      .finally(() => setIsRefreshing(false));

    return () => controller.abort();
  }, [periodDays, refreshNonce]);

  const content = useMemo(() => {
    switch (activeView) {
      case "sales":
        return <SalesView data={dashboardData} />;
      case "products":
        return <ProductsView data={dashboardData} />;
      case "performance":
        return <PerformanceView data={dashboardData} />;
      case "traffic":
        return <TrafficView data={dashboardData} />;
      case "seller":
        return <SellerView data={dashboardData} />;
      case "quality":
        return <QualityView data={dashboardData} />;
      default:
        return <OverviewView data={dashboardData} />;
    }
  }, [activeView, dashboardData]);

  function changeView(view: ViewId) {
    setActiveView(view);
    setMobileOpen(false);
  }

  function changePeriod(nextPeriod: string) {
    if (nextPeriod !== period) {
      setIsRefreshing(true);
      setPeriod(nextPeriod);
    }
  }

  function refreshData() {
    setIsRefreshing(true);
    setRefreshNonce((current) => current + 1);
  }

  return (
    <main className="dashboard-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <Image src="/pcxpress-logo.webp" alt="PCXpress" width={160} height={67} priority />
          <span>Mercado Livre Analytics</span>
        </div>
        <nav aria-label="Navegação principal">
          <p className="nav-section-label">Análises</p>
          {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => changeView(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
          <p className="nav-section-label secondary">Controle</p>
          {navItems.slice(5).map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => changeView(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="health-dot" />
          <div>
            <strong>{dashboardData.connected ? "Supabase conectado" : "Dados de fallback"}</strong>
            <small>{dashboardData.message ?? "Dados operacionais"}</small>
          </div>
        </div>
      </aside>

      {mobileOpen ? <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} /> : null}

      <section className="main-stage">
        <header className="topbar">
          <button className="menu-button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="account-filter">
            <span className="account-mark">
              <Store size={17} />
            </span>
            <div>
              <small>Conta</small>
              <strong>{dashboardData.accountName}</strong>
            </div>
            <ChevronDown size={16} />
          </div>
          <div className="topbar-right">
            <span className={dashboardData.connected ? "sync-state" : "sync-state sync-warning"}>
              <CheckCircle2 size={15} /> {dashboardData.connected ? "Supabase ativo" : "Fallback local"}
            </span>
            <div className="period-control" aria-label="Período">
              {["7d", "30d", "90d"].map((item) => (
                <button key={item} className={period === item ? "active" : ""} onClick={() => changePeriod(item)}>
                  {item}
                </button>
              ))}
            </div>
            <button className="icon-button" title="Atualizar visualização" aria-label="Atualizar visualização" onClick={refreshData}>
              <RefreshCw size={18} className={isRefreshing ? "spin-icon" : ""} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">PCXpress | Mercado Livre</p>
              <h1>{activeMeta.title}</h1>
              <p>{activeMeta.description}</p>
            </div>
            <div className="date-chip">
              <CalendarDays size={16} />
              <span>
                Período atual vs. <strong>{periodDays} dias anteriores</strong>
              </span>
            </div>
          </div>
          {content}
        </div>
      </section>
    </main>
  );
}
