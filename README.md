# EditalTrack

Sistema web mobile-first para organizar editais, processos seletivos e oportunidades. Desenvolvimento incremental em 13 fases.

## Estado atual: Fase 1

Implementado: projeto React, TypeScript, Tailwind, tema escuro, fonte Nunito local, navegação responsiva, rotas e estrutura visual das telas. As funcionalidades futuras são identificadas pela fase prevista. Não há dados fictícios, persistência, autenticação, conexão com Supabase ou Google Calendar nesta versão.

Veja [o relatório da Fase 1](docs/fase-1.md) para os resultados de validação e a lista completa de arquivos criados.

## Executar

Requer Node.js **22.13+** (recomendado: versão LTS atual) e npm.

```powershell
cd "C:\Users\Notebook Gamer\OneDrive\Documentos\Projeto X\Org. Editais"
npm install
npm run dev
```

Abra **http://localhost:5173**. A porta é fixa; se estiver ocupada, encerre o processo correspondente antes de executar novamente.

Para testar no celular, conecte-o à mesma rede do computador e abra `http://<IP-LOCAL-DO-COMPUTADOR>:5173`. Use o endereço Network exibido pelo Vite e libere o acesso na rede privada no firewall se necessário. `localhost` no celular aponta para o próprio celular.

## Comandos de verificação

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

O build gera `dist/`. O preview fica em **http://localhost:4173**.

## Stack

- React 19 + React DOM
- Vite 8 + TypeScript 5.9
- React Router 7
- Tailwind CSS 4 via plugin oficial do Vite
- Lucide React
- Nunito via `@fontsource/nunito` (sem requisições ao Google Fonts)
- ESLint 10, TypeScript ESLint e regras de React Hooks

TypeScript 5.9 foi escolhido por compatibilidade com a faixa suportada pelo TypeScript ESLint usado no projeto. O `package-lock.json` fixa as versões instaladas; use `npm ci` em CI/deploy.

## Estrutura

```text
public/
  favicon.svg
src/
  components/     # Layout, navegação e elementos compartilhados
  lib/            # Configuração da navegação
  pages/          # Telas e estados iniciais
  routes/         # Árvore de rotas
  main.tsx
  styles.css      # Tokens, Tailwind e estilos responsivos
```

As pastas `features`, `services`, `hooks` e `types` serão adicionadas quando houver funcionalidades que precisem delas. Acesso ao Supabase será centralizado em serviços nas próximas fases.

## Rotas

| Rota | Tela |
| --- | --- |
| `/` | Início / estrutura da dashboard |
| `/editais` | Meus editais |
| `/editais/novo` | Estrutura de novo edital |
| `/editais/:id` | Estrutura de detalhes |
| `/editais/:id/editar` | Estrutura de edição |
| `/calendario` | Estrutura do calendário |
| `/configuracoes` | Estrutura das configurações |
| `/login` | Estrutura de login |
| `/cadastro` | Estrutura de cadastro |
| `/recuperar-senha` | Estrutura de recuperação |
| `/sobre` | Etapas de desenvolvimento |
| Outros endereços | Página não encontrada |

As rotas são públicas nesta prévia. A proteção de rotas será adicionada junto do Supabase Auth na Fase 2, antes do CRUD de dados pessoais.

## Interface e acessibilidade

- Tema escuro centralizado em tokens no `src/styles.css`.
- Layout mobile-first, menu inferior abaixo de 1024px e menu lateral no desktop.
- Respeito à área segura inferior do celular e preferência por movimento reduzido.
- Links e ações principais com área de toque de ao menos 44px.
- Link para pular ao conteúdo, foco visível, marcos semânticos e foco no conteúdo após navegação.
- Estados iniciais identificados como prévia, sem indicadores numéricos simulados.

## Variáveis de ambiente e configurações externas

**Nenhuma configuração externa é necessária para a Fase 1.** Não é necessário criar `.env` para executar esta versão. `.env.example` reserva somente as variáveis públicas futuras do Supabase.

Variáveis `VITE_*` são públicas e entram no bundle do navegador. Nunca usá-las para senha, client secret, service role, refresh token ou outros segredos. Arquivos `.env` e `.env.*` estão ignorados, exceto `.env.example`.

- **Fase 2:** criar projeto Supabase, configurar Auth e fornecer URL e chave pública. Instruções específicas serão adicionadas com a implementação.
- **Fase 3 em diante:** migrations versionadas, RLS por usuário e, na Fase 6, buckets privados.
- **Fases 10–11:** projeto Google Cloud, Calendar API e OAuth separado do login. Segredos e tokens serão exclusivamente server-side. A documentação com redirects exatos será escrita após a definição dos endpoints; o domínio de produção deverá ser informado pelo responsável pelo deploy.
- **Fase 12:** manifest, service worker e instalação PWA. Esta fase inicial é uma aplicação web responsiva, ainda sem funcionamento offline ou instalação PWA.

## Deploy desta fase

1. Execute `npm ci` e `npm run build`.
2. Publique o conteúdo de `dist/` em uma hospedagem estática, com HTTPS.
3. Configure fallback de rotas da SPA para `/index.html`, preservando arquivos estáticos existentes. Isso é necessário para abrir diretamente `/editais` ou atualizar uma rota interna.
4. O aplicativo está configurado para a raiz do domínio (`/`).

Exemplo de regra Nginx para fallback: `try_files $uri $uri/ /index.html;`. Em outros provedores, utilize a configuração equivalente de rewrites da plataforma.

Não há service worker nesta etapa: nenhum cache de dados, tokens ou APIs é implementado.

## Roteiro

1. **Base, layout, rotas, tema e responsividade — implementado.**
2. Supabase, login, cadastro, recuperação, sessão e proteção de rotas.
3. Banco, migrations, RLS e CRUD de editais.
4. Eventos, cronograma, próximos prazos e urgência.
5. Checklist e progresso de documentos.
6. Storage privado, PDF e anexos.
7. Dashboard com indicadores, busca e filtros.
8. Calendário interno.
9. Preferências de fuso horário e lembretes.
10. OAuth Google, conexão e desconexão seguras.
11. Google Calendar: sincronização, atualização e exclusão.
12. PWA: manifest, service worker e instalação.
13. Testes finais, revisão e documentação completa.

## Fluxo de verificação visual

1. Abra `/` no desktop: confira menu lateral, links e estado inicial.
2. Reduza a largura para 390px e 320px: confira o menu inferior e ausência de rolagem horizontal.
3. Navegue por Início → Editais → Novo → Calendário → Configurações.
4. Abra `/login` → `/cadastro` → `/recuperar-senha` → início.
5. Abra diretamente `/editais/exemplo` e `/editais/exemplo/editar`: devem exibir a estrutura, sem apresentar um edital fictício.
6. Atualize uma rota interna e abra um endereço inexistente para verificar o fallback e a página 404.
7. Navegue usando Tab/Enter e confira o link “Pular para o conteúdo”.

## Problemas comuns

- **Node incompatível:** atualize para Node 22.13+ ou uma LTS mais recente.
- **Porta ocupada:** libere 5173 para desenvolvimento ou 4173 para preview.
- **404 ao atualizar uma rota em produção:** configure o fallback da SPA na hospedagem.
- **Cadastro não salva / login não disponível:** esta entrega é somente a Fase 1. Os formulários funcionais começam nas Fases 2 e 3.
- **Celular não acessa:** verifique rede, IP local e firewall. Use o IP do computador, não `localhost`.
# editaltrack
