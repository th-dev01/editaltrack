# Checklist final de release — EditalTrack

Preencha durante o deploy. Não cole senhas, tokens, códigos OAuth ou conteúdo de secrets neste arquivo, issues ou prints.

## Antes de publicar

- [ ] `npm ci` conclui no Node.js 22.13+.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` e `npm run test:auth` passam.
- [ ] Nenhum `.env`, `.env.local`, `.env.recovery.local`, `credentials.json`, chave privada ou token está staged/versionado.
- [ ] Variáveis do build contêm somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` públicas.
- [ ] Projeto Supabase/Project Ref foram confirmados por duas pessoas ou conferência independente.
- [ ] Backup/snapshot pré-deploy foi confirmado conforme recursos do plano Supabase.
- [ ] `npx supabase migration list` revisado; `npx supabase db push --dry-run` confere migrations pendentes. `db push` só após aprovação/backup.
- [ ] Tabelas necessárias existem e RLS/policies correspondem às migrations; tabelas Google não permitem acesso direto do cliente.
- [ ] Sete Edge Functions publicadas; `verify_jwt=false` apenas para `google-oauth-callback` e `true` para as seis funções autenticadas.
- [ ] Secrets Google configurados apenas no backend. `TOKEN_ENCRYPTION_KEY` foi salva em gerenciador seguro e não será trocada após persistência de tokens.
- [ ] Auth Email, confirmação, SMTP, Site URL e Redirect URLs configurados para o domínio HTTPS final.
- [ ] Google Calendar API, tela de consentimento, test users/estado de verificação, origem JS e callback exato configurados.
- [ ] Frontend publicado por HTTPS, com `dist/` e fallback de SPA para `/index.html`.

## Teste pós-deploy — conta de teste

- [ ] Abrir o site de produção via HTTPS e atualizar uma rota interna sem receber 404.
- [ ] Cadastrar conta de teste e receber/confirmar o e-mail.
- [ ] Fazer login, logout e login novamente; recarregar mantendo a sessão.
- [ ] Criar um edital e confirmar que aparece na listagem e Dashboard.
- [ ] Editar o edital e confirmar persistência.
- [ ] Criar evento all-day e evento com horário; verificar Dashboard e calendário interno, incluindo timezone e limites de data.
- [ ] Criar documentos; confirmar que Dashboard e detalhes refletem a alteração.
- [ ] Salvar preferências de timezone/reminders e confirmar após recarregar.
- [ ] Conectar Google; completar consentimento e verificar status/e-mail em Configurações.
- [ ] Sincronizar um evento e confirmar no Google Calendar título, data/fuso, fim all-day e reminders.
- [ ] Editar a data/título do mesmo evento; confirmar atualização **sem duplicata** no Google.
- [ ] Remover somente do Google; confirmar que o evento interno permanece. Sincronizar novamente e confirmar novo vínculo.
- [ ] Testar exclusão local/remota usando a confirmação apropriada.
- [ ] Desconectar e reconectar Google. Confirmar que uma sessão interna logout/login não perde o evento ou a preferência.
- [ ] Conferir mensagens de erro amigáveis e ausência de tokens/códigos em URL, console ou logs.

Não testar produção com contas/dados pessoais sem autorização. Testes automatizados interceptam as integrações e não substituem este checklist real.

## Teste de isolamento RLS com duas contas

Use dois usuários de teste reais, A e B, sem usar service role nem editar diretamente políticas:

1. Entrar como A; criar edital A, evento ligado ao edital, documento, preferência e (se autorizado) conexão Google.
2. Sair e entrar como B em sessão/navegador separado.
3. Confirmar que B não lista, pesquisa, abre por URL direta, edita ou exclui edital A, eventos A ou documentos A. Tentativas por IDs devem retornar não encontrado/sem linhas, sem expor conteúdo.
4. Confirmar que as preferências de B são próprias e não refletem as de A; salvá-las não altera A.
5. Em Configurações como B, confirmar que a conexão Google de A não aparece e que B só pode iniciar/consultar/desconectar a própria conexão.
6. Reentrar como A e confirmar que seus registros permanecem intactos.

Não use console/service role para validar acesso do cliente: ela ignora RLS. Para auditoria adicional, usar sessões/JWTs separados e a API autenticada, sem incluir tokens nos relatórios.

## Fechamento

- [ ] Migrações/backup/versão implantada anotados no registro operacional privado da equipe (sem secrets).
- [ ] Confirmar que o domínio HTTPS/redirect Google é o esperado e que deep links da SPA funcionam.
- [ ] Abrir issue interna para riscos remanescentes se necessário; não aplicar migração corretiva diretamente sem revisão e backup.
- [ ] Tag opcional `v1.0.0` somente após aprovação humana; não criar tag ou release como parte automática deste checklist.
