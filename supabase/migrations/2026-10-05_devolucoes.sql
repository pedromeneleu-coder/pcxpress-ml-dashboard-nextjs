-- Devoluções pós-entrega (PCXpress / Mercado Livre)
--
-- O que este arquivo faz:
--   1. cria as tabelas devolucoes, devolucoes_status e devolucoes_motivos;
--   2. cria a view devolucoes_base_vendas_diaria (vendas pagas por dia da venda),
--      usada como denominador do Fechamento;
--   3. libera leitura e escrita para a service_role (usada pelo n8n e pelo painel).
--
-- O que este arquivo NÃO faz:
--   - não apaga, renomeia nem altera nenhuma tabela ou view existente;
--   - não insere nenhum dado;
--   - não grava percentuais nem médias: tudo isso é calculado na leitura.
--
-- Como executar (somente quando decidir):
--   SQL Editor do Supabase → New query → colar o arquivo INTEIRO → Run.
--   O arquivo é idempotente: rodar duas vezes não duplica nem apaga nada.
--
-- Regras de conteúdo:
--   - nenhum dado pessoal do comprador (nome, endereço, mensagens, buyer_id);
--   - somente códigos, status, datas, quantidades e valores.

begin;

create schema if not exists ml_dashboards;

-- -----------------------------------------------------------------------------
-- 1. Uma linha por devolução, sempre com o estado mais recente
-- -----------------------------------------------------------------------------
create table if not exists ml_dashboards.devolucoes (
  account_id uuid not null references ml_dashboards.accounts(id) on delete cascade,
  claim_id text not null,
  return_id text,
  order_id text,
  mlb_id text,
  titulo_anuncio text,
  -- PDD = produto com defeito ou diferente do anunciado.
  -- PNR = produto não recebido.
  familia_motivo text,
  reason_id text,
  -- Status bruto devolvido pela API do Mercado Livre.
  status_atual text,
  -- Etapa normalizada gravada pela ingestão (opcional). O painel traduz o
  -- status_atual pelo arquivo app/returns/returns-config.ts e só usa esta coluna
  -- quando o status ainda não estiver mapeado lá.
  etapa_atual text,
  -- Data da venda original no calendário de São Paulo (base do Fechamento).
  data_venda date,
  data_abertura timestamptz,
  data_envio_comprador timestamptz,
  data_recebimento timestamptz,
  data_reembolso timestamptz,
  ultima_atualizacao timestamptz,
  unidades_devolvidas integer,
  -- unidades devolvidas × preço unitário do item no pedido.
  -- Nunca o valor do pedido inteiro.
  valor_devolvido numeric,
  -- Frete de devolução cobrado da loja. Nulo = ainda desconhecido (não é zero).
  custo_frete_devolucao numeric,
  -- fulfillment, cross_docking, self_service, drop_off etc. Usado para separar o Full.
  logistic_type text,
  synced_at timestamptz not null default now(),
  primary key (account_id, claim_id),
  constraint devolucoes_familia_valida
    check (familia_motivo is null or familia_motivo in ('PDD', 'PNR')),
  constraint devolucoes_etapa_valida
    check (etapa_atual is null or etapa_atual in (
      'aberta', 'enviada_pelo_comprador', 'recebida',
      'revisada', 'reembolsada', 'encerrada_sem_devolucao'
    )),
  constraint devolucoes_valores_nao_negativos
    check (
      (unidades_devolvidas is null or unidades_devolvidas >= 0)
      and (valor_devolvido is null or valor_devolvido >= 0)
      and (custo_frete_devolucao is null or custo_frete_devolucao >= 0)
    )
);

create index if not exists idx_devolucoes_abertura
  on ml_dashboards.devolucoes (account_id, data_abertura desc);

create index if not exists idx_devolucoes_venda
  on ml_dashboards.devolucoes (account_id, data_venda);

create index if not exists idx_devolucoes_status
  on ml_dashboards.devolucoes (account_id, status_atual);

-- -----------------------------------------------------------------------------
-- 2. Histórico: uma linha por mudança de status
-- -----------------------------------------------------------------------------
create table if not exists ml_dashboards.devolucoes_status (
  account_id uuid not null,
  claim_id text not null,
  status text not null,
  -- Etapa normalizada gravada pela ingestão (opcional, mesma regra de etapa_atual).
  etapa text,
  data_status timestamptz not null,
  synced_at timestamptz not null default now(),
  -- Chave natural: reprocessar a mesma mudança não duplica a linha.
  primary key (account_id, claim_id, status, data_status),
  foreign key (account_id, claim_id)
    references ml_dashboards.devolucoes(account_id, claim_id)
    on delete cascade,
  constraint devolucoes_status_etapa_valida
    check (etapa is null or etapa in (
      'aberta', 'enviada_pelo_comprador', 'recebida',
      'revisada', 'reembolsada', 'encerrada_sem_devolucao'
    ))
);

create index if not exists idx_devolucoes_status_claim
  on ml_dashboards.devolucoes_status (account_id, claim_id, data_status);

-- -----------------------------------------------------------------------------
-- 3. Dicionário de motivos (uma linha por código, por conta)
-- -----------------------------------------------------------------------------
create table if not exists ml_dashboards.devolucoes_motivos (
  account_id uuid not null references ml_dashboards.accounts(id) on delete cascade,
  reason_id text not null,
  familia text,
  nome text,
  detalhe text,
  -- Classificação feita pela loja/cliente. Nulo = ainda não classificado.
  -- O painel nunca trata nulo como "não é erro operacional".
  erro_operacional boolean,
  synced_at timestamptz not null default now(),
  primary key (account_id, reason_id),
  constraint devolucoes_motivos_familia_valida
    check (familia is null or familia in ('PDD', 'PNR'))
);

-- -----------------------------------------------------------------------------
-- 4. Base de vendas pagas por dia da venda (denominador do Fechamento)
-- -----------------------------------------------------------------------------
-- Calculada direto de orders_current + order_items para contar cada pedido uma
-- única vez. Não usa dashboard_daily_account_summary, que soma pedidos por
-- anúncio e inclui pedidos cancelados.
-- Limite conhecido: pedidos não guardam o tipo de logística, então esta base
-- não pode excluir o Full.
create or replace view ml_dashboards.devolucoes_base_vendas_diaria
with (security_invoker = true) as
select
  o.account_id,
  date(o.date_created at time zone 'America/Sao_Paulo') as data_venda,
  count(distinct o.order_id)::integer as pedidos_pagos,
  coalesce(sum(oi.quantity), 0)::integer as unidades_pagas,
  coalesce(sum(coalesce(oi.quantity, 0) * coalesce(oi.unit_price, 0)), 0)::numeric
    as faturamento_pago
from ml_dashboards.orders_current o
join ml_dashboards.order_items oi
  on oi.order_id = o.order_id
where o.status = 'paid'
  and o.date_created is not null
group by
  o.account_id,
  date(o.date_created at time zone 'America/Sao_Paulo');

-- -----------------------------------------------------------------------------
-- 5. Segurança e permissões
-- -----------------------------------------------------------------------------
alter table ml_dashboards.devolucoes enable row level security;
alter table ml_dashboards.devolucoes_status enable row level security;
alter table ml_dashboards.devolucoes_motivos enable row level security;

grant usage on schema ml_dashboards to service_role;

grant select, insert, update, delete
  on ml_dashboards.devolucoes,
     ml_dashboards.devolucoes_status,
     ml_dashboards.devolucoes_motivos
  to service_role;

grant select on ml_dashboards.devolucoes_base_vendas_diaria to service_role;

notify pgrst, 'reload schema';

commit;
