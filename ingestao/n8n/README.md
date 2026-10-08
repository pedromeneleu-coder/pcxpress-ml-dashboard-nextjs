# Ingestão de devoluções (n8n)

`MVP7_Devolucoes.json` é o workflow do n8n que alimenta a seção **Devoluções** do painel.
Ele grava em `ml_dashboards.devolucoes`, `devolucoes_status` e `devolucoes_motivos`
(criadas por `supabase/migrations/2026-10-05_devolucoes.sql`) e anota as reclamações já
conferidas sem devolução em `devolucoes_claims_sem_devolucao`
(`supabase/migrations/2026-10-08_devolucoes_claims_sem_devolucao.sql`).

O arquivo **não contém chaves**. Depois de importar, preencha os 4 campos `PREENCHA_` do
node `CONFIG - Devolucoes` (os mesmos do MVP6 v7). Nunca salve neste repositório uma cópia
com as chaves preenchidas.

## Como rodar

1. No n8n: **Import from File** → `MVP7_Devolucoes.json`.
2. Preencha as chaves no node `CONFIG - Devolucoes`.
3. **Carga inicial (180 dias):** clique em *Execute workflow*. Cada execução processa até
   150 reclamações; repita enquanto `claims_deferred` for maior que 0.
4. Quando `claims_deferred` der 0, troque `claims_days_back` de `180` para `30`.
5. Ative o workflow. Ele roda de hora em hora (minuto 7).

## O que cada execução faz

1. Renova o token do Mercado Livre se necessário (`oauth_tokens`).
2. Busca as reclamações criadas ou atualizadas no período, mais todas em aberto.
   A busca não informa se a reclamação tem devolução: cada reclamação nova é conferida uma
   vez e, se não tiver devolução, fica anotada em `devolucoes_claims_sem_devolucao` e só é
   conferida de novo se for atualizada.
3. Para cada reclamação nova, em aberto ou atualizada desde a última execução:
   - `GET /post-purchase/v2/claims/{id}/returns`: status da devolução;
   - `GET /post-purchase/v1/returns/{id}/reviews`: revisão (quando houver);
   - `GET /post-purchase/v1/claims/{id}/charges/return-cost`: frete de devolução (até obter);
   - `GET /shipments/{id}/history` do envio de volta e, se não trouxer datas,
     `GET /shipments/{id}`: datas de postagem e recebimento (até obter);
   - `GET /orders/{id}` e `GET /shipments/{id}` do envio original: data da venda, anúncio,
     preço e tipo de logística (uma vez por devolução).
4. Busca o nome dos motivos novos (`GET /post-purchase/v1/claims/reasons/{id}`). Nunca altera
   `erro_operacional`, que é preenchido pelo cliente.
5. Registra a execução em `sync_runs` (se a tabela não existir, segue sem registro).

## `status_atual`

É o `status` da devolução na API, com duas exceções:

- `status_money = refunded` → `refunded` (dinheiro devolvido ao comprador);
- `delivered` com revisão → `reviewed`.

O painel traduz o status em etapa por `app/returns/returns-config.ts`. A ingestão também grava
`etapa_atual`, usada só para status que não estejam nesse arquivo (por exemplo, `closed`).

## Histórico (`devolucoes_status`)

- Na primeira gravação, reconstrói os marcos conhecidos (abertura, postagem, entrega, revisão,
  reembolso) com as datas da API, para que "dias parada na etapa" já saia certo.
- Depois, grava uma linha a cada mudança de status.

## Saída de cada execução

O resumo mostra quantas devoluções foram gravadas, os status encontrados
(`status_atual_desta_execucao`, `status_bruto_da_api`, `status_sem_etapa`) e quantas linhas
ainda estão sem data da venda, logística, valor, frete ou datas de envio (`faltando_no_banco`).
Se a API não trouxer as datas de envio de uma devolução já postada, `amostra_envio_devolucao`
mostra o formato da resposta (só chaves de status e datas, nunca dados pessoais).
