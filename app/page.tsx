"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
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
import { FALLBACK_DASHBOARD_DATA, type DashboardData } from "./dashboard-types";

type ViewId = "overview" | "sales" | "products" | "performance" | "traffic" | "seller" | "quality";

const navItems = [
  { id: "overview", label: "Visao geral", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: CircleDollarSign },
  { id: "products", label: "Produtos e anuncios", icon: ShoppingBag },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "traffic", label: "Trafego e conversao", icon: Eye },
  { id: "seller", label: "Saude do seller", icon: ShieldCheck },
  { id: "quality", label: "Qualidade da base", icon: Database },
] as const;

const viewMeta: Record<ViewId, { title: string; description: string }> = {
  overview: {
    title: "Visao geral",
    description: "Leitura executiva da operacao Mercado Livre, com catalogo consolidado e dados auditaveis.",
  },
  sales: {
    title: "Vendas",
    description: "Pedidos, unidades, ticket e valor bruto no periodo selecionado.",
  },
  products: {
    title: "Produtos e anuncios",
    description: "Catalogo unico para decisoes comerciais, preservando a origem apenas como auditoria tecnica.",
  },
  performance: {
    title: "Performance por produto",
    description: "Cruzamento diario de vendas, visitas, conversao e disponibilidade por item.",
  },
  traffic: {
    title: "Trafego e conversao",
    description: "Demanda, eficiencia de conversao e oportunidades por anuncio.",
  },
  seller: {
    title: "Saude do seller",
    description: "Reputacao e sinais operacionais da conta PC Express.",
  },
  quality: {
    title: "Qualidade da base",
    description: "Rastreabilidade das sincronizacoes e cobertura do catalogo analitico.",
  },
};

const pipelineRows = [
  { name: "Seller", window: "Snapshot diario", status: "Disponivel" },
  { name: "Anuncios", window: "Estado atual", status: "Disponivel" },
  { name: "Pedidos", window: "Janela movel", status: "Disponivel" },
  { name: "Visitas", window: "Janela movel", status: "Disponivel" },
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
    return "Apos conexao";
  }

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Apos conexao";
  }

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "neutral" | "good" | "warning" | "brand";
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
    return <p className="empty-table-message">Ainda nao ha produtos no periodo selecionado.</p>;
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

function OverviewView({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="kpi-grid">
        <KpiCard
          label="Catalogo consolidado"
          value={formatNumber(data.catalog.total)}
          detail="Anuncios unicos na base analitica"
          icon={Box}
          tone="brand"
        />
        <KpiCard
          label="Pedidos"
          value={formatNumber(data.sales.ordersCount)}
          detail={`Janela de ${data.periodDays} dias`}
          icon={ShoppingBag}
        />
        <KpiCard
          label="Unidades vendidas"
          value={formatNumber(data.sales.unitsSold)}
          detail="Vinculadas ao catalogo consolidado"
          icon={TrendingUp}
          tone="good"
        />
        <KpiCard
          label="Valor bruto"
          value={formatShortCurrency(data.sales.grossAmount)}
          detail={data.connected ? "Periodo selecionado" : "Snapshot validado"}
          icon={CircleDollarSign}
          tone="warning"
        />
      </section>

      <section className="content-grid two-one">
        <article className="panel coverage-panel">
          <PanelTitle
            title="Cobertura do catalogo"
            subtitle="Todos os anuncios e vendas entram em uma unica leitura comercial, sem duplicidade entre fontes."
            action={<span className="tiny-label">{formatNumber(data.catalog.total)} anuncios</span>}
          />
          <div className="coverage-bar" aria-label="Cobertura do catalogo consolidado">
            <span
              className="coverage-current"
              style={{ width: `${data.catalog.total ? ((data.catalog.total - data.catalog.unknown) / data.catalog.total) * 100 : 0}%` }}
            />
          </div>
          <div className="legend-row">
            <span>
              <i className="legend-dot dot-cyan" />Itens integrados <b>{formatNumber(data.catalog.total - data.catalog.unknown)}</b>
            </span>
            <span>
              <i className="legend-dot dot-amber" />Pendencias <b>{formatNumber(data.catalog.unknown)}</b>
            </span>
          </div>
          <div className="coverage-numbers">
            <div>
              <strong>{formatNumber(data.catalog.total)}</strong>
              <span>Anuncios no catalogo</span>
            </div>
            <div>
              <strong>{formatNumber(data.sales.ordersCount)}</strong>
              <span>Pedidos no periodo</span>
            </div>
            <div>
              <strong>{formatNumber(data.catalog.unknown)}</strong>
              <span>Itens sem classificacao</span>
            </div>
          </div>
        </article>

        <article className="panel decision-panel">
          <PanelTitle title="Leitura para decisao" subtitle="O que merece atencao agora" />
          <ul className="decision-list">
            <li>
              <span className="decision-icon warning">
                <AlertTriangle size={17} />
              </span>
              <div>
                <strong>Historico comercial preservado</strong>
                <small>As vendas permanecem vinculadas aos anuncios do catalogo consolidado.</small>
              </div>
            </li>
            <li>
              <span className="decision-icon good">
                <CheckCircle2 size={17} />
              </span>
              <div>
                <strong>{data.catalog.unknown === 0 ? "100%" : "Revisar"} dos itens estao classificados</strong>
                <small>Nenhuma venda precisa ficar fora da leitura comercial.</small>
              </div>
            </li>
            <li>
              <span className="decision-icon brand">
                <Zap size={17} />
              </span>
              <div>
                <strong>{data.connected ? "Supabase conectado" : "Base pronta para conectar"}</strong>
                <small>As origens ficam disponiveis como auditoria tecnica.</small>
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
            <strong>Recorte validado:</strong> vendas associadas ao catalogo consolidado.
          </span>
        </div>
        <span>Ultima data: {formatDate(data.sales.lastPerformanceDate)}</span>
      </div>
      <section className="kpi-grid">
        <KpiCard label="Valor bruto" value={formatCurrency(data.sales.grossAmount)} detail="Periodo selecionado" icon={CircleDollarSign} tone="brand" />
        <KpiCard label="Pedidos" value={formatNumber(data.sales.ordersCount)} detail="Pedidos no recorte" icon={ShoppingBag} />
        <KpiCard
          label="Unidades"
          value={formatNumber(data.sales.unitsSold)}
          detail={`${(data.sales.unitsSold / Math.max(data.sales.ordersCount, 1)).toLocaleString("pt-BR", {
            maximumFractionDigits: 2,
          })} unidade por pedido`}
          icon={Box}
          tone="good"
        />
        <KpiCard
          label="Media por pedido"
          value={data.sales.avgTicket === null ? "Apos conexao" : formatCurrency(data.sales.avgTicket)}
          detail="Valor bruto dividido por pedidos"
          icon={Gauge}
        />
      </section>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Dimensao do periodo" subtitle="Escala dos registros carregados para a analise" />
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
                <span>Itens no catalogo</span>
                <strong>{formatNumber(data.catalog.total)}</strong>
              </div>
              <div className="track">
                <span style={{ width: `${Math.max(data.catalog.retainedShare, 8)}%` }} />
              </div>
            </div>
          </div>
        </article>
        <article className="panel">
          <PanelTitle title="Regras de leitura" subtitle="Como os numeros devem ser interpretados" />
          <div className="rule-list">
            <div>
              <span>01</span>
              <p>
                <strong>Vendas leem o catalogo completo.</strong> Receita, unidades e tendencia consideram todos os anuncios vendidos.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Operacao usa os atributos disponiveis.</strong> Estoque, preco ativo e status aparecem quando informados pela API.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Origem e uma etiqueta tecnica.</strong> Ela fica restrita a auditoria e nao fragmenta a leitura comercial.
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
        <KpiCard label="Catalogo total" value={formatNumber(data.catalog.total)} detail="Sem duplicidade entre fontes" icon={Box} tone="brand" />
        <KpiCard label="Com dados operacionais" value={formatNumber(data.catalog.current)} detail="Preco, estoque e status disponiveis" icon={ShoppingBag} />
        <KpiCard label="Unidades vendidas" value={formatNumber(data.sales.unitsSold)} detail={`Janela de ${data.periodDays} dias`} icon={TrendingUp} tone="warning" />
        <KpiCard
          label="Cobertura classificada"
          value={data.catalog.unknown === 0 ? "100%" : `${formatNumber(data.catalog.unknown)} pend.`}
          detail="Origem conhecida em todos os itens"
          icon={CheckCircle2}
          tone="good"
        />
      </section>
      <section className="panel table-panel">
        <PanelTitle title="Produtos do catalogo" subtitle="Desempenho comercial consolidado, independentemente da origem tecnica do cadastro." />
        <TopProductsTable data={data} />
      </section>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Acoes operacionais" subtitle={`Aplicaveis aos ${formatNumber(data.catalog.current)} anuncios operacionais`} />
          <div className="action-grid">
            <div>
              <span className="action-icon">
                <Box size={18} />
              </span>
              <p>
                <strong>Estoque critico</strong>
                <small>Priorizar reposicao por giro e valor vendido.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Apos conexao"}</b>
            </div>
            <div>
              <span className="action-icon">
                <Activity size={18} />
              </span>
              <p>
                <strong>Anuncio pausado com estoque</strong>
                <small>Identificar receita potencial bloqueada.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Apos conexao"}</b>
            </div>
            <div>
              <span className="action-icon">
                <Search size={18} />
              </span>
              <p>
                <strong>Sem venda com visita</strong>
                <small>Revisar preco, conteudo e oferta.</small>
              </p>
              <b>{data.connected ? "Ativo" : "Apos conexao"}</b>
            </div>
          </div>
        </article>
        <article className="panel data-note">
          <PanelTitle title="Regras de uso dos dados" />
          <div className="split-visual">
            <div className="split-current">
              <span>Decisao comercial</span>
              <strong>Venda | Receita | Conversao</strong>
              <small>Considera o catalogo consolidado</small>
            </div>
            <div className="split-history">
              <span>Decisao operacional</span>
              <strong>Preco | Estoque | Status</strong>
              <small>Usa os atributos atuais disponiveis</small>
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
          <span>Preco e status</span>
        </div>
        <b>=</b>
        <div className="formula-result">
          <TrendingUp size={18} />
          <span>Decisao por produto</span>
        </div>
      </section>
      <section className="kpi-grid">
        <KpiCard label="Janela de pedidos" value={`${data.periodDays} dias`} detail="Atualizacao movel" icon={CalendarDays} tone="brand" />
        <KpiCard label="Visitas" value={data.sales.visits === null ? "Apos conexao" : formatNumber(data.sales.visits)} detail="Detalhamento diario" icon={Eye} />
        <KpiCard label="Grao analitico" value="Item + dia" detail="Comparacao no mesmo nivel" icon={Database} />
        <KpiCard label="Conversao" value={formatPercent(data.sales.conversionRatePercent)} detail="Taxa calculada por anuncio" icon={Gauge} tone="good" />
      </section>
      <section className="panel table-panel">
        <PanelTitle
          title={data.topProducts.length ? "Top produtos por valor bruto" : "Matriz de decisao por produto"}
          subtitle={data.topProducts.length ? "Produtos agregados pela view diaria do Supabase." : "Estrutura pronta para receber as metricas reais do Supabase."}
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
                    <th>Decisao sugerida</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="primary-cell">Muita visita + pouca venda</td>
                    <td>Conversao baixa</td>
                    <td>Rever preco, frete e conteudo</td>
                    <td>
                      <span className="status-badge status-warning">Alta</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Pouca visita + boa conversao</td>
                    <td>Oferta eficiente, alcance baixo</td>
                    <td>Aumentar exposicao</td>
                    <td>
                      <span className="status-badge status-good">Oportunidade</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Boa venda + estoque baixo</td>
                    <td>Risco de ruptura</td>
                    <td>Priorizar reposicao</td>
                    <td>
                      <span className="status-badge status-warning">Alta</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="primary-cell">Sem visita + sem venda</td>
                    <td>Anuncio sem tracao</td>
                    <td>Reavaliar permanencia e cadastro</td>
                    <td>
                      <span className="status-badge status-neutral">Media</span>
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
          <h2>Trafego e conversao em janela movel de {data.periodDays} dias</h2>
          <p>
            A visao usa <code>item_visits_daily</code> cruzada com vendas no mesmo item e data.
          </p>
        </div>
        <span className="status-badge status-good">{data.connected ? "Supabase ativo" : "Estrutura pronta"}</span>
      </div>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Funil do anuncio" subtitle="Da exposicao a venda" />
          <div className="funnel">
            <div style={{ width: "100%" }}>
              <span>Visitas</span>
              <b>{data.sales.visits === null ? "Apos conexao" : formatNumber(data.sales.visits)}</b>
            </div>
            <div style={{ width: "78%" }}>
              <span>Pedidos</span>
              <b>{formatNumber(data.sales.ordersCount)}</b>
            </div>
            <div style={{ width: "56%" }}>
              <span>Unidades vendidas</span>
              <b>{formatNumber(data.sales.unitsSold)}</b>
            </div>
          </div>
        </article>
        <article className="panel">
          <PanelTitle title="Perguntas respondidas" subtitle="Decisoes que esta aba deve acelerar" />
          <ul className="question-list">
            <li>
              <CheckCircle2 size={17} />Quais anuncios atraem publico, mas nao convertem?
            </li>
            <li>
              <CheckCircle2 size={17} />Quais convertem bem e merecem mais exposicao?
            </li>
            <li>
              <CheckCircle2 size={17} />Onde preco e status explicam queda de demanda?
            </li>
            <li>
              <CheckCircle2 size={17} />Quais itens ativos estao invisiveis para o mercado?
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
          <p>Snapshot diario para acompanhar reputacao e qualidade operacional.</p>
        </div>
        <span className="status-badge status-good">{data.connected ? "Supabase ativo" : "Conta ativa"}</span>
      </section>
      <section className="kpi-grid muted-kpis">
        <KpiCard label="Reputacao" value="-" detail="Ultimo snapshot do seller" icon={ShieldCheck} tone="brand" />
        <KpiCard label="Cancelamentos" value="-" detail="Evolucao por periodo" icon={X} />
        <KpiCard label="Reclamacoes" value="-" detail="Evolucao por periodo" icon={Users} />
        <KpiCard label="Atrasos" value="-" detail="Evolucao por periodo" icon={Activity} />
      </section>
      <section className="panel">
        <PanelTitle title="Linha de acompanhamento" subtitle="A serie diaria mostrara mudanca, tendencia e alertas de reputacao." />
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
        <KpiCard label="Com atributos atuais" value={formatNumber(data.catalog.current)} detail="Preco, estoque e status disponiveis" icon={Zap} tone="brand" />
        <KpiCard label="Cobertura complementar" value={formatNumber(data.catalog.retained)} detail="Registros comerciais preservados" icon={Database} tone="warning" />
        <KpiCard label="Pendencia desconhecida" value={formatNumber(data.catalog.unknown)} detail="Itens sem tratamento" icon={ShieldCheck} tone="good" />
      </section>
      <section className="content-grid equal">
        <article className="panel">
          <PanelTitle title="Pipelines de dados" subtitle="Cobertura e periodo de cada dominio" />
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
          <PanelTitle title="Tratamento da cobertura" subtitle="Resultado do saneamento dos anuncios vendidos" />
          <div className="backfill-flow">
            <div>
              <span>176</span>
              <small>Itens faltantes no inicio</small>
            </div>
            <i />
            <div>
              <span>73</span>
              <small>Recuperados pela API</small>
            </div>
            <i />
            <div className="highlight">
              <span>{formatNumber(data.catalog.retained)}</span>
              <small>Integrados pelo historico de pedidos</small>
            </div>
          </div>
          <p className="backfill-note">
            <AlertTriangle size={16} />Os atributos operacionais dependem da API; o historico comercial permanece completo para analise.
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
          throw new Error("Nao foi possivel carregar o dashboard.");
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
          <Image src="/pcxpress-logo.webp" alt="PC Xpress" width={160} height={67} priority />
          <span>Mercado Livre Analytics</span>
        </div>
        <nav aria-label="Navegacao principal">
          <p className="nav-section-label">Analises</p>
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
            <div className="period-control" aria-label="Periodo">
              {["7d", "30d", "90d"].map((item) => (
                <button key={item} className={period === item ? "active" : ""} onClick={() => changePeriod(item)}>
                  {item}
                </button>
              ))}
            </div>
            <button className="icon-button" title="Atualizar visualizacao" aria-label="Atualizar visualizacao" onClick={refreshData}>
              <RefreshCw size={18} className={isRefreshing ? "spin-icon" : ""} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">PC Express | Mercado Livre</p>
              <h1>{activeMeta.title}</h1>
              <p>{activeMeta.description}</p>
            </div>
            <div className="date-chip">
              <CalendarDays size={16} />
              <span>
                Janela selecionada: <strong>{periodDays} dias</strong>
              </span>
            </div>
          </div>
          {content}
        </div>
      </section>
    </main>
  );
}
