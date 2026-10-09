# Entrega da Fase 2 — autenticação

## Escopo

Supabase Auth real, cadastro, login, logout, recuperação, redefinição de senha, persistência de sessão e guardas de rotas. Layout da Fase 1 mantido.

O planejamento agora prevê somente links externos para página oficial, inscrição e PDF. Supabase Storage, uploads, PDFs e anexos armazenados foram retirados. Nenhuma tabela de negócio, migration, CRUD, indicador de banco ou integração Google foi criada nesta fase.

## Arquivos criados

- `.env.local` — valores públicos fornecidos pelo usuário, ignorado pelo Git.
- `src/lib/supabase.ts` — cliente único, com configuração por ambiente.
- `src/services/auth.service.ts` — operações Supabase Auth.
- `src/features/auth/AuthProvider.tsx` — sessão centralizada e assinatura de eventos.
- `src/features/auth/auth-context.ts` — contexto e hook `useAuth`.
- `src/features/auth/AuthGuards.tsx` — `ProtectedRoute` e `GuestRoute`.
- `src/features/auth/AuthLoading.tsx` — loading de sessão.
- `src/features/auth/AuthField.tsx` — campos com labels e erros acessíveis.
- `src/features/auth/AuthFeedback.tsx` — feedback de sucesso/erro.
- `src/features/auth/LoginForm.tsx`.
- `src/features/auth/SignupForm.tsx`.
- `src/features/auth/ForgotPasswordForm.tsx`.
- `src/features/auth/ResetPasswordForm.tsx`.
- `src/features/auth/SignOutButton.tsx`.
- `src/features/auth/auth-schemas.ts` — validações Zod e tipos inferidos.
- `src/features/auth/auth-errors.ts` — mensagens amigáveis e logs resumidos de desenvolvimento.
- `playwright.config.ts`.
- `tests/auth.spec.ts`.
- `docs/supabase-auth-setup.md`.
- `docs/fase-2.md`.

## Arquivos alterados

- `.env.example` — somente as duas variáveis solicitadas, sem valores reais.
- `.gitignore` — saídas de testes ignoradas.
- `package.json` / `package-lock.json` — dependências e comando de testes.
- `tsconfig.node.json` — verificação TypeScript também dos testes.
- `vite.config.ts` — SDK Supabase em um chunk separado no build.
- `src/vite-env.d.ts` — tipagem das variáveis.
- `src/main.tsx` — instalação do provider.
- `src/routes/router.tsx` — dashboard, rotas públicas, protegidas e alias de recuperação.
- `src/lib/navigation.ts` — início aponta para `/dashboard`.
- `src/components/DesktopSidebar.tsx` — identificação da fase atual.
- `src/pages/AuthPage.tsx` — estrutura original integrada aos formulários reais.
- `src/pages/SettingsPage.tsx` — dados da conta e logout.
- `src/pages/AboutPage.tsx` — roteiro revisado, sem armazenamento de arquivos.
- `src/pages/EditalEditorPage.tsx` / `src/pages/EditalDetailsPage.tsx` — textos ajustados para links externos.
- `src/styles.css` — estilos de formulário, validação, loading e feedback.
- `README.md` — execução, autenticação, configuração, roteiro e testes atualizados.

## Dependências instaladas

Produção: `@supabase/supabase-js`, `react-hook-form`, `zod`, `@hookform/resolvers`.

Desenvolvimento: `@playwright/test`.

## Configuração externa

Variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Os dados públicos presentes no exemplo foram movidos para `.env.local`, e a URL foi normalizada para a raiz do projeto. Esse arquivo não é versionado. Não há service role ou segredo de servidor no frontend.

No painel Supabase: Email habilitado, novos cadastros permitidos, política de senha, confirmação de e-mail, Site URL, Redirect URLs e SMTP conforme o endereço usado nos testes.

O passo a passo completo com os menus e URLs está em [supabase-auth-setup.md](supabase-auth-setup.md).

## Validação

- `npm run typecheck` e `npm run lint`: passaram sem erros.
- `npm run build`: passou sem avisos de tamanho, com o SDK em chunk separado. O build de produção também foi aberto no navegador para verificar carregamento, guarda de rota e validação do cadastro, sem erros de execução.
- Consulta real, somente de leitura, a `/auth/v1/settings`: HTTP 200. Email habilitado, signup permitido, confirmação de e-mail ativada.
- 12 testes Playwright passaram com Microsoft Edge headless, incluindo cadastro com/sem confirmação, duplicidade, validações, login, persistência, logout entre abas, erros, recuperação, redefinição após recarga e sessão expirada.
- Formulários e telas privadas verificados em 320px e 1440px, sem rolagem horizontal.

Os testes de navegador interceptam as respostas de Auth em um servidor de desenvolvimento isolado. O aplicativo utiliza o cliente Supabase real; os dublês existem somente nos testes. Eles não comprovam entrega de e-mail nem a configuração dos redirects no projeto remoto.

**Pendente de validação manual com uma caixa de e-mail real:** cadastro/confirmação, recebimento da recuperação, troca efetiva da senha no serviço e login com a nova senha. Nenhuma conta remota foi criada automaticamente. Siga os [testes manuais](supabase-auth-setup.md#testar-os-fluxos-reais).
