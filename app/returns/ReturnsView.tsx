"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Hourglass,
  Minus,
  PackageOpen,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { evaluateTrend, type SignalTone } from "../metric-signals";
import {
  INCLUDE_PNR,
  OPERATIONAL_ERROR_ALERT_INCREASE_POINTS,
  PROVISIONAL_WINDOW_DAYS,
  STALLED_DAYS_THRESHOLD,
} from "./returns-config";
import {
  RETURN_STAGE_LABELS,
  buildClosing,
  buildOverviewAlerts,
  buildTracking,
  type ClosingTotals,
  type OpenReturnRow,
  type StageCounter,
} from "./returns-metrics";
import type {
  ReasonFamily,
  ReturnsFamilyFilter,
  ReturnsFilters,
  ReturnsLogisticsFilter,
  ReturnsPayload,
} from "./returns-types";

// -----------------------------------------------------------------------------
// Formatação (pt-BR, valores monetários sempre completos)
// -----------------------------------------------------------------------------

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "Sem base";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatMonth(month: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function familyLabel(family: ReasonFamily | null) {
  if (family === "PDD") return "PDD · defeito ou diferente do anunciado";
  if (family === "PNR") return "PNR · produto não recebido";
  return "Família não informada";
}

const LOGISTICS_OPTIONS: { value: ReturnsLogisticsFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "exclude_fulfillment", label: "Sem Full" },
  { value: "cross_docking", label: "Cross docking" },
  { value: "flex", label: "Flex" },
  { value: "fulfillment", label: "Só Full" },
];

const FAMILY_OPTIONS: { value: ReturnsFamilyFilter; label: string }[] = INCLUDE_PNR
  ? [
      { value: "all", label: "Todas" },
      { value: "PDD", label: "PDD" },
      { value: "PNR", label: "PNR" },
    ]
  : [
      { value: "all", label: "Todas" },
      { value: "PDD", label: "PDD" },
    ];

// -----------------------------------------------------------------------------
// Peças visuais
// -----------------------------------------------------------------------------

const toneClass: Record<SignalTone, string> = {
  good: "comparison-up",
  bad: "comparison-down",
  attention: "comparison-neutral",
  neutral: "comparison-neutral",
};

/** Mais devolução é pior: a cor segue metric-signals com "lowerIsBetter". */
function ReturnsTrend({
  current,
  previous,
  reference,
  format = formatNumber,
}: {
  current: number | null;
  previous: number | null;
  reference: string;
  format?: (value: number) => string;
}) {
  if (previous === null) {
    return (
      <span className="comparison-indicator comparison-neutral returns-trend">
        <Minus size={13} /> Sem comparação
      </span>
    );
  }

  const signal = evaluateTrend(current, previous, "lowerIsBetter");
  const Icon = signal.arrow === "up" ? ArrowUpRight : signal.arrow === "down" ? ArrowDownRight : Minus;
  const prefix = signal.changePercent === null ? "" : signal.arrow === "up" ? "+" : signal.arrow === "down" ? "−" : "";

  return (
    <span className={`comparison-indicator returns-trend ${toneClass[signal.tone]}`} title={`Comparação: ${reference}`}>
      <Icon size={13} /> {prefix}{signal.label} · antes {format(previous)} {reference}
    </span>
  );
}

function ReturnsKpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Undo2;
  tone?: "neutral" | "good" | "warning" | "brand";
  trend?: React.ReactNode;
}) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <div className="kpi-topline">
        <span>{label}</span>
        <span className="icon-box" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      {trend}
    </article>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
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

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="returns-filter">
      <span>{label}</span>
      <div className="chart-tabs" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReturnsEmptyState({ payload }: { payload: ReturnsPayload }) {
  const detail: Record<string, string> = {
    tables_missing: "As tabelas de devoluções ainda não foram criadas no Supabase. Depois da migração e da primeira ingestão, os números aparecem aqui automaticamente.",
    empty: "As tabelas de devoluções já existem, mas ainda não receberam nenhuma devolução da ingestão.",
    not_configured: "A conexão com o Supabase não está configurada neste ambiente.",
    error: "Não foi possível consultar as devoluções nesta atualização. Nenhum valor foi tratado como zero.",
  };

  return (
    <section className="panel">
      <div className="chart-empty-state returns-empty-state">
        <PackageOpen size={22} />
        <div>
          <strong>Aguardando dados de devoluções</strong>
          <p>{detail[payload.status] ?? detail.empty}</p>
          {payload.status === "error" && payload.message ? <small>Detalhe técnico: {payload.message}</small> : null}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// A. Acompanhamento
// -----------------------------------------------------------------------------

type SortKey = "order" | "listing" | "reason" | "stage" | "days" | "amount";

function sortValue(row: OpenReturnRow, key: SortKey): string | number {
  switch (key) {
    case "order":
      return row.orderId ?? "";
    case "listing":
      return row.listingTitle ?? row.mlbId ?? "";
    case "reason":
      return row.reasonName ?? row.reasonId ?? "";
    case "stage":
      return row.stage ? RETURN_STAGE_LABELS[row.stage] : "~";
    case "days":
      return row.daysInStage ?? -1;
    case "amount":
      return row.amount ?? -1;
  }
}

const OPEN_ROWS_PREVIEW = 25;

function OpenReturnsTable({ rows }: { rows: OpenReturnRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [descending, setDescending] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      const order = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "pt-BR");
      return descending ? -order : order;
    });
    return copy;
  }, [rows, sortKey, descending]);

  if (!rows.length) {
    return <p className="empty-table-message">Nenhuma devolução em aberto com os filtros selecionados.</p>;
  }

  const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: "order", label: "Pedido" },
    { key: "listing", label: "Anúncio" },
    { key: "reason", label: "Motivo" },
    { key: "stage", label: "Etapa atual" },
    { key: "days", label: "Dias na etapa", numeric: true },
    { key: "amount", label: "Valor", numeric: true },
  ];

  function toggle(key: SortKey) {
    if (key === sortKey) {
      setDescending((current) => !current);
    } else {
      setSortKey(key);
      setDescending(key === "days" || key === "amount");
    }
  }

  return (
    <div className="table-wrap">
      <table className="returns-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.numeric ? "number-cell" : undefined}
                aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}
              >
                <button type="button" className="returns-sort" onClick={() => toggle(column.key)}>
                  {column.label} <ArrowUpDown size={11} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(showAll ? sorted : sorted.slice(0, OPEN_ROWS_PREVIEW)).map((row) => (
            <tr key={row.claimId} className={row.stalled ? "returns-row-stalled" : undefined}>
              <td>{row.orderId ?? "—"}</td>
              <td>
                <strong className="returns-cell-title">{row.listingTitle ?? "Anúncio não informado"}</strong>
                <small>{row.mlbId ?? "Sem MLB"}</small>
              </td>
              <td>
                {row.reasonName ?? row.reasonId ?? "Não informado"}
                {row.family ? <small>{row.family}</small> : null}
              </td>
              <td>
                {row.stage ? RETURN_STAGE_LABELS[row.stage] : (
                  <span className="returns-badge warning" title={`Status recebido: ${row.rawStatus ?? "vazio"}`}>
                    Status não mapeado
                  </span>
                )}
              </td>
              <td className="number-cell">
                {row.daysInStage === null ? "—" : formatNumber(row.daysInStage)}
                {row.stalled ? <span className="returns-badge danger">Parada</span> : null}
              </td>
              <td className="number-cell">{row.amount === null ? "—" : formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > OPEN_ROWS_PREVIEW ? (
        <button type="button" className="secondary-button returns-show-all" onClick={() => setShowAll((current) => !current)}>
          {showAll ? `Mostrar só as ${OPEN_ROWS_PREVIEW} primeiras` : `Mostrar todas as ${formatNumber(rows.length)}`}
        </button>
      ) : null}
    </div>
  );
}

function counterTrend(counter: StageCounter, reference: string | null) {
  return reference ? <ReturnsTrend current={counter.current} previous={counter.comparison} reference={reference} /> : undefined;
}

function TrackingView({ payload, filters }: { payload: ReturnsPayload; filters: ReturnsFilters }) {
  const tracking = useMemo(() => buildTracking(payload, filters, STALLED_DAYS_THRESHOLD), [payload, filters]);
  const { counters, funnel } = tracking;
  const positionReference = tracking.comparisonCutoffDate ? `em ${formatDate(tracking.comparisonCutoffDate)}` : null;
  const periodReference = payload.window.comparisonStart && payload.window.comparisonEnd
    ? `(${formatDate(payload.window.comparisonStart)} a ${formatDate(payload.window.comparisonEnd)})`
    : null;
  const funnelMax = Math.max(1, ...funnel.map((item) => item.count), tracking.funnelUnmapped);

  return (
    <>
      <section className="kpi-grid">
        <ReturnsKpi
          label="Abertas"
          value={formatNumber(counters.open.current)}
          detail="Aguardando o comprador postar o produto. Posição atual."
          icon={Undo2}
          tone="brand"
          trend={counterTrend(counters.open, positionReference)}
        />
        <ReturnsKpi
          label="A caminho"
          value={formatNumber(counters.inTransit.current)}
          detail="Postadas pelo comprador, em trânsito até a loja. Posição atual."
          icon={Truck}
          trend={counterTrend(counters.inTransit, positionReference)}
        />
        <ReturnsKpi
          label="Recebidas, aguardando revisão"
          value={formatNumber(counters.awaitingReview.current)}
          detail="Chegaram à loja e ainda não foram revisadas. Posição atual."
          icon={Hourglass}
          tone="warning"
          trend={counterTrend(counters.awaitingReview, positionReference)}
        />
        <ReturnsKpi
          label="Reembolsadas no período"
          value={formatNumber(counters.refunded.current)}
          detail="Reembolsos concluídos dentro do período selecionado."
          icon={Wallet}
          trend={counterTrend(counters.refunded, periodReference)}
        />
      </section>

      <section className="content-grid two-one">
        <article className="panel">
          <SectionTitle
            title="Funil por etapa"
            subtitle={`Devoluções abertas no período selecionado (${formatNumber(tracking.funnelTotal)}), pela etapa em que estão hoje.`}
            action={periodReference ? (
              <ReturnsTrend current={tracking.openedInPeriod.current} previous={tracking.openedInPeriod.comparison} reference={periodReference} />
            ) : undefined}
          />
          <ol className="returns-funnel">
            {funnel.map((item) => (
              <li key={item.stage}>
                <span>{item.label}</span>
                <div className="returns-funnel-track" aria-hidden="true">
                  <div className={`returns-funnel-bar stage-${item.stage}`} style={{ width: `${(item.count / funnelMax) * 100}%` }} />
                </div>
                <strong>{formatNumber(item.count)}</strong>
              </li>
            ))}
            {tracking.funnelUnmapped ? (
              <li className="returns-funnel-unmapped">
                <span>Status não mapeado</span>
                <div className="returns-funnel-track" aria-hidden="true">
                  <div className="returns-funnel-bar" style={{ width: `${(tracking.funnelUnmapped / funnelMax) * 100}%` }} />
                </div>
                <strong>{formatNumber(tracking.funnelUnmapped)}</strong>
              </li>
            ) : null}
          </ol>
        </article>

        <article className="panel">
          <SectionTitle
            title={`Paradas há mais de ${STALLED_DAYS_THRESHOLD} dias`}
            subtitle="Limite provisório, configurável em returns-config.ts."
          />
          <div className="returns-stalled-callout">
            <span className={`decision-icon ${tracking.stalledCount ? "warning" : "good"}`}>
              {tracking.stalledCount ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <div>
              <strong>{formatNumber(tracking.stalledCount)} {tracking.stalledCount === 1 ? "devolução parada" : "devoluções paradas"}</strong>
              <small>
                Em aberto há mais de {STALLED_DAYS_THRESHOLD} dias na mesma etapa. Destacadas em vermelho na tabela abaixo.
              </small>
            </div>
          </div>
        </article>
      </section>

      <section className="panel table-panel">
        <SectionTitle
          title="Devoluções em aberto"
          subtitle={`${formatNumber(tracking.openRows.length)} em aberto hoje, de qualquer data. Clique no título da coluna para ordenar.`}
        />
        <OpenReturnsTable rows={tracking.openRows} />
      </section>

      <section className="content-grid equal">
        <article className="panel">
          <SectionTitle
            title="Motivos mais frequentes"
            subtitle={`Devoluções abertas no período${periodReference ? `; coluna "Antes" = período de comparação ${periodReference}` : ""}.`}
          />
          {tracking.reasonsByFamily.filter((group) => INCLUDE_PNR || group.family !== "PNR").map((group) => (
            <div className="returns-reason-group" key={group.family ?? "sem_familia"}>
              <h3>{familyLabel(group.family)}</h3>
              {group.rows.length ? (
                <div className="table-wrap">
                  <table className="returns-compact-table">
                    <thead>
                      <tr>
                        <th>Motivo</th>
                        <th className="number-cell">Devoluções</th>
                        <th className="number-cell">Participação</th>
                        {periodReference ? <th className="number-cell">Antes</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.reasonId}>
                          <td>{row.name}</td>
                          <td className="number-cell">{formatNumber(row.current)}</td>
                          <td className="number-cell">{formatPercent(row.sharePercent)}</td>
                          {periodReference ? <td className="number-cell">{row.comparison === null ? "—" : formatNumber(row.comparison)}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-table-message">Nenhuma devolução desta família no período.</p>
              )}
            </div>
          ))}
        </article>

        <article className="panel">
          <SectionTitle
            title="Anúncios com mais devoluções"
            subtitle={`Devoluções abertas no período${periodReference ? `; coluna "Antes" = período de comparação ${periodReference}` : ""}.`}
          />
          {tracking.listings.length ? (
            <div className="table-wrap">
              <table className="returns-compact-table">
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th className="number-cell">Devoluções</th>
                    <th className="number-cell">Valor</th>
                    {periodReference ? <th className="number-cell">Antes</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {tracking.listings.map((row) => (
                    <tr key={row.mlbId}>
                      <td>
                        <strong className="returns-cell-title">{row.title ?? "Anúncio não informado"}</strong>
                        <small>{row.mlbId === "sem_anuncio" ? "Sem MLB" : row.mlbId}</small>
                      </td>
                      <td className="number-cell">{formatNumber(row.current)}</td>
                      <td className="number-cell">{formatCurrency(row.amount)}</td>
                      {periodReference ? <td className="number-cell">{row.comparison === null ? "—" : formatNumber(row.comparison)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-table-message">Nenhuma devolução aberta no período com os filtros selecionados.</p>
          )}
        </article>
      </section>
    </>
  );
}

// -----------------------------------------------------------------------------
// B. Fechamento
// -----------------------------------------------------------------------------

function operationalErrorValue(totals: ClosingTotals) {
  return totals.operationalErrorPercent === null
    ? "Aguardando classificação dos motivos"
    : formatPercent(totals.operationalErrorPercent);
}

function ClosingView({ payload, filters }: { payload: ReturnsPayload; filters: ReturnsFilters }) {
  const closing = useMemo(() => buildClosing(payload, filters, PROVISIONAL_WINDOW_DAYS), [payload, filters]);
  const { current, comparison } = closing;
  const periodReference = payload.window.comparisonStart && payload.window.comparisonEnd
    ? `(${formatDate(payload.window.comparisonStart)} a ${formatDate(payload.window.comparisonEnd)})`
    : "";
  const trend = (
    value: number | null,
    previous: number | null | undefined,
    format: (value: number) => string = formatPercent,
  ) => comparison
    ? <ReturnsTrend current={value} previous={previous ?? null} reference={periodReference} format={format} />
    : undefined;
  const hasProvisional = closing.months.some((month) => month.provisional);

  return (
    <>
      {!closing.salesBaseAvailable ? (
        <div className="returns-note warning">
          <Database size={15} />
          Base de vendas pagas indisponível (view devolucoes_base_vendas_diaria). Os percentuais ficam “Sem base” até a migração ser aplicada.
        </div>
      ) : null}
      {filters.logistics !== "all" ? (
        <div className="returns-note">
          <AlertTriangle size={15} />
          O filtro de logística vale só para as devoluções. As vendas pagas não guardam a modalidade, então o denominador inclui todas as modalidades.
        </div>
      ) : null}

      <section className="kpi-grid">
        <ReturnsKpi
          label="% devolvido por quantidade"
          value={formatPercent(current.unitsRatePercent)}
          detail={`${formatNumber(current.returnedUnits)} de ${formatNumber(current.paidUnits)} unidades vendidas no período.`}
          icon={Undo2}
          tone="brand"
          trend={trend(current.unitsRatePercent, comparison?.unitsRatePercent)}
        />
        <ReturnsKpi
          label="% devolvido por faturamento"
          value={formatPercent(current.revenueRatePercent)}
          detail={`${formatCurrency(current.returnedAmount)} de ${formatCurrency(current.paidRevenue)} em vendas pagas.`}
          icon={Wallet}
          trend={trend(current.revenueRatePercent, comparison?.revenueRatePercent)}
        />
        <ReturnsKpi
          label="Frete de devolução"
          value={formatCurrency(current.shippingCost)}
          detail={current.shippingCostUnknownCount
            ? `${formatNumber(current.shippingCostUnknownCount)} ${current.shippingCostUnknownCount === 1 ? "devolução ainda sem custo informado" : "devoluções ainda sem custo informado"}.`
            : "Custo cobrado da loja pelas devoluções das vendas do período."}
          icon={Truck}
          tone="warning"
          trend={trend(current.shippingCost, comparison?.shippingCost, formatCurrency)}
        />
        <ReturnsKpi
          label="% por erro operacional"
          value={operationalErrorValue(current)}
          detail={current.classifiedCount
            ? `${formatNumber(current.operationalErrorCount)} de ${formatNumber(current.classifiedCount)} devoluções com motivo classificado; ${formatNumber(current.unclassifiedCount)} sem classificação.`
            : "Nenhum motivo foi classificado como erro operacional ou não."}
          icon={ClipboardCheck}
          trend={current.operationalErrorPercent !== null ? trend(current.operationalErrorPercent, comparison?.operationalErrorPercent) : undefined}
        />
      </section>

      <section className="panel table-panel">
        <SectionTitle
          title="Fechamento por mês da venda"
          subtitle={`Cada devolução entra no mês em que a venda original aconteceu, não no mês em que voltou. Meses com vendas há menos de ${PROVISIONAL_WINDOW_DAYS} dias são provisórios.`}
        />
        <div className="table-wrap">
          <table className="returns-table">
            <thead>
              <tr>
                <th>Mês da venda</th>
                <th className="number-cell">Unid. vendidas</th>
                <th className="number-cell">Unid. devolvidas</th>
                <th className="number-cell">% qtd.</th>
                <th className="number-cell">Vendas pagas</th>
                <th className="number-cell">Valor devolvido</th>
                <th className="number-cell">% fat.</th>
                <th className="number-cell">Frete devolução</th>
                <th className="number-cell">Erro operacional</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {closing.months.map((month) => (
                <tr key={month.month}>
                  <td>
                    <strong className="returns-cell-title">{formatMonth(month.month)}</strong>
                    {month.partial ? <small>{formatDate(month.firstDate)} a {formatDate(month.lastDate)}</small> : null}
                  </td>
                  <td className="number-cell">{closing.salesBaseAvailable ? formatNumber(month.paidUnits) : "—"}</td>
                  <td className="number-cell">{formatNumber(month.returnedUnits)}</td>
                  <td className="number-cell">{formatPercent(month.unitsRatePercent)}</td>
                  <td className="number-cell">{closing.salesBaseAvailable ? formatCurrency(month.paidRevenue) : "—"}</td>
                  <td className="number-cell">{formatCurrency(month.returnedAmount)}</td>
                  <td className="number-cell">{formatPercent(month.revenueRatePercent)}</td>
                  <td className="number-cell">{formatCurrency(month.shippingCost)}</td>
                  <td className="number-cell">
                    {month.operationalErrorPercent === null ? <span className="returns-muted">Aguardando classificação</span> : formatPercent(month.operationalErrorPercent)}
                  </td>
                  <td>
                    {month.provisional
                      ? <span className="returns-badge warning">Provisório</span>
                      : <span className="returns-badge good">Fechado</span>}
                    {month.partial ? <span className="returns-badge">Parcial</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="returns-footnote">
          Unidades e valor devolvidos não contam devoluções “encerradas sem devolução”.
          {current.unknownUnitsCount || current.unknownAmountCount
            ? ` ${formatNumber(Math.max(current.unknownUnitsCount, current.unknownAmountCount))} devoluções do período ainda não têm quantidade ou valor informados.`
            : ""}
          {hasProvisional ? " Meses provisórios ainda podem receber devoluções." : ""}
          {comparison ? ` Comparação com o período ${periodReference}.` : ""}
        </p>
      </section>
    </>
  );
}

// -----------------------------------------------------------------------------
// Seção completa
// -----------------------------------------------------------------------------

type ReturnsTab = "tracking" | "closing";

export function ReturnsView({ payload, loading }: { payload: ReturnsPayload; loading: boolean }) {
  const [tab, setTab] = useState<ReturnsTab>("tracking");
  const [filters, setFilters] = useState<ReturnsFilters>({ logistics: "all", family: "all" });

  if (payload.status !== "ready") {
    return loading
      ? <section className="panel"><div className="chart-empty-state">Carregando devoluções…</div></section>
      : <ReturnsEmptyState payload={payload} />;
  }

  return (
    <>
      {payload.demo ? (
        <div className="returns-note demo">
          <AlertTriangle size={15} />
          Modo demonstração: dados fictícios gerados localmente. Nada disso vem do Supabase nem representa a PCXpress.
        </div>
      ) : null}

      <section className="returns-toolbar">
        <SegmentedControl<ReturnsTab>
          label="Visão"
          value={tab}
          options={[
            { value: "tracking", label: "Acompanhamento" },
            { value: "closing", label: "Fechamento" },
          ]}
          onChange={setTab}
        />
        <SegmentedControl<ReturnsLogisticsFilter>
          label="Logística"
          value={filters.logistics}
          options={LOGISTICS_OPTIONS}
          onChange={(logistics) => setFilters((current) => ({ ...current, logistics }))}
        />
        <SegmentedControl<ReturnsFamilyFilter>
          label="Família do motivo"
          value={filters.family}
          options={FAMILY_OPTIONS}
          onChange={(family) => setFilters((current) => ({ ...current, family }))}
        />
      </section>
      <p className="returns-toolbar-hint">O período segue o filtro global do topo da página (7d, 30d, 90d ou Personalizar).</p>

      {tab === "tracking"
        ? <TrackingView payload={payload} filters={filters} />
        : <ClosingView payload={payload} filters={filters} />}
    </>
  );
}

// -----------------------------------------------------------------------------
// C. Alertas da Visão geral (ocultos enquanto não houver dados)
// -----------------------------------------------------------------------------

export function ReturnsOverviewAlerts({ payload }: { payload: ReturnsPayload }) {
  const alerts = useMemo(
    () => buildOverviewAlerts(payload, STALLED_DAYS_THRESHOLD, OPERATIONAL_ERROR_ALERT_INCREASE_POINTS),
    [payload],
  );

  if (!alerts.visible) return null;

  return (
    <>
      <li>
        <span className={`decision-icon ${alerts.stalledCount ? "warning" : "good"}`}>
          {alerts.stalledCount ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
        </span>
        <div>
          <strong>
            {alerts.stalledCount
              ? `${formatNumber(alerts.stalledCount)} ${alerts.stalledCount === 1 ? "devolução parada" : "devoluções paradas"} há mais de ${STALLED_DAYS_THRESHOLD} dias`
              : "Nenhuma devolução parada"}
          </strong>
          <small>Devoluções em aberto sem mudar de etapa. Detalhes em Devoluções.</small>
        </div>
      </li>
      {alerts.operationalError?.triggered ? (
        <li>
          <span className="decision-icon warning">
            <AlertTriangle size={17} />
          </span>
          <div>
            <strong>Alta de devoluções por erro operacional</strong>
            <small>
              {formatPercent(alerts.operationalError.currentPercent)} no período contra {formatPercent(alerts.operationalError.comparisonPercent)} na comparação.
            </small>
          </div>
        </li>
      ) : null}
    </>
  );
}
