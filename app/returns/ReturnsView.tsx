"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  BellRing,
  CalendarClock,
  CirclePause,
  ListOrdered,
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
  RETURNS_QUEUE_RULES,
} from "./returns-config";
import {
  RETURN_STAGE_LABELS,
  buildClosing,
  buildOverviewAlerts,
  buildPeriodBreakdown,
  buildTracking,
  type ClosingTotals,
  saoPauloDate,
  type QueueRow,
  type SellerDeadline,
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

/** Datas do ML no calendário de São Paulo, no formato dd/mm/aaaa. */
function formatMlDate(value: string | null) {
  return formatDate(saoPauloDate(value));
}

function formatOptionalCurrency(value: number | null) {
  return value === null ? "—" : formatCurrency(value);
}

function saleAmountText(value: number | null) {
  return value === null ? "Valor de venda ainda não informado" : `Valor de venda: ${formatCurrency(value)}`;
}

function claimStatusLabel(value: string | null) {
  const status = value?.trim().toLowerCase();
  if (status === "opened" || status === "aberta") return "Aberta";
  if (status === "closed" || status === "fechada") return "Fechada";
  return value ?? "—";
}

const DEADLINE_BADGES: Record<SellerDeadline, { label: string; tone: string } | null> = {
  vencido: { label: "Prazo vencido", tone: "danger" },
  hoje: { label: "Prazo hoje", tone: "danger" },
  proximo: { label: `Prazo ≤ ${RETURNS_QUEUE_RULES.deadlineWarningDays} dias`, tone: "warning" },
  ok: null,
};

type QueueColumn = {
  key: string;
  label: string;
  className?: string;
  render: (row: QueueRow) => React.ReactNode;
  sort: (row: QueueRow) => string | number;
};

const text = (value: string | null) => value ?? "—";
const dateSort = (value: string | null) => saoPauloDate(value) ?? "";

/** Colunas A–X da aba "Devoluções" da planilha (chave + dados do Mercado Livre). */
const QUEUE_COLUMNS: QueueColumn[] = [
  {
    key: "order",
    label: "Nº da venda",
    className: "returns-sticky-col",
    render: (row) => {
      const deadline = row.deadline ? DEADLINE_BADGES[row.deadline] : null;
      return (
        <>
          <strong className="returns-cell-title">{text(row.record.orderId)}</strong>
          <span className="returns-badges">
            {deadline ? <span className={`returns-badge ${deadline.tone}`}>{deadline.label}</span> : null}
            {row.awaitingSellerAction ? <span className="returns-badge brand">Ação do vendedor</span> : null}
            {row.stalled ? <span className="returns-badge warning">Parado</span> : null}
          </span>
        </>
      );
    },
    sort: (row) => row.record.orderId ?? "",
  },
  { key: "claim", label: "ID da reclamação", render: (row) => text(row.record.claimId), sort: (row) => row.record.claimId },
  { key: "saleDate", label: "Data da venda", render: (row) => formatMlDate(row.record.saleDate), sort: (row) => row.record.saleDate ?? "" },
  { key: "openedAt", label: "Data abertura reclamação", render: (row) => formatMlDate(row.record.openedAt), sort: (row) => dateSort(row.record.openedAt) },
  { key: "mlb", label: "MLB", render: (row) => text(row.record.mlbId), sort: (row) => row.record.mlbId ?? "" },
  {
    key: "title",
    label: "Título do anúncio",
    className: "returns-cell-wide",
    render: (row) => text(row.record.listingTitle),
    sort: (row) => row.record.listingTitle ?? "",
  },
  { key: "sku", label: "SKU", render: (row) => text(row.record.sku), sort: (row) => row.record.sku ?? "" },
  {
    key: "quantity",
    label: "Qtd",
    className: "number-cell",
    render: (row) => (row.record.quantity === null ? "—" : formatNumber(row.record.quantity)),
    sort: (row) => row.record.quantity ?? -1,
  },
  {
    key: "saleAmount",
    label: "Valor da venda (R$)",
    className: "number-cell",
    render: (row) => formatOptionalCurrency(row.record.saleAmount),
    sort: (row) => row.record.saleAmount ?? -1,
  },
  {
    key: "refundedAmount",
    label: "Valor reembolsado (R$)",
    className: "number-cell",
    render: (row) => formatOptionalCurrency(row.record.refundedAmount),
    sort: (row) => row.record.refundedAmount ?? -1,
  },
  { key: "buyer", label: "Comprador (apelido)", render: (row) => text(row.record.buyerNickname), sort: (row) => row.record.buyerNickname ?? "" },
  { key: "reason", label: "Motivo", className: "returns-cell-medium", render: (row) => text(row.reasonText), sort: (row) => row.reasonText ?? "" },
  { key: "caseType", label: "Etapa", render: (row) => text(row.record.caseType), sort: (row) => row.record.caseType ?? "" },
  { key: "claimStatus", label: "Status ML", render: (row) => claimStatusLabel(row.record.claimStatus), sort: (row) => claimStatusLabel(row.record.claimStatus) },
  {
    key: "returnStatus",
    label: "Status do retorno",
    className: "returns-cell-medium",
    render: (row) => row.record.returnStatusText ?? (row.record.stage ? RETURN_STAGE_LABELS[row.record.stage] : (
      <span className="returns-badge warning" title={`Status recebido: ${row.record.rawStatus ?? "vazio"}`}>Status não traduzido</span>
    )),
    sort: (row) => row.record.returnStatusText ?? "",
  },
  {
    key: "description",
    label: "Descrição do status (ML)",
    className: "returns-cell-wide",
    render: (row) => text(row.record.statusDescription),
    sort: (row) => row.record.statusDescription ?? "",
  },
  { key: "expectedAt", label: "Data prevista (ML)", render: (row) => formatMlDate(row.record.expectedAt), sort: (row) => dateSort(row.record.expectedAt) },
  { key: "destination", label: "Destino do retorno", render: (row) => text(row.record.returnDestination), sort: (row) => row.record.returnDestination ?? "" },
  { key: "tracking", label: "Rastreio", render: (row) => text(row.record.trackingNumber), sort: (row) => row.record.trackingNumber ?? "" },
  {
    key: "dueAt",
    label: "Prazo p/ ação do vendedor",
    render: (row) => formatMlDate(row.record.sellerActionDueAt),
    sort: (row) => dateSort(row.record.sellerActionDueAt) || "9999",
  },
  {
    key: "action",
    label: "Ação pendente (ML)",
    className: "returns-cell-wide",
    render: (row) => text(row.record.pendingAction),
    sort: (row) => row.record.pendingAction ?? "",
  },
  { key: "lastUpdate", label: "Última atualização ML", render: (row) => formatMlDate(row.record.lastUpdatedAt), sort: (row) => dateSort(row.record.lastUpdatedAt) },
  { key: "result", label: "Resultado", render: (row) => text(row.record.result), sort: (row) => row.record.result ?? "" },
  { key: "syncedAt", label: "Data do sync", render: (row) => formatMlDate(row.record.syncedAt), sort: (row) => dateSort(row.record.syncedAt) },
];

const QUEUE_PREVIEW = 25;

function ReturnsQueueTable({ rows }: { rows: QueueRow[] }) {
  // null = ordem de prioridade da planilha (já aplicada em buildTracking).
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [descending, setDescending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => {
    const column = QUEUE_COLUMNS.find((item) => item.key === sortKey);
    if (!column) return rows;
    return [...rows].sort((a, b) => {
      const left = column.sort(a);
      const right = column.sort(b);
      const order = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "pt-BR");
      return descending ? -order : order;
    });
  }, [rows, sortKey, descending]);

  if (!rows.length) {
    return <p className="empty-table-message">Nenhum caso aberto com os filtros selecionados.</p>;
  }

  function toggle(key: string) {
    if (key === sortKey) {
      setDescending((current) => !current);
    } else {
      setSortKey(key);
      setDescending(false);
    }
  }

  return (
    <>
      <div className="returns-queue-toolbar">
        <span>
          {sortKey === null
            ? "Ordem de prioridade: prazo vencido ou hoje → aguardando ação do vendedor → parados → demais."
            : `Ordenado por "${QUEUE_COLUMNS.find((item) => item.key === sortKey)?.label}".`}
        </span>
        {sortKey !== null ? (
          <button type="button" className="secondary-button" onClick={() => setSortKey(null)}>
            <ListOrdered size={14} /> Voltar à ordem de prioridade
          </button>
        ) : null}
      </div>
      <div className="table-wrap returns-queue-wrap">
        <table className="returns-table returns-queue-table">
          <thead>
            <tr>
              {QUEUE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={column.className}
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
            {(showAll ? sorted : sorted.slice(0, QUEUE_PREVIEW)).map((row) => (
              <tr
                key={row.record.claimId}
                className={row.priority === 0 ? "returns-row-deadline" : row.stalled ? "returns-row-stalled" : undefined}
              >
                {QUEUE_COLUMNS.map((column) => (
                  <td key={column.key} className={column.className}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > QUEUE_PREVIEW ? (
        <button type="button" className="secondary-button returns-show-all" onClick={() => setShowAll((current) => !current)}>
          {showAll ? `Mostrar só os ${QUEUE_PREVIEW} primeiros` : `Mostrar todos os ${formatNumber(rows.length)} casos`}
        </button>
      ) : null}
    </>
  );
}

function TrackingView({ payload, filters }: { payload: ReturnsPayload; filters: ReturnsFilters }) {
  const tracking = useMemo(() => buildTracking(payload, filters, RETURNS_QUEUE_RULES), [payload, filters]);
  const stalledRule = `data prevista do ML já passou ou sem atualização há ${RETURNS_QUEUE_RULES.stalledDaysWithoutUpdate}+ dias`;

  return (
    <>
      <section className="kpi-grid">
        <ReturnsKpi
          label="Casos abertos na fila"
          value={formatNumber(tracking.openCount)}
          detail={saleAmountText(tracking.openSaleAmount)}
          icon={Undo2}
          tone="brand"
        />
        <ReturnsKpi
          label="Prazo do vendedor vencido ou hoje"
          value={formatNumber(tracking.deadlineDueCount)}
          detail="Prioridade máxima: o ML espera uma ação da loja até hoje."
          icon={CalendarClock}
          tone={tracking.deadlineDueCount ? "warning" : "neutral"}
        />
        <ReturnsKpi
          label="Aguardando ação do vendedor"
          value={formatNumber(tracking.awaitingActionCount)}
          detail="Casos em que o ML indica uma ação pendente da loja."
          icon={BellRing}
        />
        <ReturnsKpi
          label="Parados"
          value={formatNumber(tracking.stalledCount)}
          detail={`${saleAmountText(tracking.stalledSaleAmount)} · ${stalledRule}.`}
          icon={CirclePause}
          tone={tracking.stalledCount ? "warning" : "neutral"}
        />
      </section>

      <section className="panel">
        <SectionTitle title="Por status do retorno" subtitle="Casos abertos agrupados pelo status informado pelo Mercado Livre." />
        {tracking.byReturnStatus.length ? (
          <ul className="returns-status-list">
            {tracking.byReturnStatus.map((group) => (
              <li key={group.label}>
                <span>{group.label}</span>
                <strong>{formatNumber(group.count)}</strong>
                <small>{group.saleAmount === null ? "Valor não informado" : formatCurrency(group.saleAmount)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-table-message">Nenhum caso aberto com os filtros selecionados.</p>
        )}
      </section>

      <section className="panel table-panel">
        <SectionTitle
          title={`Fila de devoluções (${formatNumber(tracking.openCount)} casos abertos)`}
          subtitle="Mesmas colunas da planilha de fila (chave e dados do Mercado Livre). Vermelho: prazo do vendedor vencido ou hoje. Amarelo: parado. Clique no título da coluna para reordenar; role a tabela para o lado para ver todas as colunas."
        />
        <ReturnsQueueTable rows={tracking.rows} />
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
  const breakdown = useMemo(() => buildPeriodBreakdown(payload, filters), [payload, filters]);
  const comparisonColumn = Boolean(comparison);
  const breakdownSubtitle = `Devoluções das vendas do período, sem as encerradas sem devolução${comparison ? `; coluna "Antes" = período de comparação ${periodReference}` : ""}.`;

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

      <section className="content-grid equal">
        <article className="panel">
          <SectionTitle title="Motivos mais frequentes" subtitle={breakdownSubtitle} />
          {breakdown.reasonsByFamily.filter((group) => INCLUDE_PNR || group.family !== "PNR").map((group) => (
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
                        {comparisonColumn ? <th className="number-cell">Antes</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.reasonId}>
                          <td>{row.name}</td>
                          <td className="number-cell">{formatNumber(row.current)}</td>
                          <td className="number-cell">{formatPercent(row.sharePercent)}</td>
                          {comparisonColumn ? <td className="number-cell">{row.comparison === null ? "—" : formatNumber(row.comparison)}</td> : null}
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
          <SectionTitle title="Anúncios com mais devoluções" subtitle={breakdownSubtitle} />
          {breakdown.listings.length ? (
            <div className="table-wrap">
              <table className="returns-compact-table">
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th className="number-cell">Devoluções</th>
                    <th className="number-cell">Valor</th>
                    {comparisonColumn ? <th className="number-cell">Antes</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {breakdown.listings.map((row) => (
                    <tr key={row.mlbId}>
                      <td>
                        <strong className="returns-cell-title">{row.title ?? "Anúncio não informado"}</strong>
                        <small>{row.mlbId === "sem_anuncio" ? "Sem MLB" : row.mlbId}</small>
                      </td>
                      <td className="number-cell">{formatNumber(row.current)}</td>
                      <td className="number-cell">{formatCurrency(row.amount)}</td>
                      {comparisonColumn ? <td className="number-cell">{row.comparison === null ? "—" : formatNumber(row.comparison)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-table-message">Nenhuma devolução nas vendas do período com os filtros selecionados.</p>
          )}
        </article>
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
    <div className={payload.demo ? "returns-section returns-demo" : "returns-section"}>
      {payload.demo ? (
        <div className="returns-demo-banner" role="note">
          <AlertTriangle size={18} />
          <div>
            <strong>DADOS FICTÍCIOS — demonstração do layout</strong>
            <span>
              Todos os números, pedidos e anúncios desta seção são inventados para mostrar como a tela vai funcionar.
              Não são devoluções reais da PCXpress e não vêm do Mercado Livre nem do Supabase.
              Quando as devoluções reais começarem a ser importadas, esta demonstração sai do ar automaticamente.
            </span>
          </div>
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
      <p className="returns-toolbar-hint">
        {tab === "tracking"
          ? "Situação de hoje: o filtro de período do topo da página não altera esta aba."
          : "O período segue o filtro do topo da página (7d, 30d, 90d ou Personalizar), pela data da venda original."}
      </p>

      {tab === "tracking"
        ? <TrackingView payload={payload} filters={filters} />
        : <ClosingView payload={payload} filters={filters} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// C. Alertas da Visão geral (ocultos enquanto não houver dados)
// -----------------------------------------------------------------------------

export function ReturnsOverviewAlerts({ payload }: { payload: ReturnsPayload }) {
  const alerts = useMemo(
    () => buildOverviewAlerts(payload, RETURNS_QUEUE_RULES, OPERATIONAL_ERROR_ALERT_INCREASE_POINTS),
    [payload],
  );

  if (!alerts.visible) return null;

  const demoTag = payload.demo ? <span className="returns-demo-tag">Fictício</span> : null;

  return (
    <>
      {alerts.deadlineDueCount ? (
        <li>
          <span className="decision-icon warning">
            <CalendarClock size={17} />
          </span>
          <div>
            <strong>
              {demoTag}
              {`${formatNumber(alerts.deadlineDueCount)} ${alerts.deadlineDueCount === 1 ? "devolução com prazo" : "devoluções com prazo"} do vendedor vencido ou vencendo hoje`}
            </strong>
            <small>O Mercado Livre espera uma ação da loja. Detalhes em Devoluções.</small>
          </div>
        </li>
      ) : null}
      <li>
        <span className={`decision-icon ${alerts.stalledCount ? "warning" : "good"}`}>
          {alerts.stalledCount ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
        </span>
        <div>
          <strong>
            {demoTag}
            {alerts.stalledCount
              ? `${formatNumber(alerts.stalledCount)} ${alerts.stalledCount === 1 ? "devolução parada" : "devoluções paradas"}`
              : "Nenhuma devolução parada"}
          </strong>
          <small>
            Abertas com a data prevista do Mercado Livre vencida ou sem atualização há {RETURNS_QUEUE_RULES.stalledDaysWithoutUpdate}+ dias. Detalhes em Devoluções.
          </small>
        </div>
      </li>
      {alerts.operationalError?.triggered ? (
        <li>
          <span className="decision-icon warning">
            <AlertTriangle size={17} />
          </span>
          <div>
            <strong>{demoTag}Alta de devoluções por erro operacional</strong>
            <small>
              {formatPercent(alerts.operationalError.currentPercent)} no período contra {formatPercent(alerts.operationalError.comparisonPercent)} na comparação.
            </small>
          </div>
        </li>
      ) : null}
    </>
  );
}
