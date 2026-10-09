# EditalTrack

Aplicação web responsiva para organizar editais e processos seletivos: editais, cronograma, documentos, dashboard, calendário interno, preferências e sincronização unidirecional de eventos com Google Calendar.

## Funcionalidades

- Cadastro, confirmação de e-mail, login, recuperação de senha e logout via Supabase Auth.
- CRUD de editais, eventos e documentos, protegidos por RLS por usuário.
- Dashboard, calendário interno e preferências de timezone e reminders.
- OAuth Google server-side e sincronização de eventos para Google Calendar.

O EditalTrack é a fonte de verdade. Mudanças feitas diretamente no Google Calendar não são importadas. Não há sincronização bidirecional, scraping, leitura automática de editais, push próprio ou PWA.

## Stack e arquitetura

React 19, Vite 8, TypeScript, React Router, Tailwind CSS, Supabase JS, PostgreSQL/RLS e Supabase Edge Functions. Os testes E2E usam Playwright.

```text
React/Vite → Supabase Auth → PostgreSQL + RLS → Edge Functions → Google OAuth / Calendar
```

O frontend usa apenas a URL Supabase e uma chave pública. Client secret, service role e tokens Google permanecem no backend. Veja [Fase 11: revisão de qualidade](docs/fase-11-quality.md).

## Requisitos e execução local

Requer Node.js 22.13+ e npm.

1. Crie `.env.local` na raiz com os valores públicos do projeto Supabase:

   ```dotenv
   VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   VITE_SUPABASE_ANON_KEY=<CHAVE_PUBLICA_ANON_OU_PUBLISHABLE>
   ```

2. Instale dependências e inicie Vite:

   ```sh
   npm ci
   npm run dev
   ```

3. Acesse http://localhost:5173. Reinicie o Vite após mudar variáveis.

Para testar OAuth Google com Supabase local, veja [OAuth da Fase 9](docs/fase-9-google-oauth.md). Não use service role no frontend nem em `VITE_*`.

## Supabase e Google

- Para Auth, configure Email, confirmação de e-mail, SMTP e URLs em Authentication → URL Configuration. Consulte o [guia de Supabase Auth](docs/supabase-auth-setup.md).
- Para schema, aplique as migrations listadas em [deploy de produção](docs/production-deploy.md). Não crie policies permissivas para facilitar testes.
- Para Google OAuth e Calendar API, configure credencial Web, origens, callback, secrets e Edge Functions conforme o [guia de produção](docs/production-deploy.md) e os detalhes das [Fases 9–10](docs/fase-9-google-oauth.md) / [Fase 10](docs/fase-10-google-calendar.md).

### Variáveis

Frontend/build (públicas):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Edge Functions (somente backend):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_URL`
- `TOKEN_ENCRYPTION_KEY`

Nunca coloque no frontend `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, service role, refresh tokens ou access tokens. Não compartilhe nem versione arquivos `.env`.

## Banco de dados e funções

Ordem de migrations, comandos de conferência e deploy das sete funções estão em [`docs/production-deploy.md`](docs/production-deploy.md). O callback Google é a única Edge Function que não exige JWT no gateway; ele valida state de uso único no backend.

## Comandos

```sh
npm run typecheck
npm run lint
npm run build
npm run test:auth
npm run preview
```

O build de produção é gerado em `dist/`; o preview local usa http://localhost:4173. Os testes Playwright interceptam Supabase/Google e não usam credenciais reais. Para testes de integração real, use o [checklist final](docs/final-checklist.md).

## Deploy

Compatível com hospedagem estática, incluindo Vercel: configurar as duas variáveis `VITE_*` no ambiente de build, executar `npm ci` e `npm run build`, publicar `dist/` com HTTPS e habilitar fallback SPA para `/index.html`. Configurar domínio, Supabase, Google e OAuth está descrito em [`docs/production-deploy.md`](docs/production-deploy.md).

## Limitações e riscos conhecidos

- Sincronização Google é EditalTrack → Google; edição remota não retorna ao sistema.
- Dashboard agrega até 1.000 eventos/documentos no cliente, e pode buscar até 3.000 eventos antes do filtro.
- Google OAuth em produção pode exigir publicação/verificação do consentimento conforme os scopes e as regras do Google. Isso não é automatizado.
- O envio de e-mail precisa de SMTP de produção configurado no Supabase para entrega apropriada a usuários gerais.
- Sem PWA, modo offline, scraping, leitura automática de edital, Gmail, Drive ou notificações próprias.

Consulte [`docs/final-checklist.md`](docs/final-checklist.md) antes de liberar a produção. Uma tag `v1.0.0` pode ser criada pelo responsável após a aprovação do checklist; nenhuma tag/release é criada automaticamente.
