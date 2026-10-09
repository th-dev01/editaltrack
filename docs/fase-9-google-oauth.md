# Fase 9 — OAuth seguro com Google

## Arquitetura e segurança

- O navegador chama `google-oauth-start` com a sessão Supabase. A função valida o JWT consultando `/auth/v1/user`, deriva o `user_id` da resposta e devolve apenas a URL de autorização Google.
- O state contém 256 bits aleatórios, é associado ao usuário por SHA-256 no banco, expira em 10 minutos e é consumido uma única vez por uma função SQL atômica. State bruto não é persistido.
- Google retorna somente para `google-oauth-callback`. O code é trocado por tokens no backend; o refresh token é obrigatório na primeira conexão. Em reconexão, a ausência de um novo refresh token preserva o token anterior somente se a conta Google for a mesma.
- Refresh e access tokens são criptografados com AES-256-GCM, IV aleatório por token e chave server-side `TOKEN_ENCRYPTION_KEY`. O texto persistido tem formato versionado `v1.<iv>.<ciphertext+tag>`.
- As tabelas de state e conexão têm RLS habilitado sem políticas de acesso para clientes. Somente as Edge Functions com service role operam nelas. O frontend chama `google-connection-status`, que seleciona campos explicitamente e retorna apenas conectado, e-mail, data, scopes e necessidade de reautorização; nunca lê tokens.
- O status valida a autorização no backend renovando o access token com o refresh token criptografado. Se o refresh foi revogado/falha, a resposta marca `reauthRequired`; desconectar tenta revogar no endpoint OAuth do Google e sempre remove a conexão local. Eventos internos EditalTrack não são alterados.
- Não há chamadas à Google Calendar API nem operações de eventos nesta fase.

## Scopes

Solicitamos `openid` e `email` para identificar a conta Google conectada e exibir seu e-mail; não pedimos `profile`. `https://www.googleapis.com/auth/calendar.events` é o scope específico necessário para a futura gestão de eventos (criar, atualizar e excluir), não é usado para acessar eventos nesta fase. Não solicitamos Drive, Gmail ou Contacts. Cada conexão iniciada explicitamente usa `access_type=offline`, `include_granted_scopes=true` e `prompt=consent` para garantir que o Google forneça um refresh token, inclusive após tentativas anteriores. O consentimento não é solicitado automaticamente em carregamentos da aplicação.

## Google Cloud Console

1. Crie/selecione um projeto Google Cloud.
2. Ative **Google Calendar API**.
3. Configure a tela de consentimento OAuth; durante testes externos, adicione as contas de teste permitidas.
4. Crie uma credencial **OAuth Client ID → Web application**.
5. Em **Authorized redirect URIs**, cadastre exatamente:

   `https://<PROJECT_REF>.supabase.co/functions/v1/google-oauth-callback`

   Substitua `<PROJECT_REF>` pelo ref do projeto Supabase vinculado. Não use a URL do frontend como redirect URI. Para Supabase local, use `http://localhost:54321/functions/v1/google-oauth-callback` como URI adicional e cadastre-a no cliente OAuth.

O escopo `calendar.events` pode exigir verificação OAuth/publicação de consentimento antes de uso público, conforme o modo de publicação e políticas do Google. Para desenvolvimento, mantenha o app em modo de teste e use test users.

## Secrets e deploy

Nunca inclua estes valores em `VITE_*`, no cliente ou no Git:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_URL`
- `TOKEN_ENCRYPTION_KEY`

Gere uma chave de 32 bytes (base64), por exemplo com Node: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Guarde-a em um gerenciador de segredos. Perder/trocar essa chave sem recriptografar invalida tokens armazenados.

Para configuração atual de produção, use o guia [`production-deploy.md`](production-deploy.md), que lista todas as migrations, secrets e sete funções. O exemplo histórico abaixo usa placeholders e cobre somente as funções disponíveis na Fase 9:

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase secrets set GOOGLE_CLIENT_ID="<GOOGLE_CLIENT_ID>" GOOGLE_CLIENT_SECRET="<GOOGLE_CLIENT_SECRET>" GOOGLE_REDIRECT_URI="https://<PROJECT_REF>.supabase.co/functions/v1/google-oauth-callback" APP_URL="https://<DOMINIO-DE-PRODUCAO>" TOKEN_ENCRYPTION_KEY="<BASE64_DE_32_BYTES>" --project-ref <PROJECT_REF>
npx supabase functions deploy google-oauth-start --project-ref <PROJECT_REF>
npx supabase functions deploy google-oauth-callback --no-verify-jwt --project-ref <PROJECT_REF>
npx supabase functions deploy google-connection-status --project-ref <PROJECT_REF>
npx supabase functions deploy google-disconnect --project-ref <PROJECT_REF>
```

`supabase/config.toml` mantém JWT obrigatório nas três funções chamadas pelo app e desabilita a validação JWT de gateway somente no callback público do Google; o state de uso único é a validação do callback.

## Desenvolvimento local

Instale/inicie o Supabase local com `supabase start` e obtenha URL/chaves locais com `supabase status -o env`. Use `VITE_SUPABASE_URL=http://127.0.0.1:54321` e a anon key local no `.env.local` do frontend. Copie `supabase/functions/.env.example` para `supabase/functions/.env.local` e preencha credenciais de teste, callback local e `APP_URL=http://localhost:5173`. O arquivo local é ignorado pelo Git.

```bash
supabase functions serve --env-file supabase/functions/.env.local
npm run dev
```

O Supabase CLI fornece `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ao runtime local; em qualquer ambiente, a service role permanece exclusivamente no backend. Em produção, configure secrets pelo CLI/Dashboard Supabase, nunca por variáveis `VITE_*`.

## Fluxo manual real

1. Configure Google Cloud, consent screen, Calendar API e redirect URI.
2. Aplique migration e configure secrets server-side.
3. Sirva/deploy as quatro Edge Functions.
4. Abra Configurações e clique **Conectar Google Calendar**.
5. Autorize no Google; o callback server-side deve redirecionar a `/configuracoes?google=connected`.
6. Confirme e-mail/status, recarregue e confira que permanece conectado.
7. Clique **Desconectar**, confirme e valide o status não conectado.

Os testes Playwright mockam as Edge Functions e o domínio de autorização. Não acessam Google real nem verificam as credenciais externas.
