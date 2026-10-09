-- Controle da ingestão de devoluções (workflow n8n MVP7)
--
-- O que este arquivo faz:
--   cria a tabela devolucoes_claims_sem_devolucao, onde a ingestão anota as
--   reclamações que já conferiu e que não têm devolução. Sem ela, essas
--   reclamações seriam conferidas de novo a cada execução e a carga inicial
--   nunca terminaria.
--
-- O que este arquivo NÃO faz:
--   - não altera nenhuma tabela ou view existente;
--   - não insere nenhum dado;
--   - não é lida pelo painel (é só controle da ingestão).
--
-- Como executar:
--   SQL Editor do Supabase → New query → colar o arquivo INTEIRO → Run.
--   O arquivo é idempotente: rodar duas vezes não duplica nem apaga nada.

begin;

create table if not exists ml_dashboards.devolucoes_claims_sem_devolucao (
  account_id uuid not null references ml_dashboards.accounts(id) on delete cascade,
  claim_id text not null,
  -- Última atualização da reclamação quando foi conferida. Se a reclamação
  -- mudar depois disso (por exemplo, o comprador abrir uma devolução), ela é
  -- conferida de novo.
  ultima_atualizacao timestamptz,
  verificado_em timestamptz not null default now(),
  primary key (account_id, claim_id)
);

alter table ml_dashboards.devolucoes_claims_sem_devolucao enable row level security;

grant select, insert, update, delete
  on ml_dashboards.devolucoes_claims_sem_devolucao
  to service_role;

notify pgrst, 'reload schema';

commit;
