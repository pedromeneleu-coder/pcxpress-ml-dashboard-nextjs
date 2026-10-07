-- Devoluções — colunas da "fila de devoluções" (planilha pcxpress-fila-devolucoes,
-- aba "Devoluções", colunas A até X: chave + dados do Mercado Livre).
--
-- Rode DEPOIS de 2026-10-05_devolucoes.sql. Só ACRESCENTA colunas à tabela
-- devolucoes: não apaga, não renomeia e não altera dados existentes.
-- Idempotente: rodar de novo não faz nada.
--
-- Dados pessoais: só o APELIDO do comprador no Mercado Livre. Nunca gravar
-- nome, CPF, endereço, telefone ou mensagens.
--
-- Correspondência com a planilha (coluna → campo):
--   A Nº da venda ............... order_id (já existe)
--   B ID da reclamação .......... claim_id (já existe)
--   C Data da venda ............. data_venda (já existe)
--   D Data abertura reclamação .. data_abertura (já existe)
--   E MLB ....................... mlb_id (já existe)
--   F Título do anúncio ......... titulo_anuncio (já existe)
--   G SKU ....................... sku
--   H Qtd ....................... quantidade
--   I Valor da venda (R$) ....... valor_venda
--   J Valor reembolsado (R$) .... valor_reembolsado
--   K Comprador (apelido) ....... comprador_apelido
--   L Motivo .................... motivo_descricao (texto como o ML mostra)
--   M Etapa ..................... etapa_ml (Reclamação / Mediação / Devolução / Retorno (não entregue))
--   N Status ML ................. status_reclamacao (opened / closed)
--   O Status do retorno ......... status_retorno (texto em português)
--   P Descrição do status (ML) .. descricao_status
--   Q Data prevista (ML) ........ data_prevista
--   R Destino do retorno ........ destino_retorno
--   S Rastreio .................. rastreio
--   T Prazo p/ ação do vendedor . prazo_acao_vendedor
--   U Ação pendente (ML) ........ acao_pendente
--   V Última atualização ML ..... ultima_atualizacao (já existe)
--   W Resultado ................. resultado
--   X Data do sync .............. synced_at (já existe)

begin;

alter table ml_dashboards.devolucoes
  add column if not exists sku text,
  add column if not exists quantidade integer,
  add column if not exists valor_venda numeric,
  add column if not exists valor_reembolsado numeric,
  add column if not exists comprador_apelido text,
  add column if not exists motivo_descricao text,
  add column if not exists etapa_ml text,
  add column if not exists status_reclamacao text,
  add column if not exists status_retorno text,
  add column if not exists descricao_status text,
  add column if not exists data_prevista timestamptz,
  add column if not exists destino_retorno text,
  add column if not exists rastreio text,
  add column if not exists prazo_acao_vendedor timestamptz,
  add column if not exists acao_pendente text,
  add column if not exists resultado text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'devolucoes_fila_valores_validos'
      and conrelid = 'ml_dashboards.devolucoes'::regclass
  ) then
    alter table ml_dashboards.devolucoes
      add constraint devolucoes_fila_valores_validos check (
        (quantidade is null or quantidade >= 0)
        and (valor_venda is null or valor_venda >= 0)
        and (valor_reembolsado is null or valor_reembolsado >= 0)
        and (status_reclamacao is null or status_reclamacao in ('opened', 'closed'))
      );
  end if;
end $$;

create index if not exists idx_devolucoes_status_reclamacao
  on ml_dashboards.devolucoes (account_id, status_reclamacao);

notify pgrst, 'reload schema';

commit;
