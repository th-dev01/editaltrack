# Deploy de produção — EditalTrack

Este guia prepara o deploy sem executar alterações no projeto Supabase. Use o projeto e o domínio de produção escolhidos pelo responsável; não substitua placeholders por valores reais em commits.

## 1. Frontend React/Vite

Ambientes:

- Desenvolvimento: `http://localhost:5173` (`npm run dev`).
- Produção: a origem HTTPS fornecida pela hospedagem/domínio. Não há domínio de produção fixo no código.

No provedor de frontend (por exemplo, Vercel), configure **somente** as variáveis públicas abaixo no ambiente Production e também em Preview se necessário:

```dotenv
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<CHAVE_PUBLICA_ANON_OU_PUBLISHABLE>
```

Elas são incorporadas ao bundle do navegador. Nunca definir `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, refresh/access tokens ou credenciais privadas como `VITE_*`.

Configuração de build: Node.js `>=22.13.0`, instalar com `npm ci`, comando `npm run build`, diretório de saída `dist/`. Habilite fallback de SPA para servir `/index.html` em rotas como `/editais` e `/configuracoes`, sem substituir arquivos estáticos existentes. Use HTTPS. Não é necessário adicionar dependência ou configuração específica de provedor.

Antes de publicar, execute localmente `npm run typecheck`, `npm run lint`, `npm run build` e `npm run test:auth`. Acesse `http://localhost:4173` para validar o build via `npm run preview`.

## 2. Projeto Supabase

1. Confirme organização, Project Ref, região, URL do projeto e backups disponíveis no plano.
2. Autentique a Supabase CLI e vincule explicitamente o projeto correto:

   ```sh
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase migration list
   npx supabase db push --dry-run
   ```

3. Confira cada migration pendente e o projeto selecionado. Faça backup/snapshot antes da mudança. Só depois da aprovação, aplique:

   ```sh
   npx supabase db push
   ```

   `db push` aplica todas as migrations pendentes. Não execute migrations manualmente em SQL Editor se a CLI as marcará como pendentes. Não usar `--include-all`/reset nem comandos destrutivos sem plano de recuperação.

### Migrations em ordem

1. `20261001120000_create_editais.sql` — editais e políticas RLS.
2. `20261001130000_create_eventos_edital.sql` — eventos e ownership do edital.
3. `20261001140000_create_documentos_edital.sql` — documentos e ownership do edital.
4. `20261003150000_create_user_preferences.sql` — preferências por usuário.
5. `20261004100000_create_google_oauth.sql` — estados OAuth e conexões Google server-side.
6. `20261004110000_add_google_sync_to_eventos.sql` — metadados de sync Google e permissões limitadas.
7. `20261007120000_add_enrollment_reminder_schedules.sql` — regras de lembrete para períodos de inscrição.

Após o push, confirme no painel a presença de `editais`, `eventos_edital`, `documentos_edital`, `user_preferences`, `google_oauth_states` e `google_calendar_connections`; RLS ativo e policies conforme migrations. As tabelas Google não devem receber policies/grants para acesso direto do cliente. Nunca enfraqueça RLS para resolver falha de deploy.

## 3. Supabase Auth

No painel do projeto de produção, Authentication → URL Configuration:

- **Site URL:** `https://<DOMINIO-DE-PRODUCAO>`.
- **Redirect URLs:** `https://<DOMINIO-DE-PRODUCAO>/dashboard` e `https://<DOMINIO-DE-PRODUCAO>/redefinir-senha`.
- Mantenha `http://localhost:5173/dashboard` e `http://localhost:5173/redefinir-senha` apenas se ainda precisar testar localmente. São origens separadas.
- Confirme o provedor Email, cadastro/confirm email, política de senha e template de confirmação/reset.
- Configure SMTP de produção e limites adequados antes de abrir cadastro para usuários gerais. O SMTP default de desenvolvimento não é um serviço de entrega de produção.

Mais detalhes e roteiro real de Auth: [`supabase-auth-setup.md`](supabase-auth-setup.md).

## 4. Google Cloud e OAuth

1. Ative Google Calendar API no projeto Google Cloud usado pela aplicação.
2. Configure a tela de consentimento. Em modo **Testing**, somente test users autorizados podem consentir; é adequado para desenvolvimento, e tokens/consentimentos podem ter limitações e expiração segundo as regras Google.
3. Para **Production**, usuários gerais podem autorizar; o Google pode exigir verificação, especialmente para scopes sensíveis/restritos. Planeje e envie essa verificação manualmente se aplicável. Este projeto não a submete automaticamente.
4. Na credencial **OAuth Client ID → Web application**, configure:

   **Authorized JavaScript origins**

   ```text
   https://<DOMINIO-DE-PRODUCAO>
   ```

   Adicione `http://localhost:5173` apenas se for manter o frontend local usando o mesmo OAuth Client.

   **Authorized redirect URIs**

   ```text
   https://<PROJECT_REF>.supabase.co/functions/v1/google-oauth-callback
   ```

   `GOOGLE_REDIRECT_URI` deve ser exatamente igual a essa URI e à configuração do OAuth Client. O redirect URI é a Edge Function Supabase — **não** o `APP_URL` nem o domínio frontend. Para Supabase local, a URI adicional é `http://localhost:54321/functions/v1/google-oauth-callback`.

## 5. Edge Function secrets

Configure secrets somente no projeto Supabase de produção usando Supabase Secrets (Dashboard ou CLI autenticada). Não imprimir valores em logs nem colocá-los no Git:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — callback Supabase exato acima.
- `APP_URL` — origem pública do frontend, por exemplo `https://<DOMINIO-DE-PRODUCAO>`.
- `TOKEN_ENCRYPTION_KEY` — chave aleatória de 32 bytes, representada em Base64.

Exemplo de comando com placeholders (preencha diretamente em um terminal seguro; não commite o comando com valores reais):

```sh
npx supabase secrets set \
  GOOGLE_CLIENT_ID="<GOOGLE_CLIENT_ID>" \
  GOOGLE_CLIENT_SECRET="<GOOGLE_CLIENT_SECRET>" \
  GOOGLE_REDIRECT_URI="https://<PROJECT_REF>.supabase.co/functions/v1/google-oauth-callback" \
  APP_URL="https://<DOMINIO-DE-PRODUCAO>" \
  TOKEN_ENCRYPTION_KEY="<BASE64_DE_32_BYTES>" \
  --project-ref <PROJECT_REF>
```

**Não troque `TOKEN_ENCRYPTION_KEY` depois que tokens Google estiverem armazenados.** A chave é necessária para descriptografá-los; sua troca sem migração segura torna conexões existentes inutilizáveis e exige reconexão. Mantenha cópia protegida no gerenciador de segredos da organização. `SUPABASE_SERVICE_ROLE_KEY` é fornecida pelo runtime Supabase às funções e nunca deve ser configurada como variável pública do frontend.

## 6. Edge Functions necessárias

Com CLI autenticada e `PROJECT_REF` correto, publique as sete funções:

```sh
npx supabase functions deploy google-oauth-start --project-ref <PROJECT_REF>
npx supabase functions deploy google-oauth-callback --no-verify-jwt --project-ref <PROJECT_REF>
npx supabase functions deploy google-connection-status --project-ref <PROJECT_REF>
npx supabase functions deploy google-disconnect --project-ref <PROJECT_REF>
npx supabase functions deploy google-calendar-sync-events --project-ref <PROJECT_REF>
npx supabase functions deploy google-calendar-delete-event --project-ref <PROJECT_REF>
npx supabase functions deploy google-calendar-mark-pending --project-ref <PROJECT_REF>
```

O callback é público no gateway por exigência do redirect Google; o state aleatório, de uso único e prazo limitado valida o callback. As demais funções exigem JWT. Verifique `supabase/config.toml`, deploy status e logs seguros; não registrar authorization code nem tokens.

## 7. Domínio, HTTPS e backup

- Aponte o domínio próprio para o frontend conforme instruções da hospedagem/DNS escolhida. Não é necessário comprar domínio nem há valores de DNS universais; siga os registros exibidos pelo provedor.
- Aguarde certificado TLS/HTTPS ativo antes de cadastrar origens OAuth ou abrir o site. OAuth em produção deve usar HTTPS. `localhost` é exceção válida para desenvolvimento.
- Use backups automáticos/snapshots e retenção disponibilizados no plano Supabase. Confira periodicidade, retenção e procedimento de restauração no painel; antes de alterações, exporte/backup conforme as ferramentas suportadas pelo plano. Restaure em ambiente controlado e valide antes de substituir produção. Não há sistema de backup próprio no EditalTrack.

## 8. Limitações e contexto

O EditalTrack é fonte de verdade; sincronização é unidirecional. Alterações no Google não retornam ao app. Não há PWA/offline, scraping, leitura automática de edital, Gmail, Drive, push próprio ou notificações próprias. Dívida do Dashboard: agrega até 1.000 eventos/documentos no cliente e pode buscar até 3.000 eventos antes do filtro, conforme [`fase-11-quality.md`](fase-11-quality.md).
