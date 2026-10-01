# Entrega da Fase 1

## Local

Todos os arquivos do projeto estão em:

`C:\Users\Notebook Gamer\OneDrive\Documentos\Projeto X\Org. Editais`

A pasta estava vazia antes da implementação. O repositório Git identificado pertence à pasta superior do usuário; não foram feitas alterações em outros projetos.

## Implementado

- React + Vite + TypeScript em modo estrito.
- Tailwind CSS, tokens de tema escuro e Nunito servida localmente.
- React Router, nove telas principais e rotas auxiliares de recuperação, etapas e 404.
- Layout mobile-first: navegação inferior no celular e barra lateral a partir de 1024px.
- Componentes compartilhados para marca, cabeçalhos, estados iniciais e avisos de fase.
- Foco visível, link para pular ao conteúdo, ícones decorativos identificados e suporte à área segura inferior.
- Página amigável para falhas de renderização; logs técnicos somente em desenvolvimento.
- README com instalação, comandos, deploy e roteiro incremental.

As telas são estruturas visuais nesta fase. A interface informa quando uma função depende de uma etapa posterior. Nenhum edital fictício é apresentado como registro salvo.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm install` | Dependências instaladas; auditoria inicial sem vulnerabilidades reportadas |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou, sem avisos |
| `npm run build` | Passou; saída em `dist/` |
| 12 rotas em 320, 390, 768, 1024 e 1440px | Passaram; sem rolagem horizontal |
| Menu mobile: Início → Editais → Novo → Calendário → Configurações | Passou; item ativo e foco no conteúdo conferidos |
| Login → Cadastro → Recuperar senha → Início | Passou como navegação entre estruturas de telas |
| Menu desktop, Tab/Enter e link para pular ao conteúdo | Passaram |
| Recarga em `/editais`, histórico e rota inexistente | Passaram no servidor Vite |
| Console e exceções de execução durante os fluxos | Nenhum erro registrado |

As verificações de navegação usaram Playwright com Microsoft Edge headless local. As larguras de celular foram emuladas; não houve teste em aparelho físico. Ferramentas e capturas temporárias ficaram na pasta ignorada `node_modules/.tmp/browser-tools/`, sem adicionar Playwright às dependências do aplicativo.

## Arquivos criados

Não havia arquivos existentes para modificar.

### Raiz e configuração

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `eslint.config.js`
- `README.md`
- `docs/fase-1.md`
- `public/favicon.svg`

### Entrada, tema e navegação

- `src/main.tsx`
- `src/vite-env.d.ts`
- `src/styles.css`
- `src/lib/navigation.ts`
- `src/routes/router.tsx`

### Componentes

- `src/components/AppLayout.tsx`
- `src/components/Brand.tsx`
- `src/components/DesktopSidebar.tsx`
- `src/components/MobileNavigation.tsx`
- `src/components/PageHeader.tsx`
- `src/components/EmptyState.tsx`
- `src/components/PhaseNotice.tsx`

### Telas

- `src/pages/DashboardPage.tsx`
- `src/pages/EditaisPage.tsx`
- `src/pages/EditalEditorPage.tsx` (novo e edição)
- `src/pages/EditalDetailsPage.tsx`
- `src/pages/CalendarPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AuthPage.tsx` (login, cadastro e recuperação)
- `src/pages/AboutPage.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/pages/RouteErrorPage.tsx`

`node_modules/` e `dist/` são saídas geradas e estão ignoradas no Git.

## Configuração manual

**Nenhuma credencial ou serviço externo é necessário nesta fase.**

Para desenvolvimento: execute `npm run dev` e abra `http://localhost:5173`.

Para publicar a prévia: execute `npm run build`, publique `dist/` e configure o fallback de SPA para `/index.html` na hospedagem.

## Próxima etapa

**Fase 2:** Supabase Auth, login, cadastro, recuperação de senha, persistência da sessão e proteção de rotas. Será necessário configurar um projeto Supabase e disponibilizar sua URL e chave pública por variáveis de ambiente.
