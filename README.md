[README.md](https://github.com/user-attachments/files/30767329/README.md)
# PCXpress Mercado Livre Analytics

Dashboard Next.js com API server-side para consultar o Supabase sem expor a `service_role` no navegador.

## Estrutura que deve ir ao GitHub

```text
app/
  api/dashboard/route.ts
  dashboard-types.ts
  error.tsx
  globals.css
  layout.tsx
  not-found.tsx
  page.tsx
lib/
  supabase-dashboard.ts
public/
  og.png
  pcxpress-logo.webp
tests/
  project.test.mjs
.env.example
.gitignore
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
pnpm-lock.yaml
tsconfig.json
README.md
```

Não envie `node_modules`, `.next`, `.vercel`, `.env` ou `.env.local`.

## Variáveis de ambiente

Use estes nomes localmente em `.env.local` e na Vercel:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE
SUPABASE_SCHEMA=ml_dashboards
SUPABASE_ACCOUNT_NAME=PC Express
```

`SUPABASE_SERVICE_ROLE_KEY` é secreta e server-only. Nunca use o prefixo `NEXT_PUBLIC_` nessa variável e nunca envie o valor ao GitHub.

## Desenvolvimento local

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

Abra `http://localhost:3000`. O endpoint de dados é `http://localhost:3000/api/dashboard?periodDays=30`.

## Configuração da Vercel

1. Importe o repositório pessoal correto do GitHub.
2. Em `Root Directory`, deixe vazio quando `package.json` estiver na raiz do repositório.
3. Em `Framework Preset`, selecione `Next.js`.
4. Nao sobrescreva `Build Command`, `Output Directory` nem `Install Command`.
5. Em `Node.js Version`, selecione `22.x`.
6. Cadastre as quatro variáveis em `Settings > Environment Variables` para `Production`, `Preview` e `Development`.
7. Salve e execute `Redeploy` sem reutilizar o cache da tentativa antiga.

Não existe `vercel.json` neste projeto de propósito. A detecção nativa do Next.js cria automaticamente a função de `/api/dashboard`.

## Verificação depois do deploy

1. Abra `https://SEU-DOMINIO.vercel.app/api/dashboard?periodDays=30`.
2. Confirme que o navegador mostra JSON e que `"connected"` e `true`.
3. Abra a pagina inicial e confirme o selo `Supabase ativo`.
4. Teste os períodos `7d`, `30d` e `90d` e o botão de atualizar.

Se a API retornar `"connected": false`, confira os nomes e os ambientes das variáveis. Se retornar 404, o `Root Directory` da Vercel não aponta para a pasta que contém `package.json` e `app`.

No Supabase, confirme também que `ml_dashboards` está na lista de schemas expostos pela Data API. Sem isso, o endpoint responderá com uma mensagem `PGRST` mesmo que a chave esteja correta.

## Definições das métricas

- **Conversão:** `pedidos / visitas * 100`. Mede a parcela de visitas que resultou em pedido.
- **Ticket médio:** `valor bruto / pedidos`. Mede o valor bruto médio de cada pedido.
- **Unidades por pedido:** `unidades vendidas / pedidos`. Mede a quantidade média de itens por pedido.
- **Valor bruto:** soma de `gross_amount` dentro do período selecionado.

O gráfico diário compara a janela selecionada com a janela imediatamente anterior de mesma duração. Dias sem registro permanecem como lacunas e não são preenchidos artificialmente.

Ao passar o mouse pelo gráfico, o tooltip mostra o valor do dia, o valor do dia equivalente no período anterior, a variação entre os períodos e a variação contra o dia anterior. A aba **Produtos e anúncios** também compara visitas, pedidos, unidades, valor bruto, conversão e posição no ranking por produto.

## Views consumidas

- `ml_dashboards.dashboard_item_catalog`
- `ml_dashboards.dashboard_daily_account_summary`
- `ml_dashboards.dashboard_daily_item_performance`

## Documentação do dashboard

- [Plano visual com os dados atuais](docs/PLANO-VISUAL-DADOS-ATUAIS.md)
- [Mapa de métricas e telas](docs/MAPA-METRICAS-E-TELAS.md)
- [Roadmap de evolução](docs/ROADMAP-EVOLUCAO-DASHBOARD.md)
- [Guia de atualização no GitHub](docs/GUIA-ATUALIZACAO-GITHUB.md)
