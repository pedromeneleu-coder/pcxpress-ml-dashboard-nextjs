# Ingestão de devoluções (n8n)

`MVP7_Devolucoes.json` é o workflow do n8n que alimenta a seção **Devoluções** do painel.
Ele grava em `ml_dashboards.devolucoes`, `devolucoes_status` e `devolucoes_motivos`
(criadas por `supabase/migrations/2026-10-05_devolucoes.sql`), preenche as colunas da fila do
Acompanhamento (`supabase/migrations/2026-10-08_devolucoes_fila.sql`) e anota as reclamações já
conferidas sem devolução em `devolucoes_claims_sem_devolucao`
(`supabase/migrations/2026-10-08_devolucoes_claims_sem_devolucao.sql`).

Sem a migração da fila, o workflow continua funcionando e grava só as colunas do primeiro SQL
(`colunas_fila_disponiveis: false` na saída).

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

## Atualizar da v1 para a v2 (colunas da fila)

1. Rode no Supabase `supabase/migrations/2026-10-08_devolucoes_fila.sql` (só acrescenta colunas).
2. No n8n, desative o workflow anterior e importe este arquivo. Copie as 4 chaves do anterior.
3. Troque `claims_days_back` para `180` e execute manualmente enquanto `claims_deferred` for maior
   que 0: as devoluções gravadas antes da migração são processadas de novo uma vez, para
   preencher as colunas da fila.
4. Volte `claims_days_back` para `30`, ative o workflow e apague o anterior.

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
   - `GET /shipments/{id}/history` do envio de volta: datas de postagem e recebimento (campo
     `date_history`, até obter). `GET /shipments/{id}` só é chamado se o histórico falhar ou vier
     num formato desconhecido;
   - com a reclamação aberta, o histórico do trecho atual do envio (por exemplo, do CD do ML para a
     loja depois da revisão): rastreio, previsão de chegada e status;
   - `GET /orders/{id}`: data da venda, anúncio, preço, SKU, quantidade, valor da venda, valor
     reembolsado e apelido do comprador. Busca enquanto faltar algum dado e, com a reclamação
     aberta, a cada execução (o valor reembolsado muda até o caso encerrar);
   - `GET /shipments/{id}` do envio original: tipo de logística (uma vez por devolução);
   - `GET /post-purchase/v1/claims/{id}` só se a busca não trouxer o necessário (por exemplo, os
     participantes de uma reclamação aberta, de onde vêm a ação pendente e o prazo).
4. Busca o nome dos motivos novos (`GET /post-purchase/v1/claims/reasons/{id}`). Nunca altera
   `erro_operacional`, que é preenchido pelo cliente.
5. Registra a execução em `sync_runs` (se a tabela não existir, segue sem registro).

## `status_atual`

É o `status` da devolução na API, com duas exceções:

- `status_money = refunded` → `refunded` (dinheiro devolvido ao comprador);
- `delivered` com revisão → `reviewed`.

O painel traduz o status em etapa por `app/returns/returns-config.ts`. A ingestão também grava
`etapa_atual`, usada só para status que não estejam nesse arquivo (por exemplo, `closed`).

## Colunas da fila (planilha `pcxpress-fila-devolucoes`, aba Devoluções)

| Coluna | Campo | De onde vem |
|---|---|---|
| G SKU | `sku` | `order.order_items[].item.seller_sku` |
| H Qtd | `quantidade` | `order.order_items[].quantity` |
| I Valor da venda | `valor_venda` | `order.total_amount` |
| J Valor reembolsado | `valor_reembolsado` | soma de `order.payments[].transaction_amount_refunded` |
| K Comprador | `comprador_apelido` | `order.buyer.nickname` (só o apelido; nunca nome, CPF, endereço ou telefone) |
| M Etapa | `etapa_ml` | `claim.stage = dispute` → Mediação; devolução de reclamação PNR → Retorno (não entregue); demais → Devolução |
| N Status ML | `status_reclamacao` | `claim.status` (`opened` / `closed`) |
| O Status do retorno | `status_retorno` | status da devolução + destino + revisão, no vocabulário da planilha |
| P Descrição do status | `descricao_status` | leitura dos códigos (reclamação, devolução, dinheiro, envio, revisão). A API não traz o texto do painel do ML |
| Q Data prevista | `data_prevista` | `date_history.date_delivered_estimated` do trecho atual, enquanto a devolução não chegou |
| R Destino | `destino_retorno` | `shipments[].destination.name`: `warehouse` → CD Mercado Livre (Full); `seller_address` → Vendedor; sem envio → A definir |
| S Rastreio | `rastreio` | `tracking_number` do trecho atual |
| T Prazo do vendedor | `prazo_acao_vendedor` | o `due_date` mais próximo das ações obrigatórias do vendedor |
| U Ação pendente | `acao_pendente` | ações obrigatórias de `players[respondent].available_actions`, em português; sem nenhuma, um texto começando com "Nenhuma —" |
| W Resultado | `resultado` | condição do produto na revisão (Apto / Não apto para venda) e, com o caso fechado, a favor de quem |

L (Motivo) fica vazia: o painel mostra o nome do motivo de `devolucoes_motivos`.
As traduções estão no começo do código (`SELLER_ACTION_LABELS`, `REVIEW_CONDITION_LABELS`).

## Histórico (`devolucoes_status`)

- Na primeira gravação, reconstrói os marcos conhecidos (abertura, postagem, entrega, revisão,
  reembolso) com as datas da API, para que "dias parada na etapa" já saia certo.
- Depois, grava uma linha a cada mudança de status.

## Saída de cada execução

O resumo mostra quantas devoluções foram gravadas, os status encontrados
(`status_atual_desta_execucao`, `status_bruto_da_api`, `status_sem_etapa`) e quantas linhas
ainda estão sem data da venda, logística, valor, frete ou datas de envio (`faltando_no_banco`).
Se a API não trouxer as datas de envio de uma devolução já postada, `amostra_envio_devolucao`
mostra o formato da resposta (só chaves de status e datas, nunca dados pessoais). Pacote ainda no
ponto de coleta não tem data de postagem e não gera amostra.

Com a migração da fila, a saída também mostra:

- `fila_preenchida_nesta_execucao`: quantas devoluções desta execução tiveram cada coluna preenchida;
- `fila_status_retorno_abertas`: contagem por status do retorno, só dos casos abertos;
- `acoes_vendedor_vistas`: códigos de ação do vendedor recebidos da API (obrigatórias marcadas).
  Um código sem tradução aparece no painel como "Ação do ML: <código>";
- `condicoes_revisao_vistas` e `amostra_revisao`: condições de revisão recebidas e, se a revisão vier
  sem condição reconhecida, só as chaves da resposta;
- `abertas_sem_participantes`: reclamações abertas para as quais a API não informou as ações.
