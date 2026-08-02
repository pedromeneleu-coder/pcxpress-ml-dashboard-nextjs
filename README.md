# PC Xpress Mercado Livre Analytics

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

Nao envie `node_modules`, `.next`, `.vercel`, `.env` ou `.env.local`.

## Variaveis de ambiente

Use estes nomes localmente em `.env.local` e na Vercel:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE
SUPABASE_SCHEMA=ml_dashboards
SUPABASE_ACCOUNT_NAME=PC Express
```

`SUPABASE_SERVICE_ROLE_KEY` e secreta e server-only. Nunca use o prefixo `NEXT_PUBLIC_` nessa variavel e nunca envie o valor ao GitHub.

## Desenvolvimento local

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

Abra `http://localhost:3000`. O endpoint de dados e `http://localhost:3000/api/dashboard?periodDays=30`.

## Configuracao da Vercel

1. Importe o repositorio pessoal correto do GitHub.
2. Em `Root Directory`, deixe vazio quando `package.json` estiver na raiz do repositorio.
3. Em `Framework Preset`, selecione `Next.js`.
4. Nao sobrescreva `Build Command`, `Output Directory` nem `Install Command`.
5. Em `Node.js Version`, selecione `22.x`.
6. Cadastre as quatro variaveis em `Settings > Environment Variables` para `Production`, `Preview` e `Development`.
7. Salve e execute `Redeploy` sem reutilizar o cache da tentativa antiga.

Nao existe `vercel.json` neste projeto de proposito. A deteccao nativa do Next.js cria automaticamente a funcao de `/api/dashboard`.

## Verificacao depois do deploy

1. Abra `https://SEU-DOMINIO.vercel.app/api/dashboard?periodDays=30`.
2. Confirme que o navegador mostra JSON e que `"connected"` e `true`.
3. Abra a pagina inicial e confirme o selo `Supabase ativo`.
4. Teste os periodos `7d`, `30d` e `90d` e o botao de atualizar.

Se a API retornar `"connected": false`, confira os nomes e os ambientes das variaveis. Se retornar 404, o `Root Directory` da Vercel nao aponta para a pasta que contem `package.json` e `app`.

No Supabase, confirme tambem que `ml_dashboards` esta na lista de schemas expostos pela Data API. Sem isso, o endpoint respondera com uma mensagem `PGRST` mesmo que a chave esteja correta.

## Views consumidas

- `ml_dashboards.dashboard_item_catalog`
- `ml_dashboards.dashboard_daily_account_summary`
- `ml_dashboards.dashboard_daily_item_performance`
