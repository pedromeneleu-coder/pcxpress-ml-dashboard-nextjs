/**
 * Semântica de cor dos indicadores.
 *
 * Regra central do dashboard: a cor é um julgamento ("isto está bom ou ruim?"),
 * nunca decoração. A seta continua indicando o fato (subiu ou caiu) e a cor
 * indica se aquilo é bom — por isso um cancelamento que sobe aparece com seta
 * para cima e badge vermelho.
 *
 * Este é o único arquivo a editar quando os limites de negócio mudarem.
 */

export type SignalTone = "good" | "attention" | "bad" | "neutral";

/** Para "lowerIsBetter" (cancelamentos, reclamações, atrasos) a cor inverte. */
export type MetricDirection = "higherIsBetter" | "lowerIsBetter";

/**
 * Variações menores que isto são ruído e ficam cinza. Sem essa zona morta,
 * uma oscilação de 0,3% pintaria o card de verde e a cor perderia o sentido.
 */
export const TREND_DEAD_ZONE_PERCENT = 2;

export type TrendSignal = {
  tone: SignalTone;
  /** Direção factual do movimento, independente de ser bom ou ruim. */
  arrow: "up" | "down" | "flat";
  changePercent: number | null;
  /** Ex.: "12,4%", "Novo", "Sem base anterior". */
  label: string;
};

function formatPercentLabel(value: number) {
  return `${Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function toneForMovement(improving: boolean, direction: MetricDirection): SignalTone {
  return direction === "higherIsBetter"
    ? (improving ? "good" : "bad")
    : (improving ? "bad" : "good");
}

export function evaluateTrend(
  current: number | null | undefined,
  previous: number | null | undefined,
  direction: MetricDirection = "higherIsBetter",
  deadZonePercent: number = TREND_DEAD_ZONE_PERCENT,
): TrendSignal {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return { tone: "neutral", arrow: "flat", changePercent: null, label: "Sem base anterior" };
  }

  if (previous === 0) {
    if (current === 0) {
      return { tone: "neutral", arrow: "flat", changePercent: 0, label: "Sem variação" };
    }

    const grew = current > 0;
    return {
      tone: toneForMovement(grew, direction),
      arrow: grew ? "up" : "down",
      changePercent: null,
      label: grew ? "Novo" : "Zerado",
    };
  }

  const changePercent = ((current - previous) / Math.abs(previous)) * 100;
  const arrow = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat";
  const isNoise = Math.abs(changePercent) < deadZonePercent;
  const tone = isNoise
    ? "neutral"
    : toneForMovement(changePercent > 0, direction);

  return { tone, arrow, changePercent, label: formatPercentLabel(changePercent) };
}

/**
 * Limites em pontos percentuais para as taxas de saúde do seller.
 *
 * Aqui a tendência sozinha engana: 0,4% de reclamação que subiu 10% continua
 * excelente, e 8% que caiu 10% continua péssimo. Por isso estas métricas são
 * julgadas pelo patamar absoluto, não pela variação.
 *
 * ATENÇÃO: valores iniciais, não oficiais. Confirme no painel de reputação do
 * Mercado Livre e ajuste abaixo — nenhum outro arquivo precisa mudar.
 */
export type RateThreshold = {
  /** Até este valor (inclusive), em %, o indicador está saudável. */
  good: number;
  /** Acima de `good` e até aqui, exige atenção. Acima disto, é crítico. */
  attention: number;
};

export const SELLER_RATE_THRESHOLDS = {
  claims: { good: 1, attention: 2 },
  delayedHandling: { good: 10, attention: 15 },
  cancellations: { good: 1, attention: 2 },
  /** Cancelamentos calculados pelos pedidos do período, não pela métrica móvel do ML. */
  canceledOrdersShare: { good: 2, attention: 5 },
  canceledAmountShare: { good: 2, attention: 5 },
} as const satisfies Record<string, RateThreshold>;

/** Julga uma taxa já expressa em porcentagem (ex.: 1.4 para 1,4%). */
export function evaluateRate(
  percentValue: number | null | undefined,
  threshold: RateThreshold,
): SignalTone {
  if (percentValue === null || percentValue === undefined || !Number.isFinite(percentValue)) {
    return "neutral";
  }

  if (percentValue <= threshold.good) return "good";
  if (percentValue <= threshold.attention) return "attention";
  return "bad";
}

/** Julga uma taxa vinda do Supabase como fração (0.014 para 1,4%). */
export function evaluateRateFraction(
  fraction: number | null | undefined,
  threshold: RateThreshold,
): SignalTone {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) {
    return "neutral";
  }

  return evaluateRate(fraction * 100, threshold);
}

/**
 * O Mercado Livre já entrega a reputação como cor ("5_green", "3_yellow",
 * "1_red"). Reaproveitamos essa semântica em vez de inventar outra.
 */
export function reputationSignal(levelId: string | null | undefined): SignalTone {
  if (!levelId) return "neutral";

  const value = levelId.toLowerCase();
  if (value.includes("green")) return "good";
  if (value.includes("yellow")) return "attention";
  if (value.includes("orange") || value.includes("red")) return "bad";

  return "neutral";
}
