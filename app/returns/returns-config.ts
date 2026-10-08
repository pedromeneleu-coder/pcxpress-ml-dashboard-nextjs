/**
 * Configuração da seção Devoluções — ÚNICO arquivo a editar quando as regras
 * de negócio mudarem. Nenhum outro arquivo precisa ser alterado.
 *
 * Todos os valores abaixo são PROVISÓRIOS até a ingestão confirmar os status
 * reais do Mercado Livre e o cliente validar os limites.
 */

import type { ReturnStage } from "./returns-types";

/**
 * Tradução "status bruto do Mercado Livre → etapa do funil".
 *
 * Como usar: o lado esquerdo é o texto exatamente como a API devolve (sem
 * diferenciar maiúsculas/minúsculas); o lado direito é uma das seis etapas:
 * aberta, enviada_pelo_comprador, recebida, revisada, reembolsada,
 * encerrada_sem_devolucao.
 *
 * Se um status não estiver aqui, o painel usa a etapa gravada pela ingestão
 * (coluna etapa_atual / etapa). Se também não houver, a devolução aparece como
 * "status não mapeado" e é contada à parte, nunca escondida.
 *
 * ATENÇÃO: lista inicial baseada na documentação de devoluções do Mercado
 * Livre. Confirme cada status quando fizer a ingestão.
 */
export const RETURN_STATUS_TO_STAGE: Record<string, ReturnStage> = {
  // Devolução criada, comprador ainda não postou o produto.
  opened: "aberta",
  pending: "aberta",
  label_generated: "aberta",
  ready_to_ship: "aberta",
  // Comprador postou; produto a caminho da loja.
  shipped: "enviada_pelo_comprador",
  in_transit: "enviada_pelo_comprador",
  // Produto chegou na loja e aguarda revisão.
  delivered: "recebida",
  // Loja revisou o produto devolvido.
  reviewed: "revisada",
  // Dinheiro devolvido ao comprador.
  refunded: "reembolsada",
  // Encerrada sem o produto voltar.
  cancelled: "encerrada_sem_devolucao",
  expired: "encerrada_sem_devolucao",
  not_delivered: "encerrada_sem_devolucao",
  // "closed" ficou fora de propósito: pode significar reembolsada ou encerrada
  // sem devolução. Decida com a ingestão antes de incluir.
};

/**
 * Regras da fila (iguais às da planilha "pcxpress-fila-devolucoes"):
 * - Parado: caso aberto e (a data prevista do ML já passou, ou está sem
 *   atualização do ML há este número de dias ou mais). PROVISÓRIO: 3 dias,
 *   sugerido pela Aruna; definir com a operação da PCXpress.
 * - Prazo do vendedor: "≤ N dias" quando o prazo vence nos próximos N dias.
 */
export const RETURNS_QUEUE_RULES = {
  stalledDaysWithoutUpdate: 3,
  deadlineWarningDays: 2,
};

/**
 * Meses de venda que terminaram há menos de N dias são "provisórios": novas
 * devoluções dessas vendas ainda podem chegar.
 */
export const PROVISIONAL_WINDOW_DAYS = 60;

/**
 * PNR = "produto não recebido": o comprador diz que nunca recebeu. Pela
 * definição desta seção (devolução é pós-entrega) normalmente não há produto
 * voltando. true = PNR aparece separado como família própria; false = PNR é
 * ignorado em todas as telas e cálculos da seção.
 */
export const INCLUDE_PNR = true;

/**
 * Alerta da Visão geral: dispara quando o % de devoluções por erro operacional
 * do período subir pelo menos estes pontos percentuais em relação à comparação.
 */
export const OPERATIONAL_ERROR_ALERT_INCREASE_POINTS = 5;
